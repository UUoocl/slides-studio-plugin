/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type slidesStudioPlugin from '../main';

export class ObsServer {
    private plugin: slidesStudioPlugin;
    private sseConnections: Set<FastifyReply> = new Set();
    private boundHandlers: Map<string, (...args: unknown[]) => void> = new Map();

    constructor(plugin: slidesStudioPlugin) {
        this.plugin = plugin;
    }

    public registerRoutes(server: FastifyInstance) {
        // SSE Endpoint
        server.get('/api/v1/obs/events', (request: FastifyRequest, reply: FastifyReply) => {
            reply.raw.setHeader('Content-Type', 'text/event-stream');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');
            reply.raw.flushHeaders();

            this.sseConnections.add(reply);

            // Send initial status if connected
            if (this.plugin.isObsConnected) {
                this.sendEvent(reply, 'ConnectionOpened', {});
                this.sendEvent(reply, 'Identified', {});
            }

            request.raw.on('close', () => {
                this.sseConnections.delete(reply);
            });
        });

        // Check connection status
        server.get('/api/v1/obs/isconnected', async (_request, _reply) => {
            return { connected: this.plugin.isObsConnected };
        });

        // Proxy OBS calls
        server.post<{ Params: { name: string }, Body: Record<string, unknown> }>('/api/v1/obs/:name', async (request, reply) => {
            const { name } = request.params;
            const data = request.body || {};

            if (!this.plugin.isObsConnected) {
                return reply.code(503).send({ error: 'OBS not connected' });
            }

            try {
                // request.body should be the arguments object for the call
                const result = await this.plugin.obs.call(name as any, data as any);
                return result || {};
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                return reply.code(500).send({ error: msg });
            }
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        if (this.boundHandlers.size > 0) return; // Already setup

        const events = ['CustomEvent', 'ConnectionOpened', 'ConnectionClosed', 'Identified'];
        
        events.forEach(event => {
            const handler = (data: unknown) => this.broadcast(event, data);
            this.boundHandlers.set(event, handler as (...args: unknown[]) => void);
            this.plugin.obs.on(event as any, handler as any);
        });
    }

    public cleanup() {
        // Remove listeners
        for (const [event, handler] of this.boundHandlers) {
            this.plugin.obs.off(event as any, handler as any);
        }
        this.boundHandlers.clear();
        
        // Close SSE connections
        for (const reply of this.sseConnections) {
            reply.raw.end();
        }
        this.sseConnections.clear();
    }

    private broadcast(event: string, data: unknown) {
        for (const reply of this.sseConnections) {
            this.sendEvent(reply, event, data);
        }
    }

    private sendEvent(reply: FastifyReply, event: string, data: unknown) {
        try {
            const payload = JSON.stringify(data || {});
            reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
        } catch {
            this.sseConnections.delete(reply);
        }
    }
}
