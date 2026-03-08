import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import { Message } from 'node-osc';
import { spawn, ChildProcess } from 'child_process';
import * as scServer from 'socketcluster-server';
import { WebSocketServer } from 'ws';

import type slidesStudioPlugin from '../main'; 
import { SaveFileBody, FileListQuery, GetFileQuery, OscSendBody, MidiSendBody, MidiPayload, CustomMessageBody } from '../types';
import { ObsServer } from './obsEndpoints';

interface QueuedObsRequest {
    requestType?: string;
    requestData?: any;
    requests?: any[];
    options?: any;
    scRequest: {
        end: (data?: any) => void;
        error: (err: any) => void;
    };
}

/**
 * Manages the local Fastify and SocketCluster server.
 * Handles file operations, API endpoints, and real-time bidirectional messaging.
 */
export class ServerManager {
    private app: App;
    private plugin: slidesStudioPlugin;
    private server: FastifyInstance | null = null;
    private scServer: scServer.AGServer | null = null;
    private port: number;
    private isRunning = false;
    
    private obsServer: ObsServer | null = null;
    private clientMetadata = new Map<string, { name: string }>();

    private mouseMonitorProcess: ChildProcess | null = null;
    private keyboardMonitorProcess: ChildProcess | null = null;
    private uvcUtilBridgeProcess: ChildProcess | null = null;

    private obsRequestQueue: QueuedObsRequest[] = [];
    private obsQueueTimer: NodeJS.Timeout | null = null;

