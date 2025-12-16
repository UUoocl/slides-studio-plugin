import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';

export class ServerManager {
    private app: App;
    private server: FastifyInstance | null = null;
    private port: number;
    private isRunning: boolean = false;

    constructor(app: App, port: number) {
        this.app = app;
        this.port = port;
    }

    public async start() {
        if (this.isRunning) return;

        let basePath: string;
        if (this.app.vault.adapter instanceof FileSystemAdapter) {
            basePath = this.app.vault.adapter.getBasePath();
        } else {
            new Notice("Fastify Server: Cannot determine file system path.");
            return;
        }

        const pluginManifest = this.app.plugins.plugins['slides-studio'].manifest;
        const slidesFolder = path.join(basePath, `${pluginManifest.dir}/slides_studio`);
        const libFolder = path.join(basePath, `${pluginManifest.dir}/lib`);

        this.server = fastify();

        // Enable CORS
        await this.server.register(fastifyCors, { origin: true });

        // Serve Static Files
        this.server.register(fastifyStatic, {
            root: [slidesFolder, libFolder, basePath],
            prefix: '/', 
        });

        // --- API: Get OBS Credentials ---
        this.server.get('/api/obswss', async (request, reply) => {
            const settings = this.app.plugins.plugins['slides-studio'].settings;
            return {
                IP: settings.websocketIP_Text || "localhost",
                PORT: parseInt(settings.websocketPort_Text) || 4455,
                PW: settings.websocketPW_Text || ""
            };
        });

        // --- API: Generic File Save ---
        // Expects JSON body: { "folder": "FolderInVault", "filename": "myFile", "data": {...} }
        this.server.post('/api/file/save', async (request: any, reply) => {
            const { folder, filename, data } = request.body;
            
            if (!folder || !filename || !data) {
                return reply.code(400).send({ error: "Missing folder, filename, or data" });
            }

            // Construct full path
            const targetDir = path.join(basePath, folder);
            const fullPath = path.join(targetDir, filename.endsWith('.json') ? filename : `${filename}.json`);

            // Security: Ensure path is inside vault
            if (!targetDir.startsWith(basePath)) {
                return reply.code(403).send({ error: "Access denied: Path outside vault" });
            }

            // Ensure directory exists
            if (!fs.existsSync(targetDir)) {
                try {
                    fs.mkdirSync(targetDir, { recursive: true });
                } catch(e) {
                    return reply.code(500).send({ error: "Failed to create directory" });
                }
            }
            
            try {
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                return { success: true, path: fullPath };
            } catch (err) {
                return reply.code(500).send({ error: err.message });
            }
        });

        // --- API: Generic File List ---
        // Expects Query Param: ?folder=FolderInVault
        this.server.get('/api/file/list', async (request: any, reply) => {
            const { folder } = request.query;
            if(!folder) return reply.code(400).send({ error: "Missing folder parameter" });

            const targetDir = path.join(basePath, folder);

            // Security check
            if (!targetDir.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });

            if (!fs.existsSync(targetDir)) return [];

            try {
                // Filter for JSON files only
                return fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
            } catch (err) {
                return reply.code(500).send({ error: err.message });
            }
        });

        // --- API: Generic File Get ---
        // Expects Query Params: ?folder=FolderInVault&filename=myFile.json
        this.server.get('/api/file/get', async (request: any, reply) => {
            const { folder, filename } = request.query;
            if(!folder || !filename) return reply.code(400).send({ error: "Missing folder or filename" });

            const targetDir = path.join(basePath, folder);
            const fullPath = path.join(targetDir, filename);

            if (!fullPath.startsWith(basePath)) return reply.code(403).send({ error: "Access denied" });

            if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: "File not found" });

            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                return JSON.parse(content);
            } catch(err) {
                return reply.code(500).send({ error: err.message });
            }
        });

        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            console.log(`Slides Studio Server running at http://127.0.0.1:${this.port}`);
            new Notice(`Slides Studio Server started on port ${this.port}`);
        } catch (err) {
            console.error("Failed to start Fastify server", err);
            this.isRunning = false;
        }
    }

    public async stop() {
        if (this.server) {
            await this.server.close();
            this.server = null;
            this.isRunning = false;
        }
    }

    public async restart(newPort: number) {
        await this.stop();
        this.port = newPort;
        await this.start();
    }

    public getUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }
}