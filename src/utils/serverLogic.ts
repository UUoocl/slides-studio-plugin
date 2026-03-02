import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import { Message } from 'node-osc';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { WebSocketServer, WebSocket, RawData } from 'ws';

import type slidesStudioPlugin from '../main'; 
import { SaveFileBody, FileListQuery, GetFileQuery, OscSendBody, MidiSendBody, MidiPayload, CustomMessageBody, MouseEventData, OscDeviceSetting, MidiDeviceSetting } from '../types';
import { ObsServer } from './obsEndpoints';

/**
 * Manages the local Fastify server.
 * Handles file operations, API endpoints, and WebSocket broadcasting for MIDI/OSC/UVC events.
 */
export class ServerManager {
    private app: App;
    private plugin: slidesStudioPlugin;
    private server: FastifyInstance | null = null;
    private port: number;
    private isRunning = false;
    
    private oscWsServers: Map<string, WebSocketServer> = new Map();
    private midiWsServers: Map<string, WebSocketServer> = new Map();
    private uvcWsServer: WebSocketServer | null = null;

    private sseAllConnections: Set<FastifyReply> = new Set();
    private obsServer: ObsServer | null = null;

    private mouseMonitorProcess: ChildProcess | null = null;
    private keyboardMonitorProcess: ChildProcess | null = null;
    private uvcUtilBridgeProcess: ChildProcess | null = null;
    private monitorSocketServer: net.Server | null = null;
    private currentMonitorPort: number | null = null;
    private uvcSocket: net.Socket | null = null;

    constructor(app: App, plugin: slidesStudioPlugin, port: number) {
        this.app = app;
        this.plugin = plugin;
        this.port = port;
    }

    private setupSSE(reply: FastifyReply): void {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders();
    }

    private rawDataToString(data: RawData): string {
        if (Buffer.isBuffer(data)) {
            return data.toString();
        } else if (data instanceof ArrayBuffer) {
            return new TextDecoder().decode(data);
        } else {
            // Buffer[]
            return Buffer.concat(data).toString();
        }
    }

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
        const libFolder = path.join(basePath, `${pluginManifest.dir}/lib`);
        const appFolder = path.join(basePath, `${pluginManifest.dir}/slide-studio-app`);

        console.warn(`[Server] Starting with basePath: ${basePath}`);
        console.warn(`[Server] Serving libs from: ${libFolder} (Exists: ${fs.existsSync(libFolder)})`);
        console.warn(`[Server] Serving app from: ${appFolder} (Exists: ${fs.existsSync(appFolder)})`);

        try {
            fs.readdirSync(basePath);
        } catch (e) {
            console.error("[Server] Failed to read vault root", e);
        }

        this.server = fastify();