    constructor(app: App, plugin: slidesStudioPlugin, port: number) {
        this.app = app;
        this.plugin = plugin;
        this.port = port;
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

        this.server = fastify();

        // Set security headers globally
        this.server.addHook('preHandler', async (request, reply) => {
            reply.header('X-Frame-Options', 'ALLOWALL');
            reply.header('Access-Control-Allow-Origin', '*');
            reply.header('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:; media-src *;");
        });

        await this.server.register(fastifyCors, { origin: '*' });

        // Register static serving
        void this.server.register(fastifyStatic, {
            root: [libFolder, appFolder, basePath],
            prefix: '/', 
            setHeaders: (res, path) => {
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:; media-src *;");
                
                if (path.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript');
                else if (path.endsWith('.task')) res.setHeader('Content-Type', 'application/octet-stream');
                else if (path.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
            }
        });

        this.obsServer = new ObsServer(this.plugin);
        this.obsServer.registerRoutes(this.server);

        this.registerApiRoutes();

        // Debug upgrade requests
        this.server.server.on('upgrade', (req, socket, head) => {
            console.warn(`[Server] Incoming UPGRADE request for ${req.url} from ${req.headers.origin}`);
        });

        try {
            // Attach SocketCluster to the same HTTP server
            // We pass the WebSocketServer constructor explicitly.
            // @ts-ignore
            this.scServer = scServer.attach(this.server.server, {
                wsEngine: { Server: WebSocketServer },
                path: '/socketcluster/',
                origins: '*:*',
                allowClientPublish: true
            });
            
            void this.handleSocketClusterConnections();
            
            // Critical: Intercept all client-side publishes via middleware
            // This is the most reliable way to catch publishes to the exchange.
            // @ts-ignore
            this.scServer.setMiddleware(this.scServer.MIDDLEWARE_INBOUND, async (middlewareStream) => {
                for await (const action of middlewareStream) {
                    // console.warn(`[Server] Middleware action: ${action.type} on ${action.channel}`);
                    if (action.type === action.PUBLISH_IN || action.type === 'publish' || action.type === 1) {
                        this.handleIncomingPublish(action.channel, action.data);
                    }
                    action.allow();
                }
            });

            // setup device channels for visibility and internal consumption
            void this.setupDeviceChannels();

            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            
            this.isRunning = true;
            console.warn(`[Server] Listening on http://127.0.0.1:${this.port} (Fastify + SocketCluster)`);
            
            // Broadcast initial state so plugin shows up in monitor
            this.broadcastServerState();

            if (this.plugin.settings.mouseMonitorEnabled) void this.startMouseMonitor();
            if (this.plugin.settings.keyboardMonitorEnabled) void this.startKeyboardMonitor();
            if (this.plugin.settings.uvcUtilEnabled) void this.startUvcUtilBridge();

            this.startObsQueueProcessor();
        } catch (err) {
            console.error("Failed to start server", err);
            this.isRunning = false;
        }
    }

    private registerApiRoutes(): void {
        if (!this.server) return;

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

        this.server.get('/api/audio/stt-devices', async () => {
            return this.plugin.settings.audioDevices.filter(d => d.sttEnabled);
        });

        this.server.get('/api/obswss', (_request, _reply) => {
            const settings = this.plugin.settings;
            return {
                IP: settings.websocketIP_Text || "127.0.0.1",
                PORT: parseInt(settings.websocketPort_Text) || 4455,
                PW: settings.websocketPW_Text || ""
            };
        });

        this.server.get('/api/devices', (_request, _reply) => {
            return {
                osc: this.plugin.settings.oscDevices.map(d => ({ name: d.name })),
                midi: this.plugin.settings.midiDevices.map(d => ({ name: d.name })),
                gamepad: this.plugin.settings.gamepadDevices.map(d => ({ name: d.name, index: d.index })),
                uvc: { enabled: this.plugin.settings.uvcUtilEnabled }
            };
        });

        this.server.get('/api/gamepads', (_request, _reply) => {
            return this.plugin.settings.gamepadDevices;
        });

        this.server.post<{ Body: SaveFileBody }>('/api/file/save', async (request, reply) => {
            const { folder, filename, data } = request.body;
            const adapter = this.app.vault.adapter;
            if (!(adapter instanceof FileSystemAdapter)) return reply.code(500).send({ error: "No FS adapter" });
            const basePath = adapter.getBasePath();
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

        this.server.get<{ Querystring: FileListQuery }>('/api/file/list', (request, reply) => {
            const adapter = this.app.vault.adapter;
            if (!(adapter instanceof FileSystemAdapter)) return reply.code(500).send({ error: "No FS adapter" });
            const targetDir = path.join(adapter.getBasePath(), request.query.folder);
            if (!fs.existsSync(targetDir)) return reply.send([]);
            return reply.send(fs.readdirSync(targetDir).filter(f => f.endsWith('.json')));
        });

        this.server.get<{ Querystring: GetFileQuery }>('/api/file/get', (request, reply) => {
            const adapter = this.app.vault.adapter;
            if (!(adapter instanceof FileSystemAdapter)) return reply.code(500).send({ error: "No FS adapter" });
            const fullPath = path.join(adapter.getBasePath(), request.query.folder, request.query.filename);
            if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: "Not found" });
            return reply.send(JSON.parse(fs.readFileSync(fullPath, 'utf-8')));
        });

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
    }

    private startObsQueueProcessor(): void {
        if (this.obsQueueTimer) return;

        const processQueue = async () => {
            if (this.obsRequestQueue.length === 0) {
                this.obsQueueTimer = setTimeout(processQueue, 100);
                return;
            }

            // Get batch of requests
            const limit = Math.max(1, this.plugin.settings.obsRequestLimit || 10);
            const interval = 1000 / limit;

            const startTime = Date.now();
            
            const batch = this.obsRequestQueue.splice(0, this.obsRequestQueue.length);
            
            if (batch.length === 1 && !batch[0].requests) {
                // Single request
                const item = batch[0];
                try {
                    const result = await this.plugin.obs.call(item.requestType as any, item.requestData);
                    item.scRequest.end(result);
                } catch (err) {
                    item.scRequest.error(err);
                }
            } else {
                // Multiple requests - bundle into CallBatch
                const obsRequests: any[] = [];
                const requestMap: number[] = []; // Maps batch index to obsRequests index

                batch.forEach((item, index) => {
                    if (item.requests) {
                        // It's already a batch from the client
                        item.requests.forEach(r => {
                            obsRequests.push(r);
                            requestMap.push(index);
                        });
                    } else {
                        obsRequests.push({
                            requestType: item.requestType,
                            requestData: item.requestData
                        });
                        requestMap.push(index);
                    }
                });

                try {
                    const results = await this.plugin.obs.callBatch(obsRequests);
                    
                    // Map results back to SC requests
                    const scResults = new Array(batch.length).fill(null).map(() => [] as any[]);
                    results.forEach((res, idx) => {
                        const batchIdx = requestMap[idx];
                        scResults[batchIdx].push(res);
                    });

                    batch.forEach((item, idx) => {
                        if (item.requests) {
                            item.scRequest.end(scResults[idx]);
                        } else {
                            item.scRequest.end(scResults[idx][0]);
                        }
                    });
                } catch (err) {
                    batch.forEach(item => item.scRequest.error(err));
                }
            }

            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, interval - elapsed);
            this.obsQueueTimer = setTimeout(processQueue, waitTime);
        };

        void processQueue();
    }

    private async handleSocketClusterConnections(): Promise<void> {
        if (!this.scServer) return;

        // Log potential errors
        void (async () => {
            for await (const {error} of this.scServer!.listener('error')) {
                console.error(`[SocketCluster] Server error:`, error);
            }
        })();

        // Log handshake attempts
        void (async () => {
            for await (const {socket} of this.scServer!.listener('handshake')) {
                console.warn(`[SocketCluster] Handshake initiated: ${socket.id}`);
            }
        })();

        for await (const { socket } of this.scServer.listener('connection')) {
            console.warn(`[SocketCluster] Client connected: ${socket.id}`);
            this.broadcastServerState();

            void (async () => {
                // @ts-ignore
                for await (const request of socket.procedure('setInfo')) {
                    const data = request.data as { name: string };
                    this.clientMetadata.set(socket.id, { name: data.name || 'Unknown' });
                    this.broadcastServerState();
                    request.end();
                }
            })();

            void (async () => {
                // @ts-ignore
                for await (const request of socket.procedure('obsRequest')) {
                    const reqData = request.data as any;
                    this.obsRequestQueue.push({
                        requestType: reqData.requestType,
                        requestData: reqData.requestData,
                        requests: reqData.requests,
                        options: reqData.options,
                        scRequest: request
                    });
                }
            })();

            void (async () => {
                // @ts-ignore
                for await (const request of socket.procedure('uvcCommand')) {
                    void this.scServer?.exchange.transmitPublish('uvcCommands', request.data);
                    request.end();
                }
            })();

            // Handle 'uvcResponse' emits (from Python bridge)
            void (async () => {
                // @ts-ignore
                for await (const data of socket.receiver('uvcResponse')) {
                    void this.scServer?.exchange.transmitPublish('uvcResponse', data);
                }
            })();

            // Listen for subscriptions
            void (async () => {
                for await (const { channel } of socket.listener('subscribe')) {
                    console.warn(`[SocketCluster] Client ${socket.id} subscribed to ${channel}`);
                    this.broadcastServerState();
                }
            })();

            void (async () => {
                for await (const { channel } of socket.listener('unsubscribe')) {
                    console.warn(`[SocketCluster] Client ${socket.id} unsubscribed from ${channel}`);
                    this.broadcastServerState();
                }
            })();

            void (async () => {
                for await (const { code, reason } of socket.listener('close')) {
                    console.warn(`[SocketCluster] Client disconnected: ${socket.id} (Code: ${code}, Reason: ${reason})`);
                    this.clientMetadata.delete(socket.id);
                    this.broadcastServerState();
                }
            })();
        }
    }

    /**
     * Subscribes the plugin itself to all 'out' channels.
     * This makes the plugin a "real" subscriber on the exchange.
     */
    private async setupDeviceChannels() {
        if (!this.scServer) return;
        
        const outChannels = [
            ...this.plugin.settings.oscDevices.map(d => `osc_out_${d.name}`),
            ...this.plugin.settings.midiDevices.map(d => `midi_out_${d.name}`),
            ...this.plugin.settings.gamepadDevices.map(d => `gamepad_in_${d.name}`)
        ];

        console.warn(`[Server] Plugin subscribing to:`, outChannels);

        for (const channelName of outChannels) {
            void (async () => {
                const channel = this.scServer!.exchange.subscribe(channelName);
                for await (const data of channel) {
                    // Logic handled here when server is a real subscriber
                    this.handleIncomingPublish(channelName, data);
                }
            })();
        }
    }

    private broadcastServerState(): void {
        if (!this.scServer) return;
        
        const clients = Object.values(this.scServer.clients).map((socket, index) => {
            return {
                index: index + 1,
                id: socket.id,
                name: this.clientMetadata.get(socket.id)?.name || 'Unknown',
                channels: socket.subscriptions()
            };
        });

        // Add the plugin itself as a virtual client for the monitor
        clients.push({
            index: 0,
            id: 'plugin-internal',
            name: 'Slides-Studio Plugin',
            channels: [
                ...this.plugin.settings.oscDevices.map(d => `osc_out_${d.name}`),
                ...this.plugin.settings.midiDevices.map(d => `midi_out_${d.name}`),
                ...this.plugin.settings.gamepadDevices.map(d => `gamepad_in_${d.name}`)
            ]
        });

        void this.scServer.exchange.transmitPublish('serverState', { clients });
    }

    private handleIncomingPublish(channel: string, data: unknown): void {
        if (!data) return;

        if (channel.startsWith('osc_out_')) {
            const deviceName = channel.replace('osc_out_', '');
            const payload = data as { address: string, args: any };
            
            if (payload && payload.address) {
                const message = new Message(payload.address);
                if (Array.isArray(payload.args)) {
                    payload.args.forEach(arg => message.append(arg));
                } else if (payload.args !== undefined) {
                    message.append(payload.args);
                }
                this.plugin.oscManager.sendMessage(deviceName, message);
            }
        } else if (channel.startsWith('midi_out_')) {
            const deviceName = channel.replace('midi_out_', '');
            this.plugin.midiManager.sendMidiMessage(deviceName, this.plugin.settings.midiDevices, data as MidiPayload);
        } else if (channel === 'mousePosition' || channel === 'mouseClick' || channel === 'mouseScroll' || 
                   channel === 'keyboardPress' || channel === 'keyboardRelease' || channel === 'uvcResponse' || 
                   channel === 'uvcCommands') {
            void this.scServer?.exchange.transmitPublish(channel, data);
        }
    }

    public broadcastObsEvent(eventName: string, eventData: unknown): void {
        // Publish to event-specific channel
        void this.scServer?.exchange.transmitPublish(`obs:${eventName}`, eventData);
        // Also publish to a general events channel
        void this.scServer?.exchange.transmitPublish('obsEvents', { eventName, eventData });
    }

    public broadcastOscMessage(name: string, message: unknown[]): void {
        const data = { deviceName: name, message };
        void this.scServer?.exchange.transmitPublish(`osc_in_${name}`, data);
    }

    public broadcastMidiMessage(name: string, message: MidiPayload): void {
        const data = { deviceName: name, message };
        void this.scServer?.exchange.transmitPublish(`midi_in_${name}`, data);
    }

    public broadcastMouseMessage(topic: string, data: unknown): void {
        void this.scServer?.exchange.transmitPublish(topic, data);
    }

    public broadcastKeyboardMessage(topic: string, data: unknown): void {
        void this.scServer?.exchange.transmitPublish(topic, data);
    }

    public broadcastAudioMessage(topic: string, deviceName: string, data: unknown): void {
        const payload: Record<string, unknown> = { device: deviceName };
        if (topic === 'audioFFT') payload.fft = data;
        else if (topic === 'audioSTT') payload.stt = data;
        else payload.data = data;
        
        const channel = topic === 'audioFFT' ? 'audioFFT' : (topic === 'audioSTT' ? 'audioSTT' : 'audioData');
        void this.scServer?.exchange.transmitPublish(channel, payload);
    }

    public broadcastGamepadMessage(name: string, data: unknown): void {
        void this.scServer?.exchange.transmitPublish(`gamepad_in_${name}`, data);
    }

    public broadcastMediaPipeMessage(name: string, data: unknown): void {
        void this.scServer?.exchange.transmitPublish(`mediapipe_in_${name}`, data);
    }

    public broadcastCustomMessage(name: string, data: Record<string, unknown>): void {
        void this.scServer?.exchange.transmitPublish(`custom_${name}`, data);
    }

    public broadcastUvcMessage(data: unknown): void {
        void this.scServer?.exchange.transmitPublish('uvcResponse', data);
    }

    // --- Python Monitors ---

    public async startMouseMonitor(): Promise<void> {
        if (this.mouseMonitorProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const scriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/mouse_monitor.py');
        const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
        const args = [
            scriptPath, 
            url, 
            this.plugin.settings.mouseMonitorPosition ? '1' : '0', 
            this.plugin.settings.mouseMonitorClicks ? '1' : '0', 
            this.plugin.settings.mouseMonitorScroll ? '1' : '0'
        ];
        this.mouseMonitorProcess = spawn(this.plugin.settings.pythonPath || 'python3', args);
        this.setupProcessLogging(this.mouseMonitorProcess, 'MouseMonitor');
    }

    public async startKeyboardMonitor(): Promise<void> {
        if (this.keyboardMonitorProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const scriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/keyboard_monitor.py');
        const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
        const args = [scriptPath, url, this.plugin.settings.keyboardMonitorShowCombinations ? '1' : '0'];
        this.keyboardMonitorProcess = spawn(this.plugin.settings.pythonPath || 'python3', args);
        this.setupProcessLogging(this.keyboardMonitorProcess, 'KeyboardMonitor');
    }

    public async startUvcUtilBridge(): Promise<void> {
        if (this.uvcUtilBridgeProcess) return;
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        const scriptPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, 'pythonScripts/uvc-util/uvc_util_bridge.py');
        let libPath = this.plugin.settings.uvcUtilLibPath;
        if (!path.isAbsolute(libPath)) libPath = path.join(adapter.getBasePath(), this.plugin.manifest.dir, libPath);
        const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
        this.uvcUtilBridgeProcess = spawn(this.plugin.settings.pythonPath || 'python3', [scriptPath, "--url", url, "--lib", libPath]);
        this.setupProcessLogging(this.uvcUtilBridgeProcess, 'UvcUtilBridge');
    }

    private setupProcessLogging(process: ChildProcess, name: string): void {
        process.stdout?.on('data', (data) => console.log(`[${name}] ${data}`));
        process.stderr?.on('data', (data) => console.error(`[${name}] ERR: ${data}`));
        process.on('close', (code) => console.warn(`[${name}] Process exited with code ${code}`));
        process.on('error', (err) => console.error(`[${name}] Failed to start:`, err));
    }

    public stopMouseMonitor(): void { this.mouseMonitorProcess?.kill(); this.mouseMonitorProcess = null; }
    public stopKeyboardMonitor(): void { this.keyboardMonitorProcess?.kill(); this.keyboardMonitorProcess = null; }
    public stopUvcUtilBridge(): void { this.uvcUtilBridgeProcess?.kill(); this.uvcUtilBridgeProcess = null; }

    public async restartMouseMonitor(): Promise<void> { this.stopMouseMonitor(); await new Promise(r => setTimeout(r, 500)); await this.startMouseMonitor(); }
    public async restartKeyboardMonitor(): Promise<void> { this.stopKeyboardMonitor(); await new Promise(r => setTimeout(r, 500)); await this.startKeyboardMonitor(); }
    public async restartUvcUtilBridge(): Promise<void> { this.stopUvcUtilBridge(); await new Promise(r => setTimeout(r, 500)); await this.startUvcUtilBridge(); }

    public async stop(): Promise<void> {
        this.stopMouseMonitor();
        this.stopKeyboardMonitor();
        this.stopUvcUtilBridge();

        if (this.obsQueueTimer) {
            clearTimeout(this.obsQueueTimer);
            this.obsQueueTimer = null;
        }
        
        if (this.scServer) {
            await this.scServer.close();
            this.scServer = null;
        }

        if (this.server) {
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
