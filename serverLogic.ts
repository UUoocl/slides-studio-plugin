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
    private pluginPath: string;
    
    constructor(app: App, port: number) {
        this.app = app;
        this.port = port;
        this.pluginPath = this.app.plugins.plugins['slides-studio'].manifest.dir
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

        const slidesFolder = path.join(basePath, `${this.pluginPath}/slides_studio`);
        const libFolder = path.join(basePath, `${this.pluginPath}/lib`);
        const detailsFolder = path.join(basePath, `${this.pluginPath}/obs_webSocket_details`);

        this.server = fastify();

        // Enable CORS so the webpage can fetch data freely
        await this.server.register(fastifyCors, { 
            origin: true
        });

        // 1. Serve Plugin specific files (slides_studio folder)
        this.server.register(fastifyStatic, {
            root: [slidesFolder, libFolder, detailsFolder, basePath],
            prefix: '/', 
            decorateReply: false // specific to avoid conflicts with multiple static registers if needed, but here we use array
        });

        // 2. API: Save data
        this.server.post('/api/save-json', async (request: any, reply) => {
            const { foldername, filename, data } = request.body;
            if (!foldername || !filename || !data) return reply.code(400).send({ error: "Missing foldername, filename or data" });

            // Ensure directory exists for flows
            const saveDir = path.join(basePath, foldername);
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);

            const filePath = path.join(saveDir, `${filename}.json`);
            
            try {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                return { success: true, path: filePath };
            } catch (err) {
                return reply.code(500).send({ error: err.message });
            }
        });

        // 3. API: Load Folder JSON List
        this.server.get('/api/list-json', async (request: any, reply) => {
            const dir = path.join(basePath, request.folder);
            if (!fs.existsSync(dir)) return [];
            
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            return files;
        });

        // 4. API: Get JSON file Content
        this.server.get('/api/get-json/:filename', async (request: any, reply) => {
            const { foldername, filename } = request.params;
            const dir = path.join(basePath, foldername);
            const filePath = path.join(dir, filename);

            if (!fs.existsSync(filePath)) return reply.code(404).send({ error: "File not found" });

            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        });

        // 5. API: Get obs wss details
        this.server.get('/api/get-obswss', async (request: any, reply) => {
            const filePath = path.join(detailsFolder, "/websocketDetails.js");
            // return {"filePath": `${filePath} , ${fs.existsSync(filePath)}`}
            
            if (!fs.existsSync(filePath)) return reply.code(404).send({ error: "File not found" });
            
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content.replace("let websocketDetails = ",""));
        });

        this.server.get('/', async (request, reply) => {
            return reply.sendFile('index.html');
        });

        // Listen only on localhost
        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            console.log(`Slides Studio Server running at http://127.0.0.1:${this.port}`);
            new Notice(`Slides Studio Server started on port ${this.port}`);
        } catch (err) {
            console.error("Failed to start Fastify server", err);
            new Notice(`Failed to start Server on port ${this.port}. Check console.`);
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