        // Set security headers globally at the earliest possible stage
        this.server.addHook('preHandler', async (request, reply) => {
            reply.header('X-Frame-Options', 'ALLOWALL');
            reply.header('Access-Control-Allow-Origin', '*');
            reply.header('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:; media-src *;");
        });

        await this.server.register(fastifyCors, { origin: '*' });

        this.server.setNotFoundHandler((request, reply) => {
            console.warn(`[Server] 404 Not Found: ${request.method} ${request.url}`);
            void reply.code(404).send({ error: 'Not Found', url: request.url });
        });

        // Register static serving
        void this.server.register(fastifyStatic, {
            root: [libFolder, appFolder, basePath],
            prefix: '/', 
            setHeaders: (res, path) => {
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:; media-src *;");
                
                // Explicitly set MIME types for MediaPipe and ES Modules
                if (path.endsWith('.mjs')) {
                    res.setHeader('Content-Type', 'application/javascript');
                } else if (path.endsWith('.task')) {
                    res.setHeader('Content-Type', 'application/octet-stream');
                } else if (path.endsWith('.wasm')) {
                    res.setHeader('Content-Type', 'application/wasm');
                }
            }
        });

        this.obsServer = new ObsServer(this.plugin);
        this.obsServer.registerRoutes(this.server);

        // Unified SSE Endpoint for all plugin events (reduces connection count)
        this.server.get('/api/events', (request, reply) => {
            this.setupSSE(reply);
            this.sseAllConnections.add(reply);

            // Send initial OBS status to new connection if OBS is already connected
            if (this.plugin.isObsConnected) {
                const data = JSON.stringify({});
                reply.raw.write(`event: ConnectionOpened\ndata: ${data}\n\n`);
                reply.raw.write(`event: Identified\ndata: ${data}\n\n`);
            }

            request.raw.on('close', () => this.sseAllConnections.delete(reply));
        });

        // --- STT Result Endpoint ---
        this.server.post<{ Body: { results: Array<{ device: string, transcript: string }> } }>('/api/stt/result', async (request, reply) => {
            const { results } = request.body;
            if (!results || !Array.isArray(results)) return reply.code(400).send({ error: "Invalid data format" });

            for (const res of results) {
                if (res.device && res.transcript !== undefined) {
                    this.broadcastAudioMessage('audioSTT', res.device, res.transcript);
                }
            }
            return { success: true };
        });

        // --- Audio STT Devices Endpoint ---
        this.server.get('/api/audio/stt-devices', async () => {
            return this.plugin.settings.audioDevices.filter(d => d.sttEnabled);
        });

        // --- API: Get OBS Credentials ---
        this.server.get('/api/obswss', (_request, _reply) => {
            const settings = this.plugin.settings;
            return {
                IP: settings.websocketIP_Text || "127.0.0.1",
                PORT: parseInt(settings.websocketPort_Text) || 4455,
                PW: settings.websocketPW_Text || ""
            };
        });

        // --- API: Get Device Settings (Ports) ---
        this.server.get('/api/devices', (_request, _reply) => {
            return {
                osc: this.plugin.settings.oscDevices.map(d => ({ name: d.name, wsPort: d.wsPort })),
                midi: this.plugin.settings.midiDevices.map(d => ({ name: d.name, wsPort: d.wsPort })),
                uvc: { wsPort: this.plugin.settings.uvcWsPort }
            };
        });

        // --- API: Generic File Save ---
        this.server.post<{ Body: SaveFileBody }>('/api/file/save', async (request, reply) => {
            const { folder, filename, data } = request.body;
            if (!folder || !filename || !data) return reply.code(400).send({ error: "Missing data" });
            const targetDir = path.join(basePath, folder);
            const fullPath = path.join(targetDir, filename.endsWith('.json') ? filename : `${filename}.json`);
            if (!targetDir.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            try {
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                return { success: true, path: fullPath };
            } catch (err) {
                return reply.code(500).send({ error: String(err) });
            }
        });

        // --- API: Generic File List/Get ---
        this.server.get<{ Querystring: FileListQuery }>('/api/file/list', (request, reply) => {
            const targetDir = path.join(basePath, request.query.folder);
            if (!targetDir.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });
            if (!fs.existsSync(targetDir)) return reply.send([]);
            return reply.send(fs.readdirSync(targetDir).filter(f => f.endsWith('.json')));
        });

        this.server.get<{ Querystring: GetFileQuery }>('/api/file/get', (request, reply) => {
            const fullPath = path.join(basePath, request.query.folder, request.query.filename);
            if (!fullPath.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });
            if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: "Not found" });
            return reply.send(JSON.parse(fs.readFileSync(fullPath, 'utf-8')));
        });

        // --- API: Monitor Settings ---
        this.server.get('/api/keyboard/settings', (_request, _reply) => {
            return {
                showCombinations: this.plugin.settings.keyboardMonitorShowCombinations
            };
        });

        this.server.get('/api/mouse/settings', (_request, _reply) => {
            return {
                position: this.plugin.settings.mouseMonitorPosition,
                clicks: this.plugin.settings.mouseMonitorClicks,
                scroll: this.plugin.settings.mouseMonitorScroll
            };
        });

        // --- API: OSC/MIDI Send ---
        this.server.post<{ Body: OscSendBody }>('/api/osc/send', async (request, reply) => {
            const { deviceName, address, args } = request.body;
            const message = new Message(address);
            args.forEach(arg => message.append(arg));
            this.plugin.oscManager.sendMessage(deviceName, message);
            return { success: true };
        });

        this.server.post<{ Body: MidiSendBody }>('/api/midi/send', async (request, reply) => {
            const { deviceName, message } = request.body;
            this.plugin.midiManager.sendMidiMessage(deviceName, this.plugin.settings.midiDevices, message);
            return { success: true };
        });

        this.server.post<{ Body: CustomMessageBody }>('/api/custom/message', async (request, reply) => {
            this.broadcastCustomMessage(request.body.name, request.body.data);
            return { success: true };
        });

        // --- API: UVC Commands (Legacy - preferring WS) ---
        this.server.post<{ Body: { action: string, [key: string]: unknown } }>('/api/uvc/command', async (request, reply) => {
            if (!this.uvcSocket) {
                return reply.code(503).send({ error: "UVC Bridge not connected" });
            }
            this.uvcSocket.write(JSON.stringify(request.body) + '\n');
            return { success: true };
        });

        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            console.warn(`[Server] Listening on http://127.0.0.1:${this.port}`);
            
            // Start WebSocket servers for OSC, MIDI, and UVC
            this.startDeviceWsServers();

            if (this.plugin.settings.mouseMonitorEnabled) void this.startMouseMonitor();
            if (this.plugin.settings.keyboardMonitorEnabled) void this.startKeyboardMonitor();
            if (this.plugin.settings.uvcUtilEnabled) void this.startUvcUtilBridge();
        } catch (err) {
            console.error("Failed to start server", err);
            this.isRunning = false;
        }
    }

    private startDeviceWsServers(): void {
        this.plugin.settings.oscDevices.forEach(device => {
            if (device.wsPort) this.startOscWsServer(device);
        });
        this.plugin.settings.midiDevices.forEach(device => {
            if (device.wsPort) this.startMidiWsServer(device);
        });
        if (this.plugin.settings.uvcWsPort) {
            this.startUvcWsServer(this.plugin.settings.uvcWsPort);
        }
    }

    private startOscWsServer(device: OscDeviceSetting): void {
        try {
            const wss = new WebSocketServer({ port: device.wsPort });
            this.oscWsServers.set(device.name, wss);
            console.warn(`[Server] OSC WebSocket server for ${device.name} started on port ${device.wsPort}`);
            
            wss.on('connection', (ws) => {
                ws.on('message', (data: RawData) => {
                    try {
                        const payload = JSON.parse(this.rawDataToString(data)) as { address: string, args: (string | number | boolean)[] };
                        // Expecting { address: string, args: any[] }
                        const { address, args } = payload;
                        const message = new Message(address);
                        (args || []).forEach((arg) => message.append(arg));
                        this.plugin.oscManager.sendMessage(device.name, message);
                    } catch (e) {
                        console.error(`[Server] OSC WS Message error (${device.name}):`, e);
                    }
                });
            });

            wss.on('error', (err) => console.error(`[Server] OSC WS Server Error (${device.name}):`, err));
        } catch (err) {
            console.error(`[Server] Failed to start OSC WS server for ${device.name} on port ${device.wsPort}`, err);
        }
    }

    private startMidiWsServer(device: MidiDeviceSetting): void {
        try {
            const wss = new WebSocketServer({ port: device.wsPort });
            this.midiWsServers.set(device.name, wss);
            console.warn(`[Server] MIDI WebSocket server for ${device.name} started on port ${device.wsPort}`);

            wss.on('connection', (ws) => {
                ws.on('message', (data: RawData) => {
                    try {
                        const payload = JSON.parse(this.rawDataToString(data)) as MidiPayload;
                        // Expecting MidiPayload
                        this.plugin.midiManager.sendMidiMessage(device.name, this.plugin.settings.midiDevices, payload);
                    } catch (e) {
                        console.error(`[Server] MIDI WS Message error (${device.name}):`, e);
                    }
                });
            });

            wss.on('error', (err) => console.error(`[Server] MIDI WS Server Error (${device.name}):`, err));
        } catch (err) {
            console.error(`[Server] Failed to start MIDI WS server for ${device.name} on port ${device.wsPort}`, err);
        }
    }

    private startUvcWsServer(port: number): void {
        try {
            this.uvcWsServer = new WebSocketServer({ port });
            console.warn(`[Server] UVC WebSocket server started on port ${port}`);

            this.uvcWsServer.on('connection', (ws) => {
                ws.on('message', (data: RawData) => {
                    if (this.uvcSocket) {
                        try {
                            // Forward browser command to Python bridge
                            this.uvcSocket.write(this.rawDataToString(data) + '\n');
                        } catch (e) {
                            console.error(`[Server] Failed to forward UVC command to Python:`, e);
                        }
                    }
                });
            });

            this.uvcWsServer.on('error', (err) => console.error(`[Server] UVC WS Server Error:`, err));
        } catch (err) {
            console.error(`[Server] Failed to start UVC WS server on port ${port}`, err);
        }
    }

    public broadcastCustomMessage(name: string, message: Record<string, unknown>): void {
        this.broadcastToAll(name, message);
    }

    public broadcastToAll(event: string, data: unknown): void {
        const sseData = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
        for (const reply of this.sseAllConnections) {
            try {
                reply.raw.write(sseData);
            } catch {
                this.sseAllConnections.delete(reply);
            }
        }
    }

    public broadcastOscMessage(name: string, message: unknown[]): void {
        const data = { deviceName: name, message };
        const wss = this.oscWsServers.get(name);
        if (wss) {
            const jsonData = JSON.stringify(data);
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.send(jsonData);
            });
        }
        this.broadcastToAll(name, data);
    }

    public broadcastMidiMessage(name: string, message: MidiPayload): void {
        const data = { deviceName: name, message };
        const wss = this.midiWsServers.get(name);
        if (wss) {
            const jsonData = JSON.stringify(data);
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.send(jsonData);
            });
        }
        this.broadcastToAll(name, data);
    }

    public broadcastUvcMessage(data: unknown): void {
        // Broadcast to WebSockets
        if (this.uvcWsServer) {
            const jsonData = JSON.stringify(data);
            this.uvcWsServer.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) client.send(jsonData);
            });
        }
        // Broadcast to global SSE
        this.broadcastToAll('uvc', data);
    }

    private ensureMonitorSocketServer(): void {
        const desiredPort = parseInt(this.plugin.settings.pythonSocketPort) || 57001;
        
        if (this.monitorSocketServer && this.currentMonitorPort === desiredPort) return;

        if (this.monitorSocketServer) {
            this.monitorSocketServer.close();
            this.monitorSocketServer = null;
        }

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
                        if (event.topic === 'uvc') {
                            this.uvcSocket = socket;
                            this.broadcastUvcMessage(event.data);
                        }
                        else if (event.topic.startsWith('mouse')) this.broadcastMouseMessage(event.topic, event.data);
                        else if (event.topic.startsWith('keyboard')) this.broadcastKeyboardMessage(event.topic, event.data);
                    } catch {
                        /* ignore parse errors */
                    }
                    boundary = buffer.indexOf('\n');
                }
            });
            socket.on('close', () => {
                if (this.uvcSocket === socket) this.uvcSocket = null;
            });
        });
        
        this.monitorSocketServer.listen(desiredPort, '127.0.0.1');
        this.currentMonitorPort = desiredPort;
    }

    public broadcastMouseMessage(topic: string, data: unknown): void {
        this.broadcastToAll(topic, data);
    }

    public broadcastKeyboardMessage(topic: string, data: unknown): void {
        this.broadcastToAll(topic, data);
    }

    public broadcastAudioMessage(topic: string, deviceName: string, data: unknown): void {
        const payload: Record<string, unknown> = { device: deviceName };
        if (topic === 'audioFFT') {
            payload.fft = data;
        } else if (topic === 'audioSTT') {
            payload.stt = data;
        } else {
            payload.data = data;
        }
        this.broadcastToAll('audioData', payload);
    }

    public async startMouseMonitor(): Promise<void> {
        if (this.mouseMonitorProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        this.ensureMonitorSocketServer();
        const pythonScriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/mouse_monitor.py');
        const port = this.plugin.settings.pythonSocketPort || '57001';
        const args = [pythonScriptPath, `127.0.0.1:${port}`, this.plugin.settings.mouseMonitorPosition ? '1' : '0', this.plugin.settings.mouseMonitorClicks ? '1' : '0', this.plugin.settings.mouseMonitorScroll ? '1' : '0'];
        this.mouseMonitorProcess = spawn(this.plugin.settings.pythonPath || 'python3', args);
        this.mouseMonitorProcess.on('exit', () => { this.mouseMonitorProcess = null; this.checkMonitorSocketServerCleanup(); });
    }

    public async startKeyboardMonitor(): Promise<void> {
        if (this.keyboardMonitorProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        this.ensureMonitorSocketServer();
        const pythonScriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/keyboard_monitor.py');
        const port = this.plugin.settings.pythonSocketPort || '57001';
        const args = [pythonScriptPath, `127.0.0.1:${port}`, this.plugin.settings.keyboardMonitorShowCombinations ? '1' : '0'];
        this.keyboardMonitorProcess = spawn(this.plugin.settings.pythonPath || 'python3', args);
        this.keyboardMonitorProcess.on('exit', () => { this.keyboardMonitorProcess = null; this.checkMonitorSocketServerCleanup(); });
    }

    public async startUvcUtilBridge(): Promise<void> {
        if (this.uvcUtilBridgeProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        this.ensureMonitorSocketServer();
        const pythonScriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/uvc-util/uvc_util_bridge.py');
        let libPath = this.plugin.settings.uvcUtilLibPath;
        if (!path.isAbsolute(libPath)) libPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, libPath);
        const port = this.plugin.settings.pythonSocketPort || '57001';
        this.uvcUtilBridgeProcess = spawn(this.plugin.settings.pythonPath || 'python3', [pythonScriptPath, "--port", port, "--lib", libPath]);
        this.uvcUtilBridgeProcess.on('exit', () => { this.uvcUtilBridgeProcess = null; this.checkMonitorSocketServerCleanup(); });
    }

    public stopUvcUtilBridge(): void { if (this.uvcUtilBridgeProcess) this.uvcUtilBridgeProcess.kill(); }
    public stopMouseMonitor(): void { if (this.mouseMonitorProcess) this.mouseMonitorProcess.kill(); }
    public stopKeyboardMonitor(): void { if (this.keyboardMonitorProcess) this.keyboardMonitorProcess.kill(); }

    public async restartMouseMonitor(): Promise<void> {
        this.stopMouseMonitor();
        // Wait a bit for it to exit
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.startMouseMonitor();
    }

    public async restartKeyboardMonitor(): Promise<void> {
        this.stopKeyboardMonitor();
        // Wait a bit for it to exit
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.startKeyboardMonitor();
    }

    public async restartUvcUtilBridge(): Promise<void> {
        this.stopUvcUtilBridge();
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.startUvcUtilBridge();
    }

    private checkMonitorSocketServerCleanup(): void {
        if (!this.mouseMonitorProcess && !this.keyboardMonitorProcess && !this.uvcUtilBridgeProcess && this.monitorSocketServer) {
            this.monitorSocketServer.close();
            this.monitorSocketServer = null;
            this.currentMonitorPort = null;
        }
    }

    public async stop(): Promise<void> {
        this.stopMouseMonitor();
        this.stopKeyboardMonitor();
        this.stopUvcUtilBridge();
        
        this.oscWsServers.forEach(wss => wss.close());
        this.oscWsServers.clear();
        this.midiWsServers.forEach(wss => wss.close());
        this.midiWsServers.clear();
        if (this.uvcWsServer) {
            this.uvcWsServer.close();
            this.uvcWsServer = null;
        }

        if (this.server) {
            for (const reply of this.sseAllConnections) reply.raw.end();
            
            if (this.obsServer) this.obsServer.cleanup();
            await this.server.close();
            this.server = null;
            this.isRunning = false;
        }
    }

    public async restart(newPort: number): Promise<void> {
        await this.stop();
        this.port = newPort;
        await this.start();
    }

    public getUrl(): string { return `http://127.0.0.1:${this.port}`; }
}
