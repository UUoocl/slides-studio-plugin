import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type slidesStudioPlugin from '../main';
import { OBSRequestTypes, RequestBatchRequest, RequestBatchOptions } from 'obs-websocket-js';

export class ObsServer {
    private plugin: slidesStudioPlugin;

    constructor(plugin: slidesStudioPlugin) {
        this.plugin = plugin;
    }

    public registerRoutes(server: FastifyInstance) {
        // Check connection status
        server.get('/api/v1/obs/isconnected', async (_request, _reply) => {
            return { connected: this.plugin.isObsConnected };
        });

        // Proxy OBS batch calls
        server.post<{ Body: { requests: RequestBatchRequest[], options?: RequestBatchOptions } }>('/api/v1/obs/batch', async (request, reply) => {
            const { requests, options } = request.body;

            if (!this.plugin.isObsConnected) {
                console.warn("[ObsServer] Batch request failed: OBS not connected");
                return reply.code(503).send({ error: 'OBS not connected' });
            }

            try {
                const result = await this.plugin.enqueueObsRequest({ requests, options });
                return result || [];
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error("[ObsServer] Batch request error:", msg);
                return reply.code(500).send({ error: msg });
            }
        });

        // Proxy OBS calls
        server.post<{ Params: { name: string }, Body: Record<string, unknown> }>('/api/v1/obs/:name', async (request, reply) => {
            const { name } = request.params;
            const data = request.body || {};

            try {
                const result = await this.plugin.enqueueObsRequest({
                    requestType: name,
                    requestData: data
                });
                return result || {};
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);

                // Graceful handling for optional metadata fetches
                if (name === "GetSceneItemList") {
                    console.warn(`[ObsServer] Optional call to ${name} failed (Item likely missing):`, msg);
                    return { sceneItems: [] };
                }
                if (name === "GetInputSettings") {
                    console.warn(`[ObsServer] Optional call to ${name} failed (Input likely missing):`, msg);
                    return { inputSettings: {} };
                }

                console.error(`[ObsServer] Call to ${name} failed:`, msg);
                return reply.code(500).send({ error: msg });
            }
        });
    }

    public cleanup() {
        // No longer needed since SSE is removed, 
        // but kept for interface consistency
    }
}