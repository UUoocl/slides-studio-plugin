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
    
    private sseOscConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseMidiConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseMouseConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseKeyboardConnections: Map<string, Set<FastifyReply>> = new Map();
    private sseUvcConnections: Set<FastifyReply> = new Set();
    private sseCustomConnections: Set<FastifyReply> = new Set();
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

        console.log(`[Server] Starting with basePath: ${basePath}`);
        console.log(`[Server] Serving libs from: ${libFolder} (Exists: ${fs.existsSync(libFolder)})`);
        console.log(`[Server] Serving app from: ${appFolder} (Exists: ${fs.existsSync(appFolder)})`);

        try {
            const vaultFiles = fs.readdirSync(basePath);
            console.log(`[Server] Vault root contents: ${vaultFiles.join(', ')}`);
        } catch (e) {
            console.error("[Server] Failed to read vault root", e);
        }

        this.server = fastify();

        // Add a global logger for all requests to help debug OBS loading issues
        this.server.addHook('onRequest', async (request) => {
            console.log(`[Server] Request: ${request.method} ${request.url}`);
        });

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
            setHeaders: (res) => {
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:; media-src *;");
            }
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

        // --- SSE: Custom Events ---
        this.server.get('/api/custom/events', (request, reply) => {
            this.setupSSE(reply);
            this.sseCustomConnections.add(reply);
            request.raw.on('close', () => this.sseCustomConnections.delete(reply));
        });

        this.server.post<{ Body: CustomMessageBody }>('/api/custom/message', async (request, reply) => {
            this.broadcastCustomMessage(request.body.name, request.body.data);
            return { success: true };
        });

        // --- SSE: Mouse/Keyboard/UVC Events ---
        this.server.get<{ Params: { topic: string } }>('/api/mouse/events/:topic', (request, reply) => {
            this.setupSSE(reply);
            const { topic } = request.params;
            this.addConnection(this.sseMouseConnections, topic, reply);
            request.raw.on('close', () => this.removeConnection(this.sseMouseConnections, topic, reply));
        });

        this.server.get<{ Params: { topic: string } }>('/api/keyboard/events/:topic', (request, reply) => {
            this.setupSSE(reply);
            const { topic } = request.params;
            this.addConnection(this.sseKeyboardConnections, topic, reply);
            request.raw.on('close', () => this.removeConnection(this.sseKeyboardConnections, topic, reply));
        });

        this.server.get('/api/uvc/events', (request, reply) => {
            this.setupSSE(reply);
            this.sseUvcConnections.add(reply);
            request.raw.on('close', () => this.sseUvcConnections.delete(reply));
        });

        // --- API: UVC Commands ---
        this.server.post<{ Body: { action: string, [key: string]: any } }>('/api/uvc/command', async (request, reply) => {
            if (!this.uvcSocket) {
                return reply.code(503).send({ error: "UVC Bridge not connected" });
            }
            this.uvcSocket.write(JSON.stringify(request.body) + '\n');
            return { success: true };
        });

        // --- SSE: OSC/MIDI Events ---
        this.server.get<{ Params: { name: string } }>('/api/osc/events/:name', (request, reply) => {
            this.setupSSE(reply);
            const { name } = request.params;
            this.addConnection(this.sseOscConnections, name, reply);
            request.raw.on('close', () => this.removeConnection(this.sseOscConnections, name, reply));
        });

        this.server.get<{ Params: { name: string } }>('/api/midi/events/:name', (request, reply) => {
            this.setupSSE(reply);
            const { name } = request.params;
            this.addConnection(this.sseMidiConnections, name, reply);
            request.raw.on('close', () => this.removeConnection(this.sseMidiConnections, name, reply));
        });

        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            console.log(`[Server] Listening on http://127.0.0.1:${this.port}`);
            
            if (this.plugin.settings.mouseMonitorEnabled) void this.startMouseMonitor();
            if (this.plugin.settings.keyboardMonitorEnabled) void this.startKeyboardMonitor();
            if (this.plugin.settings.uvcUtilEnabled) void this.startUvcUtilBridge();
        } catch (err) {
            console.error("Failed to start server", err);
            this.isRunning = false;
        }
    }

    public broadcastCustomMessage(name: string, message: Record<string, unknown>): void {
        console.log(`[Server] Broadcasting: ${name}. Connections: ${this.sseCustomConnections.size}`, message);
        const data = `event: ${name}\ndata: ${JSON.stringify(message)}\n\n`;
        for (const reply of this.sseCustomConnections) reply.raw.write(data);
    }

    public broadcastOscMessage(name: string, message: unknown[]): void {
        const connections = this.sseOscConnections.get(name);
        if (!connections) return;
        const data = `event: ${name}\ndata: ${JSON.stringify({ deviceName: name, message })}\n\n`;
        for (const reply of connections) reply.raw.write(data);
    }

    public broadcastMidiMessage(name: string, message: MidiPayload): void {
        const connections = this.sseMidiConnections.get(name);
        if (!connections) return;
        const data = `event: ${name}\ndata: ${JSON.stringify({ deviceName: name, message })}\n\n`;
        for (const reply of connections) reply.raw.write(data);
    }

    public broadcastUvcMessage(data: unknown): void {
        const sseData = `event: uvc\ndata: ${JSON.stringify(data)}\n\n`;
        for (const reply of this.sseUvcConnections) reply.raw.write(sseData);
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
                    } catch (e) {}
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
        const connections = this.sseMouseConnections.get(topic);
        if (!connections) return;
        const sseData = `event: ${topic}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const reply of connections) reply.raw.write(sseData);
    }

    public broadcastKeyboardMessage(topic: string, data: unknown): void {
        const connections = this.sseKeyboardConnections.get(topic);
        if (!connections) return;
        const sseData = `event: ${topic}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const reply of connections) reply.raw.write(sseData);
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
        if (this.server) {
            // Cleanup all SSE connections
            this.sseOscConnections.forEach(set => set.forEach(reply => reply.raw.end()));
            this.sseMidiConnections.forEach(set => set.forEach(reply => reply.raw.end()));
            this.sseMouseConnections.forEach(set => set.forEach(reply => reply.raw.end()));
            this.sseKeyboardConnections.forEach(set => set.forEach(reply => reply.raw.end()));
            for (const reply of this.sseUvcConnections) reply.raw.end();
            for (const reply of this.sseCustomConnections) reply.raw.end();
            
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
