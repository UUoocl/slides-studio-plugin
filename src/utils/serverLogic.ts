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
import type { OBSRequestTypes } from 'obs-websocket-js';

import type slidesStudioPlugin from '../main'; 
import { SaveFileBody, FileListQuery, GetFileQuery, OscSendBody, MidiSendBody, MidiPayload, CustomMessageBody } from '../types';
import { ObsServer } from './obsEndpoints';

interface ScRequest {
    end: (data?: unknown) => void;
    error: (err: unknown) => void;
    data: unknown;
}

interface QueuedObsRequest {
    requestType?: string;
    requestData?: unknown;
    requests?: unknown[];
    options?: unknown;
    scRequest: ScRequest;
}

interface IncomingObsRequest {
    requestType?: string;
    requestData?: unknown;
    requests?: unknown[];
    options?: unknown;
}

interface ScMiddlewareAction {
    type: unknown;
    channel: string;
    data: unknown;
    PUBLISH_IN: unknown;
    allow: () => void;
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
    private obsQueueTimer: ReturnType<typeof setTimeout> | null = null;

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
        const pluginFolder = path.join(basePath, pluginManifest.dir);
        const libFolder = path.join(pluginFolder, 'lib');
        const appFolder = path.join(pluginFolder, 'slide-studio-app');

        this.server = fastify();

        // Set security headers globally
        this.server.addHook('preHandler', async (request, reply) => {
            reply.header('X-Frame-Options', 'ALLOWALL');
            reply.header('Access-Control-Allow-Origin', '*');
            reply.header('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval' blob:; img-src * data:; media-src *;");
        });

        await this.server.register(fastifyCors, { origin: '*' });

        // Register static serving
        void this.server.register(fastifyStatic, {
            root: [libFolder, appFolder, pluginFolder, basePath],
            prefix: '/', 
            setHeaders: (res, path) => {
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Security-Policy', "frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval' blob:; img-src * data:; media-src *;");
                
                if (path.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript');
                else if (path.endsWith('.task')) res.setHeader('Content-Type', 'application/octet-stream');
                else if (path.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
            }
        });

        this.obsServer = new ObsServer(this.plugin);
        this.obsServer.registerRoutes(this.server);

        this.registerApiRoutes();

        // Debug upgrade requests
        this.server.server.on('upgrade', (req, _socket, _head) => {
            console.warn(`[Server] Incoming UPGRADE request for ${req.url} from ${req.headers.origin}`);
        });

        try {
            // Attach SocketCluster to the same HTTP server
            // We pass the WebSocketServer constructor explicitly
            this.scServer = scServer.attach(this.server.server, {
                wsEngine: { Server: WebSocketServer },
                path: '/socketcluster/',
                origins: '*:*',
                allowClientPublish: true
            });
            
            void this.handleSocketClusterConnections();
            
            // Critical: Intercept all client-side publishes via middleware
            // This is the most reliable way to catch publishes to the exchange
            this.scServer.setMiddleware(this.scServer.MIDDLEWARE_INBOUND, (middlewareStream: scServer.AGMiddlewareStream) => {
                void (async () => {
                    for await (const action of middlewareStream) {
                        const scAction = action as unknown as ScMiddlewareAction;
                        if (scAction.type === scAction.PUBLISH_IN || scAction.type === 'publish' || scAction.type === 1) {
                            this.handleIncomingPublish(scAction.channel, scAction.data);
                        }
                        scAction.allow();
                    }
                })();
            });

            // setup device channels for visibility and internal consumption
            void this.setupDeviceChannels();

            await this.server.listen({ port: this.port, host: '0.0.0.0' });
            
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
                this.obsQueueTimer = setTimeout(() => { void processQueue(); }, 100);
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
                    const reqType = item.requestType as keyof OBSRequestTypes;
                    const reqData = item.requestData as OBSRequestTypes[keyof OBSRequestTypes];
                    const result = await this.plugin.obs.call(reqType, reqData);
                    item.scRequest.end(result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    // Handle common missing item errors gracefully for metadata queries
                    if (item.requestType === "GetSceneItemList" && msg.includes("No source was found")) {
                        item.scRequest.end({ sceneItems: [] });
                    } else if (item.requestType === "GetInputSettings" && msg.includes("No source was found")) {
                        item.scRequest.end({ inputSettings: {} });
                    } else {
                        item.scRequest.error(err);
                    }
                }
            } else {
                // Multiple requests - bundle into CallBatch
                const obsRequests: { requestType: keyof OBSRequestTypes, requestData?: unknown }[] = [];
                const requestMap: number[] = []; // Maps batch index to obsRequests index

                batch.forEach((item, index) => {
                    if (item.requests) {
                        // It's already a batch from the client
                        item.requests.forEach(r => {
                            obsRequests.push(r as { requestType: keyof OBSRequestTypes, requestData?: unknown });
                            requestMap.push(index);
                        });
                    } else {
                        obsRequests.push({
                            requestType: item.requestType as keyof OBSRequestTypes,
                            requestData: item.requestData
                        });
                        requestMap.push(index);
                    }
                });

                try {
                    const results = await this.plugin.obs.callBatch(
                        obsRequests as unknown as Parameters<typeof this.plugin.obs.callBatch>[0],
                        { haltOnFailure: false }
                    );
                    
                    // Map results back to SC requests
                    const scResults = new Array(batch.length).fill(null).map(() => [] as unknown[]);
                    results.forEach((res, idx) => {
                        const batchIdx = requestMap[idx];
                        scResults[batchIdx].push(res);
                    });

                    batch.forEach((item, idx) => {
                        const resList = scResults[idx];
                        if (item.requests) {
                            item.scRequest.end(resList);
                        } else {
                            const res = resList[0] as any;
                            // Handle common missing item errors gracefully for metadata queries in batch
                            if (!res.requestStatus.result && 
                                (item.requestType === "GetSceneItemList" || item.requestType === "GetInputSettings") && 
                                res.error?.includes("No source was found")) {
                                if (item.requestType === "GetSceneItemList") item.scRequest.end({ sceneItems: [] });
                                else item.scRequest.end({ inputSettings: {} });
                            } else if (!res.requestStatus.result) {
                                item.scRequest.error(res.error || `OBS Request failed with code ${res.requestStatus.code}`);
                            } else {
                                // For single requests, return only the responseData to match obs.call() behavior
                                item.scRequest.end(res.responseData);
                            }
                        }
                    });
                } catch (err) {
                    batch.forEach(item => item.scRequest.error(err));
                }
            }

            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, interval - elapsed);
            this.obsQueueTimer = setTimeout(() => { void processQueue(); }, waitTime);
        };

        void processQueue();
    }

