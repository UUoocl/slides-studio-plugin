import { App, FileSystemAdapter, Notice } from 'obsidian';
import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

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

        // Get the absolute path to the vault
        let basePath: string;
        if (this.app.vault.adapter instanceof FileSystemAdapter) {
            basePath = this.app.vault.adapter.getBasePath();
        } else {
            new Notice("Fastify Server: Cannot determine file system path.");
            return;
        }

        const slidesFolder = path.join(basePath, '.obsidian/plugins/slides-studio/slides_studio');

        this.server = fastify();

        // Serve files statically
        // We define an array of roots:
        // 1. 'slidesstudio' folder (Priority 1: Plugin specific view files)
        // 2. 'basePath' (Priority 2: Wildcard - Any file in the vault)
        this.server.register(fastifyStatic, {
            root: [slidesFolder, basePath],
            prefix: '/', // Access files directly at root
        });

        // Specific route to ensure the main file is served at root
        this.server.get('/', async (request, reply) => {
            // sendFile will search through the defined roots in order
            return reply.sendFile('index.html');
        });

        try {
            // Listen only on localhost
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
            console.log(`Slides Studio Server running at http://127.0.0.1:${this.port}`);
            new Notice(`Slides Studio Server started on port ${this.port}`);
        } catch (err) {
            this.server.log.error(err);
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
            console.log("Slides Studio Server stopped");
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