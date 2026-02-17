import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import { Message } from 'node-osc';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

import type slidesStudioPlugin from '../main'; 
import { SaveFileBody, FileListQuery, GetFileQuery, OscSendBody, MidiSendBody, MidiPayload, CustomMessageBody, MouseEventData } from '../types';
import { ObsServer } from './obsEndpoints';

/**
 * Manages the local Fastify server.
 * Handles file operations, API endpoints, and SSE broadcasting for MIDI/OSC events.
 */
export class ServerManager {
    private app: App;
    private plugin: slidesStudioPlugin;
    private server: FastifyInstance | null = null;
    private port: number;
    private isRunning = false;
    
    // Connections are now mapped by device name (Topic-based Pub/Sub pattern)
    private sseOscConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseMidiConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseMouseConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseKeyboardConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseCustomConnections: Set<FastifyReply> = new Set();
    private obsServer: ObsServer | null = null;

    private mouseMonitorProcess: ChildProcess | null = null;
    private keyboardMonitorProcess: ChildProcess | null = null;
    private uvcUtilBridgeProcess: ChildProcess | null = null;
    private monitorSocketServer: net.Server | null = null;

    constructor(app: App, plugin: slidesStudioPlugin, port: number) {
        this.app = app;
        this.plugin = plugin;
        this.port = port;
    }

    /**
     * Helper to initialize an SSE connection.
     */
    private setupSSE(reply: FastifyReply): void {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders();
    }

    /**
     * Helper to manage connection sets in a map.
     */
    private addConnection(map: Map<string, Set<FastifyReply>>, key: string, reply: FastifyReply): void {
        let connections = map.get(key);
        if (!connections) {
            connections = new Set();
            map.set(key, connections);
        }
        connections.add(reply);
    }

    private removeConnection(map: Map<string, Set<FastifyReply>>, key: string, reply: FastifyReply): void {
        const connections = map.get(key);
        if (connections) {
            connections.delete(reply);
            if (connections.size === 0) {
                map.delete(key);
            }
        }
    }