    private async handleSocketClusterConnections(): Promise<void> {
        if (!this.scServer) return;

        // Log potential errors
        void (async () => {
            for await (const {error} of this.scServer.listener('error')) {
                console.error(`[SocketCluster] Server error:`, error);
            }
        })();

        // Log handshake attempts
        void (async () => {
            for await (const {socket} of this.scServer.listener('handshake')) {
                console.warn(`[SocketCluster] Handshake initiated: ${socket.id}`);
            }
        })();

        for await (const { socket } of this.scServer.listener('connection')) {
            console.warn(`[SocketCluster] Client connected: ${socket.id}`);
            
            // Capture client name from authToken if provided during handshake
            const authToken = socket.authToken as { name?: string } | null;
            if (authToken?.name) {
                const name = authToken.name;
                console.warn(`[SocketCluster] Client ${socket.id} identified as: ${name}`);
                this.clientMetadata.set(socket.id, { name });
            }

            this.broadcastServerState();

            void (async () => {
                for await (const request of socket.procedure('setInfo')) {
                    const scReq = request as unknown as ScRequest;
                    const data = scReq.data as { name: string };
                    console.warn(`[SocketCluster] Client ${socket.id} updated name to: ${data.name}`);
                    this.clientMetadata.set(socket.id, { name: data.name || 'Unknown' });
                    this.broadcastServerState();
                    scReq.end();
                }
            })();

            void (async () => {
                for await (const request of socket.procedure('isObsConnected')) {
                    const scReq = request as unknown as ScRequest;
                    scReq.end({ connected: this.plugin.isObsConnected });
                }
            })();

            void (async () => {
                for await (const request of socket.procedure('obsRequest')) {
                    const scReq = request as unknown as ScRequest;
                    const reqData = scReq.data as IncomingObsRequest;
                    this.obsRequestQueue.push({
                        requestType: reqData.requestType,
                        requestData: reqData.requestData,
                        requests: reqData.requests,
                        options: reqData.options,
                        scRequest: scReq
                    });
                }
            })();

            void (async () => {
                for await (const request of socket.procedure('uvcCommand')) {
                    const scReq = request as unknown as ScRequest;
                    void this.scServer?.exchange.transmitPublish('uvcCommands', scReq.data);
                    scReq.end();
                }
            })();

            // Handle 'uvcResponse' emits (from Python bridge)
            void (async () => {
                for await (const data of socket.receiver('uvcResponse')) {
                    console.warn("[Server] Received uvcResponse emit from bridge:", data);
                    void this.scServer?.exchange.transmitPublish('uvcResponse', data);
                    this.plugin.handleUvcResponse(data as { action: string, data: unknown[] });
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
            ...this.plugin.settings.oscDevices.map(d => `osc/out/${d.name}`),
            ...this.plugin.settings.midiDevices.map(d => `midi/out/${d.name}`),
            ...this.plugin.settings.gamepadDevices.map(d => `gamepad/in/${d.name}`),
            ...this.plugin.settings.uvcDevices.filter(d => d.enabled).map(d => `uvc/out/${d.name}`),
            // Legacy support (to be removed in Phase 4)
            ...this.plugin.settings.oscDevices.map(d => `osc_out_${d.name}`),
            ...this.plugin.settings.midiDevices.map(d => `midi_out_${d.name}`)
        ];

        console.warn(`[Server] Plugin subscribing to:`, outChannels);

        for (const channelName of outChannels) {
            void (async () => {
                const channel = this.scServer?.exchange.subscribe(channelName);
                if (channel) {
                    for await (const data of channel) {
                        // Logic handled here when server is a real subscriber
                        this.handleIncomingPublish(channelName, data);
                    }
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
                ...this.plugin.settings.oscDevices.map(d => `osc/out/${d.name}`),
                ...this.plugin.settings.midiDevices.map(d => `midi/out/${d.name}`),
                ...this.plugin.settings.gamepadDevices.map(d => `gamepad/in/${d.name}`)
            ]
        });

        void this.scServer.exchange.transmitPublish('serverState', { clients });
    }

    private handleIncomingPublish(channel: string, data: unknown): void {
        if (!data) return;

        if (channel.startsWith('osc/out/') || channel.startsWith('osc_out_')) {
            const deviceName = channel.replace('osc/out/', '').replace('osc_out_', '');
            const payload = data as { address: string, args: unknown };
            
            if (payload && payload.address) {
                const message = new Message(payload.address);
                if (Array.isArray(payload.args)) {
                    payload.args.forEach(arg => message.append(arg as string | number | boolean));
                } else if (payload.args !== undefined) {
                    message.append(payload.args as string | number | boolean);
                }
                this.plugin.oscManager.sendMessage(deviceName, message);
            }
        } else if (channel.startsWith('midi/out/') || channel.startsWith('midi_out_')) {
            const deviceName = channel.replace('midi/out/', '').replace('midi_out_', '');
            this.plugin.midiManager.sendMidiMessage(deviceName, this.plugin.settings.midiDevices, data as MidiPayload);
        } else if (channel === 'mouse/position' || channel === 'mouse/click' || channel === 'mouse/scroll' || 
                   channel === 'keyboard/press' || channel === 'keyboard/release' || channel === 'uvc/response' || 
                   channel === 'uvc/commands' || 
                   // Legacy support
                   channel === 'mousePosition' || channel === 'mouseClick' || channel === 'mouseScroll' || 
                   channel === 'keyboardPress' || channel === 'keyboardRelease' || channel === 'uvcResponse' || 
                   channel === 'uvcCommands') {
            
            // Re-publish to the new hierarchical channel if it's a legacy one
            let targetChannel = channel;
            if (channel === 'mousePosition') targetChannel = 'mouse/position';
            else if (channel === 'mouseClick') targetChannel = 'mouse/click';
            else if (channel === 'mouseScroll') targetChannel = 'mouse/scroll';
            else if (channel === 'keyboardPress') targetChannel = 'keyboard/press';
            else if (channel === 'keyboardRelease') targetChannel = 'keyboard/release';
            else if (channel === 'uvcResponse') targetChannel = 'uvc/response';
            else if (channel === 'uvcCommands') targetChannel = 'uvc/commands';

            void this.scServer?.exchange.transmitPublish(targetChannel, data);
            if (targetChannel === 'uvc/response') {
                this.plugin.handleUvcResponse(data);
            }
        }
    }

    public broadcast(channel: string, data: unknown): void {
        void this.scServer?.exchange.transmitPublish(channel, data);
    }

    public broadcastObsEvent(eventName: string, eventData: unknown): void {
        // Publish to event-specific channel using hierarchical naming
        this.broadcast(`obs/event/${eventName}`, eventData);
        // Also publish to a general events channel
        this.broadcast('obs/events', { eventName, eventData });
    }

    public broadcastOscMessage(name: string, message: unknown[]): void {
        const data = { deviceName: name, message };
        this.broadcast(`osc/in/${name}`, data);
    }

    public broadcastMidiMessage(name: string, message: MidiPayload): void {
        const data = { deviceName: name, message };
        this.broadcast(`midi/in/${name}`, data);
    }

    public broadcastMouseMessage(topic: string, data: unknown): void {
        // Map legacy topics to hierarchical ones
        let channel = topic;
        if (topic === 'mousePosition') channel = 'mouse/position';
        else if (topic === 'mouseClick') channel = 'mouse/click';
        else if (topic === 'mouseScroll') channel = 'mouse/scroll';
        
        this.broadcast(channel, data);
    }

    public broadcastKeyboardMessage(topic: string, data: unknown): void {
        let channel = topic;
        if (topic === 'keyboardPress') channel = 'keyboard/press';
        else if (topic === 'keyboardRelease') channel = 'keyboard/release';
        
        this.broadcast(channel, data);
    }

    public broadcastAudioMessage(topic: string, deviceName: string, data: unknown): void {
        const payload: Record<string, unknown> = { device: deviceName };
        let channel = 'audio/data';
        
        if (topic === 'audioFFT') {
            payload.fft = data;
            channel = 'audio/fft';
        } else if (topic === 'audioSTT') {
            payload.stt = data;
            channel = 'audio/stt';
        } else {
            payload.data = data;
        }
        
        this.broadcast(channel, payload);
    }

    public broadcastGamepadMessage(name: string, data: unknown): void {
        this.broadcast(`gamepad/in/${name}`, data);
    }

    public broadcastMediaPipeMessage(name: string, data: unknown): void {
        this.broadcast(`mediapipe/in/${name}`, data);
    }

    public broadcastCustomMessage(name: string, data: Record<string, unknown>): void {
        this.broadcast(`custom/${name}`, data);
    }

    public broadcastUvcCommand(data: unknown): void {
        this.broadcast('uvc/commands', data);
    }

    public broadcastUvcMessage(data: unknown): void {
        this.broadcast('uvc/response', data);
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

        // Send initial configuration after a short delay to allow for connection
        this.uvcUtilBridgeProcess.on('spawn', () => {
            setTimeout(() => {
                this.broadcastUvcCommand({
                    action: "configure",
                    devices: this.plugin.settings.uvcDevices.filter(d => d.enabled)
                });
            }, 3000);
        });
    }

    private setupProcessLogging(process: ChildProcess, name: string): void {
        process.stdout?.on('data', (data) => console.warn(`[${name}] ${data}`));
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
