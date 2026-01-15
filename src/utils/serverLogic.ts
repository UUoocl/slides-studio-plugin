import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import { Message } from 'node-osc';

import type slidesStudioPlugin from '../main'; 
import { SaveFileBody, FileListQuery, GetFileQuery, OscSendBody, MidiSendBody, MidiPayload } from '../types';
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
    private sseOscConnections: Set<FastifyReply> = new Set();
    private sseMidiConnections: Set<FastifyReply> = new Set();
    private obsServer: ObsServer | null = null;

    constructor(app: App, plugin: slidesStudioPlugin, port: number) {
        this.app = app;
        this.plugin = plugin;
        this.port = port;
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
        // ✅ Removed async keyword as no await is used inside
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
                // Using synchronous write here for safety within the async route
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                return { success: true, path: fullPath };
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(500).send({ error: msg });
            }
        });

        // --- API: Generic File List ---
        // ✅ Removed async keyword as no await is used inside
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
        // ✅ Removed async keyword as no await is used inside
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

        // --- SSE: OSC Events ---
        this.server.get('/api/osc/events', (request, reply) => {
            reply.raw.setHeader('Content-Type', 'text/event-stream');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');
            reply.raw.flushHeaders();

            this.sseOscConnections.add(reply);

            request.raw.on('close', () => {
                this.sseOscConnections.delete(reply);
            });
        });

        // --- SSE: MIDI Events ---
        this.server.get('/api/midi/events', (request, reply) => {
            reply.raw.setHeader('Content-Type', 'text/event-stream');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');
            reply.raw.flushHeaders();

            this.sseMidiConnections.add(reply);

            request.raw.on('close', () => {
                this.sseMidiConnections.delete(reply);
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

        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            new Notice(`Slides Studio Server started on port ${this.port}`);
        } catch (err) {
            console.error("Failed to start Fastify server", err);
            this.isRunning = false;
        }
    }

    /**
     * Broadcasts an OSC message to all connected SSE clients.
     * The device name is used as the SSE event name.
     * @param deviceName - The name of the device sending the message.
     * @param message - The OSC message payload.
     */
    public broadcastOscMessage(deviceName: string, message: unknown[]): void {
        const payload = JSON.stringify({ deviceName, message });
        const data = `event: ${deviceName}\ndata: ${payload}\n\n`;

        for (const reply of this.sseOscConnections) {
            reply.raw.write(data);
        }
    }

    /**
     * Broadcasts a MIDI message to all connected SSE clients.
     * The device name is used as the SSE event name.
     * @param deviceName - The name of the device sending the message.
     * @param message - The MIDI message payload.
     */
    public broadcastMidiMessage(deviceName: string, message: MidiPayload): void {
        const payload = JSON.stringify({ deviceName, message });
        const data = `event: ${deviceName}\ndata: ${payload}\n\n`;

        for (const reply of this.sseMidiConnections) {
            reply.raw.write(data);
        }
    }

    /**
     * Stops the server and closes all active SSE connections.
     */
    public async stop(): Promise<void> {
        if (this.server) {
            for (const reply of this.sseOscConnections) {
                reply.raw.end();
            }
            this.sseOscConnections.clear();

            for (const reply of this.sseMidiConnections) {
                reply.raw.end();
            }
            this.sseMidiConnections.clear();
            
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