    /**
     * Starts the Fastify server.
     * Configures CORS, static file serving, API routes, and SSE endpoints.
     */
    public async start(): Promise<void> {
        if (this.isRunning) return;

        const adapter = this.app.vault.adapter;
        let basePath: string;
        if (adapter instanceof FileSystemAdapter) {
            basePath = adapter.getBasePath();
        } else {
            new Notice("Server cannot determine file system path.");
            return;
        }

        const pluginManifest = this.plugin.manifest;
        const slidesFolder = path.join(basePath, `${pluginManifest.dir}/slides_studio`);
        const libFolder = path.join(basePath, `${pluginManifest.dir}/lib`);

        this.server = fastify();

        await this.server.register(fastifyCors, { origin: true });

        void this.server.register(fastifyStatic, {
            root: [slidesFolder, libFolder, basePath],
            prefix: '/', 
        });

        this.obsServer = new ObsServer(this.plugin);
        this.obsServer.registerRoutes(this.server);

        // --- API: Get OBS Credentials ---
        this.server.get('/api/obswss', (_request, _reply) => {
            const settings = this.plugin.settings;
            return {
                IP: settings.websocketIP_Text || "localhost",
                PORT: parseInt(settings.websocketPort_Text) || 4455,
                PW: settings.websocketPW_Text || ""
            };
        });

        // --- API: Generic File Save ---
        this.server.post<{ Body: SaveFileBody }>('/api/file/save', async (request, reply) => {
            const { folder, filename, data } = request.body;
            
            if (!folder || !filename || !data) {
                return reply.code(400).send({ error: "Missing folder, filename, or data" });
            }

            const targetDir = path.join(basePath, folder);
            const fullPath = path.join(targetDir, filename.endsWith('.json') ? filename : `${filename}.json`);

            if (!targetDir.startsWith(basePath)) {
                return reply.code(403).send({ error: "Access denied: Path outside vault" });
            }

            if (!fs.existsSync(targetDir)) {
                try {
                    fs.mkdirSync(targetDir, { recursive: true });
                } catch(e) {
                    console.error(e)
                    return reply.code(500).send({ error: "Failed to create directory" });
                
                }
            }
            
            try {
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                return { success: true, path: fullPath };
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });


        // --- API: Generic File List ---
        this.server.get<{ Querystring: FileListQuery }>('/api/file/list', (request, reply) => {
            const { folder } = request.query;
            const targetDir = path.join(basePath, folder);

            if (!targetDir.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });
            if (!fs.existsSync(targetDir)) return reply.send([]);

            try {
                const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
                return reply.send(files);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        // --- API: Generic File Get ---
        this.server.get<{ Querystring: GetFileQuery }>('/api/file/get', (request, reply) => {
            const { folder, filename } = request.query;
            const targetDir = path.join(basePath, folder);
            const fullPath = path.join(targetDir, filename);

            if (!fullPath.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });
            if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: "File not found" });

            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                return reply.send(JSON.parse(content));
            } catch(err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        // --- SSE: OSC Device Events (Explicit Route per Device) ---
        this.plugin.settings.oscDevices.forEach(device => {
            if (!device.name) return;
            this.server.get(`/api/osc/events/${device.name}`, (request, reply) => {
                this.setupSSE(reply);
                this.addConnection(this.sseOscConnections, device.name, reply);

                request.raw.on('close', () => {
                    this.removeConnection(this.sseOscConnections, device.name, reply);
                });
            });
        });

        // --- SSE: MIDI Device Events (Explicit Route per Device) ---
        this.plugin.settings.midiDevices.forEach(device => {
            if (!device.name) return;
            this.server.get(`/api/midi/events/${device.name}`, (request, reply) => {
                this.setupSSE(reply);
                this.addConnection(this.sseMidiConnections, device.name, reply);

                request.raw.on('close', () => {
                    this.removeConnection(this.sseMidiConnections, device.name, reply);
                });
            });
        });

        // --- SSE: Mouse Events ---
        ['mousePosition', 'mouseClick', 'mouseScroll'].forEach(eventType => {
            this.server?.get(`/api/mouse/events/${eventType}`, (request, reply) => {
                this.setupSSE(reply);
                this.addConnection(this.sseMouseConnections, eventType, reply);

                request.raw.on('close', () => {
                    this.removeConnection(this.sseMouseConnections, eventType, reply);
                });
            });
        });

        // --- SSE: Keyboard Events ---
        ['keyboardPress', 'keyboardRelease'].forEach(eventType => {
            this.server?.get(`/api/keyboard/events/${eventType}`, (request, reply) => {
                this.setupSSE(reply);
                this.addConnection(this.sseKeyboardConnections, eventType, reply);

                request.raw.on('close', () => {
                    this.removeConnection(this.sseKeyboardConnections, eventType, reply);
                });
            });
        });

        // --- API: Keyboard Monitor Settings ---
        this.server.get('/api/keyboard/settings', (_request, _reply) => {
            return {
                showCombinations: this.plugin.settings.keyboardMonitorShowCombinations
            };
        });

        // --- API: UVC Util Settings ---
        this.server.get('/api/uvc/settings', (_request, _reply) => {
            return {
                enabled: this.plugin.settings.uvcUtilEnabled,
                wsPort: 8081 // Fixed port for UVC bridge WebSocket
            };
        });

        // --- SSE: Custom Events ---
        this.server.get('/api/custom/events', (request, reply) => {
            this.setupSSE(reply);
            this.sseCustomConnections.add(reply);

            request.raw.on('close', () => {
                this.sseCustomConnections.delete(reply);
            });
        });

        // --- API: Send OSC Message ---
        this.server.post<{ Body: OscSendBody }>('/api/osc/send', async (request, reply) => {
            const { deviceName, address, args } = request.body;

            if (!deviceName || !address) {
                return reply.code(400).send({ error: "Missing deviceName or address" });
            }

            const oscMessage = new Message(address);
            if (args && Array.isArray(args)) {
                args.forEach(arg => oscMessage.append(arg));
            }

            try {
                this.plugin.oscManager.sendMessage(deviceName, oscMessage);
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        // --- API: Send MIDI Message ---
        this.server.post<{ Body: MidiSendBody }>('/api/midi/send', async (request, reply) => {
            const { deviceName, message } = request.body;

            if (!deviceName || !message) {
                return reply.code(400).send({ error: "Missing deviceName or message payload" });
            }

            try {
                this.plugin.midiManager.sendMidiMessage(deviceName, this.plugin.settings.midiDevices, message);
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        // --- API: Send Custom Message ---
        this.server.post<{ Body: CustomMessageBody }>('/api/custom/message', async (request, reply) => {
            const { name, data } = request.body;

            if (!name || !data) {
                return reply.code(400).send({ error: "Missing name or data" });
            }

            try {
                this.broadcastCustomMessage(name, data);
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            new Notice(`Slides Studio Server started on port ${this.port}`);

            if (this.plugin.settings.mouseMonitorEnabled) {
                void this.startMouseMonitor();
            }
            if (this.plugin.settings.keyboardMonitorEnabled) {
                void this.startKeyboardMonitor();
            }
            if (this.plugin.settings.uvcUtilEnabled) {
                void this.startUvcUtilBridge();
            }
        } catch (err) {
            console.error("Failed to start Fastify server", err);
            this.isRunning = false;
        }
    }

    /**
     * Broadcasts an OSC message to SSE clients subscribed to the specific device.
     * @param deviceName - The name of the device sending the message.
     * @param message - The OSC message payload.
     */
    public broadcastOscMessage(deviceName: string, message: unknown[]): void {
        const connections = this.sseOscConnections.get(deviceName);
        if (!connections) return;

        const payload = JSON.stringify({ deviceName, message });
        const data = `event: ${deviceName}\ndata: ${payload}\n\n`;

        for (const reply of connections) {
            reply.raw.write(data);
        }
    }

    /**
     * Broadcasts a MIDI message to SSE clients subscribed to the specific device.
     * @param deviceName - The name of the device sending the message.
     * @param message - The MIDI message payload.
     */
    public broadcastMidiMessage(deviceName: string, message: MidiPayload): void {
        const connections = this.sseMidiConnections.get(deviceName);
        if (!connections) return;

        const payload = JSON.stringify({ deviceName, message });
        const data = `event: ${deviceName}\ndata: ${payload}\n\n`;

        for (const reply of connections) {
            reply.raw.write(data);
        }
    }

    /**
     * Broadcasts a mouse event to SSE clients.
     * @param topic - The mouse event topic (mousePosition, mouseClick, mouseScroll).
     * @param data - The event data.
     */
    public broadcastMouseMessage(topic: string, data: unknown): void {
        const connections = this.sseMouseConnections.get(topic);
        if (!connections) return;

        const payload = JSON.stringify(data);
        const sseData = `event: ${topic}\ndata: ${payload}\n\n`;

        for (const reply of connections) {
            reply.raw.write(sseData);
        }
    }

    /**
     * Broadcasts a keyboard event to SSE clients.
     * @param topic - The keyboard event topic (keyboardPress, keyboardRelease).
     * @param data - The event data.
     */
    public broadcastKeyboardMessage(topic: string, data: unknown): void {
        const connections = this.sseKeyboardConnections.get(topic);
        if (!connections) return;

        const payload = JSON.stringify(data);
        const sseData = `event: ${topic}\ndata: ${payload}\n\n`;

        for (const reply of connections) {
            reply.raw.write(sseData);
        }
    }

    /**
     * Broadcasts a custom message to all connected SSE clients.
     * @param name - The event name.
     * @param message - The data payload.
     */
    public broadcastCustomMessage(name: string, message: Record<string, unknown>): void {
        const payload = JSON.stringify(message);
        const data = `event: ${name}\ndata: ${payload}\n\n`;

        for (const reply of this.sseCustomConnections) {
            reply.raw.write(data);
        }
    }

    /**
     * Ensures the shared monitor socket server is running.
     */
    private ensureMonitorSocketServer(): void {
        if (this.monitorSocketServer) return;

        this.monitorSocketServer = net.createServer((socket) => {
            let buffer = '';
            socket.on('data', (data) => {
                buffer += data.toString();
                let boundary = buffer.indexOf('\n');
                while (boundary !== -1) {
                    const line = buffer.substring(0, boundary);
                    buffer = buffer.substring(boundary + 1);
                    try {
                        const event = JSON.parse(line) as MouseEventData;
                        if (event.topic && event.data) {
                            if (event.topic.startsWith('mouse')) {
                                this.broadcastMouseMessage(event.topic, event.data);
                            } else if (event.topic.startsWith('keyboard')) {
                                this.broadcastKeyboardMessage(event.topic, event.data);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse monitor event", e);
                    }
                    boundary = buffer.indexOf('\n');
                }
            });
        });

        const socketPort = 57001; 
        this.monitorSocketServer.listen(socketPort, '127.0.0.1');
    }

    /**
     * Starts the global mouse monitor Python script.
     */
    public startMouseMonitor(): void {
        if (this.mouseMonitorProcess) return;

        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const basePath = adapter.getBasePath();
        const pythonScriptPath = path.join(basePath, this.plugin.manifest.dir, 'pythonScripts/mouse_monitor.py');

        this.ensureMonitorSocketServer();

        const socketPort = 57001; 
        const args = [
            pythonScriptPath,
            `127.0.0.1:${socketPort}`,
            this.plugin.settings.mouseMonitorPosition ? '1' : '0',
            this.plugin.settings.mouseMonitorClicks ? '1' : '0',
            this.plugin.settings.mouseMonitorScroll ? '1' : '0'
        ];

        const pythonPath = this.plugin.settings.pythonPath || 'python3';

        try {
            this.mouseMonitorProcess = spawn(pythonPath, args);
            
            this.mouseMonitorProcess.on('error', (err) => {
                new Notice(`Failed to start mouse monitor with path: ${pythonPath}. Check your settings.`);
                console.error("Failed to start mouse monitor", err);
                this.stopMouseMonitor();
            });

            this.setupMouseProcessHandlers();
            new Notice("Mouse monitor started.");
        } catch (err) {
            new Notice(`Failed to start mouse monitor: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private setupMouseProcessHandlers(): void {
        if (!this.mouseMonitorProcess) return;
        
        this.mouseMonitorProcess.on('exit', (code) => {
            console.warn(`Mouse monitor exited with code ${code}`);
            this.mouseMonitorProcess = null;
            this.checkMonitorSocketServerCleanup();
        });

        this.mouseMonitorProcess.stderr?.on('data', (data) => {
            console.error(`Mouse Monitor Error: ${data}`);
        });
    }

    /**
     * Starts the global keyboard monitor Python script.
     */
    public startKeyboardMonitor(): void {
        if (this.keyboardMonitorProcess) return;

        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const basePath = adapter.getBasePath();
        const pythonScriptPath = path.join(basePath, this.plugin.manifest.dir, 'pythonScripts/keyboard_monitor.py');

        this.ensureMonitorSocketServer();

        const socketPort = 57001; 
        const args = [
            pythonScriptPath,
            `127.0.0.1:${socketPort}`,
            this.plugin.settings.keyboardMonitorShowCombinations ? '1' : '0'
        ];

        const pythonPath = this.plugin.settings.pythonPath || 'python3';

        try {
            this.keyboardMonitorProcess = spawn(pythonPath, args);
            
            this.keyboardMonitorProcess.on('error', (err) => {
                new Notice(`Failed to start keyboard monitor with path: ${pythonPath}. Check your settings.`);
                console.error("Failed to start keyboard monitor", err);
                this.stopKeyboardMonitor();
            });

            this.setupKeyboardProcessHandlers();
            new Notice("Keyboard monitor started.");
        } catch (err) {
            new Notice(`Failed to start keyboard monitor: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private setupKeyboardProcessHandlers(): void {
        if (!this.keyboardMonitorProcess) return;
        
        this.keyboardMonitorProcess.on('exit', (code) => {
            console.warn(`Keyboard monitor exited with code ${code}`);
            this.keyboardMonitorProcess = null;
            this.checkMonitorSocketServerCleanup();
        });

        this.keyboardMonitorProcess.stderr?.on('data', (data) => {
            console.error(`Keyboard Monitor Error: ${data}`);
        });
    }

    /**
     * Starts the UVC Util bridge Python script.
     */
    public startUvcUtilBridge(): void {
        if (this.uvcUtilBridgeProcess) return;

        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const basePath = adapter.getBasePath();
        const pluginDir = this.plugin.manifest.dir;
        const pythonScriptPath = path.join(basePath, pluginDir, 'pythonScripts/uvc-util/uvc_util_bridge.py');
        
        let libPath = this.plugin.settings.uvcUtilLibPath;
        if (!path.isAbsolute(libPath)) {
            // Assume relative to plugin directory
            libPath = path.join(basePath, pluginDir, libPath);
        }

        const pythonPath = this.plugin.settings.pythonPath || 'python3';
        const wsPort = 8081;

        const args = [
            pythonScriptPath,
            "--port", wsPort.toString(),
            "--lib", libPath
        ];

        console.warn(`Starting UVC bridge: ${pythonPath} ${args.join(' ')}`);

        try {
            this.uvcUtilBridgeProcess = spawn(pythonPath, args);
            
            this.uvcUtilBridgeProcess.on('error', (err) => {
                new Notice(`Failed to start UVC bridge with path: ${pythonPath}. Check your settings.`);
                console.error("Failed to start UVC bridge", err);
                this.stopUvcUtilBridge();
            });

            this.uvcUtilBridgeProcess.on('exit', (code) => {
                console.warn(`UVC bridge exited with code ${code}`);
                this.uvcUtilBridgeProcess = null;
            });

            this.uvcUtilBridgeProcess.stdout?.on('data', (data) => {
                console.warn(`UVC Bridge: ${data}`);
            });

            this.uvcUtilBridgeProcess.stderr?.on('data', (data) => {
                console.error(`UVC Bridge Error: ${data}`);
            });

            new Notice("Uvc bridge started.");
        } catch (err) {
            new Notice(`Failed to start UVC bridge: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /**
     * Stops the UVC Util bridge Python script.
     */
    public stopUvcUtilBridge(): void {
        if (this.uvcUtilBridgeProcess) {
            this.uvcUtilBridgeProcess.kill();
            this.uvcUtilBridgeProcess = null;
        }
        new Notice("Uvc bridge stopped.");
    }

    /**
     * Restarts the UVC Util bridge with updated settings.
     */
    public restartUvcUtilBridge(): void {
        this.stopUvcUtilBridge();
        if (this.plugin.settings.uvcUtilEnabled) {
            this.startUvcUtilBridge();
        }
    }

    private checkMonitorSocketServerCleanup(): void {
        if (!this.mouseMonitorProcess && !this.keyboardMonitorProcess && this.monitorSocketServer) {
            this.monitorSocketServer.close();
            this.monitorSocketServer = null;
        }
    }

    /**
     * Stops the mouse monitor Python script.
     */
    public stopMouseMonitor(): void {
        if (this.mouseMonitorProcess) {
            this.mouseMonitorProcess.kill();
            this.mouseMonitorProcess = null;
        }
        this.checkMonitorSocketServerCleanup();
        new Notice("Mouse monitor stopped.");
    }

    /**
     * Restarts the mouse monitor with updated settings.
     */
    public restartMouseMonitor(): void {
        this.stopMouseMonitor();
        if (this.plugin.settings.mouseMonitorEnabled) {
            this.startMouseMonitor();
        }
    }

    /**
     * Stops the keyboard monitor Python script.
     */
    public stopKeyboardMonitor(): void {
        if (this.keyboardMonitorProcess) {
            this.keyboardMonitorProcess.kill();
            this.keyboardMonitorProcess = null;
        }
        this.checkMonitorSocketServerCleanup();
        new Notice("Keyboard monitor stopped.");
    }

    /**
     * Restarts the keyboard monitor with updated settings.
     */
    public restartKeyboardMonitor(): void {
        this.stopKeyboardMonitor();
        if (this.plugin.settings.keyboardMonitorEnabled) {
            this.startKeyboardMonitor();
        }
    }

    /**
     * Stops the server and closes all active SSE connections.
     */
    public async stop(): Promise<void> {
        this.stopMouseMonitor();
        this.stopKeyboardMonitor();
        this.stopUvcUtilBridge();

        if (this.server) {
            this.sseOscConnections.forEach(connections => {
                connections.forEach(reply => reply.raw.end());
            });
            this.sseOscConnections.clear();

            this.sseMidiConnections.forEach(connections => {
                connections.forEach(reply => reply.raw.end());
            });
            this.sseMidiConnections.clear();

            this.sseMouseConnections.forEach(connections => {
                connections.forEach(reply => reply.raw.end());
            });
            this.sseMouseConnections.clear();

            this.sseKeyboardConnections.forEach(connections => {
                connections.forEach(reply => reply.raw.end());
            });
            this.sseKeyboardConnections.clear();

            for (const reply of this.sseCustomConnections) {
                reply.raw.end();
            }
            this.sseCustomConnections.clear();
            
            if (this.obsServer) {
                this.obsServer.cleanup();
                this.obsServer = null;
            }

            await this.server.close();
            this.server = null;
            this.isRunning = false;
        }
    }

    /**
     * Restarts the server on a new port.
     * @param newPort - The new port number to listen on.
     */
    public async restart(newPort: number): Promise<void> {
        await this.stop();
        this.port = newPort;
        await this.start();
    }

    /**
     * Returns the base URL of the running server.
     * @returns The local URL (e.g., http://127.0.0.1:57000).
     */
    public getUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }
}
