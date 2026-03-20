/**
 * @fileoverview Local Fastify and SocketCluster server management.
 */

import {App, FileSystemAdapter, Notice} from 'obsidian';
import fastify, {FastifyInstance} from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import {Message} from 'node-osc';
import {spawn, ChildProcess} from 'child_process';
import * as scServer from 'socketcluster-server';
import {WebSocketServer} from 'ws';
import type {OBSRequestTypes} from 'obs-websocket-js';

import type slidesStudioPlugin from '../main';
import {
  SaveFileBody,
  FileListQuery,
  GetFileQuery,
  OscSendBody,
  MidiSendBody,
  MidiPayload,
  CustomMessageBody,
  ReadFileRequest,
  WriteFileRequest,
} from '../types';
import {ObsServer} from './obsEndpoints';

/**
 * SocketCluster request wrapper.
 */
interface ScRequest<T = unknown> {
  end: (data?: unknown) => void;
  error: (err: unknown) => void;
  data: T;
}

/**
 * Queued OBS request structure.
 */
interface QueuedObsRequest {
  requestType?: string;
  requestData?: unknown;
  requests?: unknown[];
  options?: unknown;
  scRequest: ScRequest;
}

/**
 * Incoming OBS request structure.
 */
interface IncomingObsRequest {
  requestType?: string;
  requestData?: unknown;
  requests?: unknown[];
  options?: unknown;
}

/**
 * SocketCluster middleware action structure.
 */
interface ScMiddlewareAction {
  type: unknown;
  channel: string;
  data: unknown;
  PUBLISH_IN: unknown;
  allow: () => void;
}

/**
 * Manages the local Fastify and SocketCluster server.
 * Handles file operations, API endpoints, and real-time messaging.
 */
export class ServerManager {
  private app: App;
  private plugin: slidesStudioPlugin;
  private server: FastifyInstance | null = null;
  private scServer: scServer.AGServer | null = null;
  private port: number;
  private isRunning = false;

  private obsServer: ObsServer | null = null;
  private clientMetadata = new Map<string, {name: string}>();

  private mouseMonitorProcess: ChildProcess | null = null;
  private keyboardMonitorProcess: ChildProcess | null = null;
  private uvcUtilBridgeProcess: ChildProcess | null = null;

  private obsRequestQueue: QueuedObsRequest[] = [];
  private obsQueueTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param {App} app Obsidian App instance.
   * @param {slidesStudioPlugin} plugin Plugin instance.
   * @param {number} port Server port.
   */
  constructor(app: App, plugin: slidesStudioPlugin, port: number) {
    this.app = app;
    this.plugin = plugin;
    this.port = port;
  }

  /**
   * Starts the server.
   * @return {Promise<void>}
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    const adapter = this.app.vault.adapter;
    let basePath: string;
    if (adapter instanceof FileSystemAdapter) {
      basePath = adapter.getBasePath();
    } else {
      new Notice('Server cannot determine file system path.');
      return;
    }

    const pluginManifest = this.plugin.manifest;
    const pluginFolder = path.join(basePath, pluginManifest.dir);
    const libFolder = path.join(pluginFolder, 'lib');
    const appFolder = path.join(pluginFolder, 'slide-studio-app');
    const appsFolder = path.join(pluginFolder, 'apps');

    this.server = fastify({
      logger: false,
      bodyLimit: 100 * 1024 * 1024,
    });

    // Set security headers globally
    this.server.addHook('preHandler', async (request, reply) => {
      reply.header('X-Frame-Options', 'ALLOWALL');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Content-Security-Policy',
          'frame-ancestors *; frame-src *; default-src * \'unsafe-inline\' ' +
          '\'unsafe-eval\' blob:; img-src * data: blob:; media-src *;');
    });

    await this.server.register(fastifyCors, {origin: '*'});

    // Register static serving
    void this.server.register(fastifyStatic, {
      root: [libFolder, appFolder, appsFolder, pluginFolder, basePath],
      prefix: '/',
      decorateReply: false,
      setHeaders: (res, path) => {
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Security-Policy',
            'frame-ancestors *; frame-src *; default-src * \'unsafe-inline\' ' +
            '\'unsafe-eval\' blob:; img-src * data:; media-src *;');

        if (path.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.task')) {
          res.setHeader('Content-Type', 'application/octet-stream');
        } else if (path.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      },
    });

    this.obsServer = new ObsServer(this.plugin);
    this.obsServer.registerRoutes(this.server);

    this.registerApiRoutes();

    try {
      // Attach SocketCluster to the same HTTP server
      this.scServer = scServer.attach(this.server.server, {
        wsEngine: {Server: WebSocketServer},
        path: '/socketcluster/',
        origins: '*:*',
        allowClientPublish: true,
      });

      void this.handleSocketClusterConnections();

      // Intercept inbound publishes
      this.scServer.setMiddleware(this.scServer.MIDDLEWARE_INBOUND,
          (middlewareStream: scServer.AGMiddlewareStream) => {
            void (async () => {
              for await (const action of middlewareStream) {
                const scAction = action as unknown as ScMiddlewareAction;
                const type = scAction.type;
                if (type === this.scServer!.MIDDLEWARE_PUBLISH_IN ||
                    type === 'publish' || type === 1) {
                  this.handleIncomingPublish(scAction.channel, scAction.data);
                }
                scAction.allow();
              }
            })();
          });

      // Setup device channels
      void this.setupDeviceChannels();

      const address = await this.server.listen({port: this.port, host: '0.0.0.0'});
      console.log(`[Server] Listening on ${address} (Fastify + SocketCluster)`);
      this.isRunning = true;

      // Broadcast initial state
      this.broadcastServerState();

      if (this.plugin.settings?.mouseMonitor?.enabled) {
        void this.startMouseMonitor();
      }
      if (this.plugin.settings?.keyboardMonitor?.enabled) {
        void this.startKeyboardMonitor();
      }
      if (this.plugin.settings?.uvcUtilBridge?.enabled) {
        void this.startUvcUtilBridge();
      }

      this.startObsQueueProcessor();
    } catch (err) {
      console.error('Failed to start server', err);
      new Notice(`Slides Studio: Failed to start server on port ${this.port}`);
      this.isRunning = false;
    }
  }

  /**
   * Registers API routes.
   */
  private registerApiRoutes(): void {
    if (!this.server) return;

    this.server.post<{Body: {results: Array<{device: string,
      transcript: string}>}}>('/api/stt/result', async (request, reply) => {
      const {results} = request.body;
      if (!results || !Array.isArray(results)) {
        return reply.code(400).send({error: 'Invalid format'});
      }
      for (const res of results) {
        if (res.device && res.transcript !== undefined) {
          this.broadcastAudioMessage('audioSTT', res.device, res.transcript);
        }
      }
      return {success: true};
    });

    this.server.get('/api/obswss', () => {
      const s = this.plugin.settings;
      return {
        IP: s.obsIP || '127.0.0.1',
        PORT: s.obsPort || 4455,
        PW: s.obsPassword || '',
      };
    });

    this.server.post<{Body: SaveFileBody}>('/api/file/save', async (request,
        reply) => {
      const {folder, filename, content} = request.body;
      const adapter = this.app.vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) {
        return reply.code(500).send({error: 'No FS adapter'});
      }
      const basePath = adapter.getBasePath();
      const targetDir = path.join(basePath, folder);
      const fullPath = path.join(targetDir, filename);
      if (!targetDir.startsWith(basePath)) {
        return reply.code(403).send({error: 'Access denied'});
      }
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
      }
      try {
        fs.writeFileSync(fullPath, content);
        return {success: true, path: fullPath};
      } catch (err) {
        return reply.code(500).send({error: String(err)});
      }
    });
  }

  /**
   * Handles SocketCluster connections.
   */
  private async handleSocketClusterConnections(): Promise<void> {
    if (!this.scServer) return;

    for await (const {socket} of this.scServer.listener('connection')) {
      const authToken = socket.authToken as {name?: string} | null;
      if (authToken?.name) {
        this.clientMetadata.set(socket.id, {name: authToken.name});
      }

      this.broadcastServerState();

      void (async () => {
        for await (const request of socket.procedure('setInfo')) {
          const scReq = request as unknown as ScRequest<{name: string}>;
          this.clientMetadata.set(socket.id, {name: scReq.data.name || 'Unknown'});
          this.broadcastServerState();
          scReq.end();
        }
      })();

      void (async () => {
        for await (const request of socket.procedure('readFile')) {
          const scReq = request as unknown as ScRequest<ReadFileRequest>;
          const adapter = this.app.vault.adapter;
          if (!(adapter instanceof FileSystemAdapter)) {
            scReq.error('FileSystemAdapter not available');
            continue;
          }
          const fullPath = path.join(adapter.getBasePath(), scReq.data.path);
          if (!fs.existsSync(fullPath)) {
            scReq.error('File not found');
            continue;
          }
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            scReq.end({content});
          } catch (err) {
            scReq.error(String(err));
          }
        }
      })();

      void (async () => {
        for await (const request of socket.procedure('writeFile')) {
          const scReq = request as unknown as ScRequest<WriteFileRequest>;
          const adapter = this.app.vault.adapter;
          if (!(adapter instanceof FileSystemAdapter)) {
            scReq.error('FileSystemAdapter not available');
            continue;
          }
          const fullPath = path.join(adapter.getBasePath(), scReq.data.path);
          const targetDir = path.dirname(fullPath);
          try {
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, {recursive: true});
            }
            fs.writeFileSync(fullPath, scReq.data.content);
            scReq.end({success: true});
          } catch (err) {
            scReq.error(String(err));
          }
        }
      })();

      void (async () => {
        for await (const request of socket.procedure('isObsConnected')) {
          const scReq = request as unknown as ScRequest;
          scReq.end({connected: this.plugin.isObsConnected});
        }
      })();

      void (async () => {
        for await (const request of socket.procedure('obsRequest')) {
          const scReq = request as unknown as ScRequest<IncomingObsRequest>;
          this.queueObsRequest(scReq);
        }
      })();

      void (async () => {
        for await (const {code, reason} of socket.listener('disconnect')) {
          this.clientMetadata.delete(socket.id);
          this.broadcastServerState();
        }
      })();
    }
  }

  /**
   * Queues an OBS request.
   * @param {ScRequest<IncomingObsRequest>} scReq Request object.
   */
  private queueObsRequest(scReq: ScRequest<IncomingObsRequest>) {
    const req = scReq.data;
    this.obsRequestQueue.push({
      requestType: req.requestType,
      requestData: req.requestData,
      requests: req.requests,
      options: req.options,
      scRequest: scReq,
    });

    if (!this.obsQueueTimer) {
      this.startObsQueueProcessor();
    }
  }

  /**
   * Processes the OBS request queue.
   */
  private startObsQueueProcessor(): void {
    const process = async () => {
      if (this.obsRequestQueue.length === 0) {
        this.obsQueueTimer = null;
        return;
      }

      const next = this.obsRequestQueue.shift();
      if (!next) return;

      try {
        if (!this.plugin.isObsConnected || !this.plugin.obs) {
          next.scRequest.error('OBS not connected');
        } else {
          let result;
          if (next.requests) {
            result = await this.plugin.obs.callBatch(
                next.requests as any, next.options as any);
          } else if (next.requestType) {
            result = await this.plugin.obs.call(
                next.requestType as keyof OBSRequestTypes,
                next.requestData as any);
          }
          next.scRequest.end(result);
        }
      } catch (err) {
        next.scRequest.error(String(err));
      }

      this.obsQueueTimer = setTimeout(() => {
        void process();
      }, 100);
    };

    void process();
  }

  /**
   * Subscribes to all 'out' channels.
   */
  private async setupDeviceChannels() {
    if (!this.scServer) return;
    const s = this.plugin.settings;
    const channels = [
      ...s.oscDevices.map((d) => `osc_out_${d.name}`),
      ...s.midiDevices.map((d) => `midi_out_${d.name}`),
    ];

    for (const chanName of channels) {
      void (async () => {
        const channel = this.scServer!.exchange.subscribe(chanName);
        for await (const data of channel) {
          this.handleIncomingPublish(chanName, data);
        }
      })();
    }
  }

  /**
   * Handles incoming publishes from clients.
   * @param {string} channel Channel name.
   * @param {unknown} data Payload.
   */
  private handleIncomingPublish(channel: string, data: unknown): void {
    if (!data) return;
    if (channel.startsWith('osc_out_')) {
      const name = channel.replace('osc_out_', '');
      const p = data as {address: string, args: unknown[]};
      const msg = new Message(p.address);
      p.args.forEach((a) => msg.append(a as any));
      this.plugin.oscManager.sendMessage(name, msg);
    } else if (channel.startsWith('midi_out_')) {
      const name = channel.replace('midi_out_', '');
      this.plugin.midiManager.sendMidiMessage(name,
          this.plugin.settings.midiDevices, data as MidiPayload);
    }
  }

  /**
   * Broadcasts a message to all clients.
   * @param {string} channel Channel name.
   * @param {unknown} data Payload.
   */
  public broadcast(channel: string, data: unknown): void {
    if (this.scServer) {
      this.scServer.exchange.transmitPublish(channel, data);
    }
  }

  /**
   * Broadcasts an OBS event.
   * @param {string} eventName Event name.
   * @param {unknown} eventData Payload.
   */
  public broadcastObsEvent(eventName: string, eventData: unknown): void {
    this.broadcast(`obs:${eventName}`, eventData);
    this.broadcast('obsEvents', {eventName, eventData});
  }

  /**
   * Broadcasts an OSC message.
   * @param {string} name Device name.
   * @param {unknown[]} message OSC message.
   */
  public broadcastOscMessage(name: string, message: unknown[]): void {
    this.broadcast(`osc_in_${name}`, {deviceName: name, message});
  }

  /**
   * Broadcasts a MIDI message.
   * @param {string} name Device name.
   * @param {MidiPayload} message MIDI payload.
   */
  public broadcastMidiMessage(name: string, message: MidiPayload): void {
    this.broadcast(`midi_in_${name}`, {deviceName: name, message});
  }

  /**
   * Broadcasts an audio message.
   * @param {string} topic Topic name.
   * @param {string} device Device name.
   * @param {unknown} data Payload.
   */
  public broadcastAudioMessage(topic: string, device: string, data: unknown) {
    const payload: any = {device};
    if (topic === 'audioFFT') payload.fft = data;
    else if (topic === 'audioSTT') payload.stt = data;
    const chan = topic === 'audioFFT' ? 'audio_fft' : 'audio_stt';
    this.broadcast(chan, payload);
  }

  /**
   * Broadcasts a gamepad message.
   * @param {string} name Device name.
   * @param {unknown} data Payload.
   */
  public broadcastGamepadMessage(name: string, data: unknown): void {
    this.broadcast(`gamepad_in_${name}`, data);
  }

  /**
   * Broadcasts a MediaPipe message.
   * @param {string} name Task name.
   * @param {unknown} data Payload.
   */
  public broadcastMediaPipeMessage(name: string, data: unknown): void {
    this.broadcast(`mediapipe_in_${name}`, data);
  }

  /**
   * Broadcasts a custom message.
   * @param {string} name Message name.
   * @param {Record<string, unknown>} data Payload.
   */
  public broadcastCustomMessage(name: string, data: Record<string, unknown>) {
    this.broadcast(`custom_${name}`, data);
  }

  /**
   * Broadcasts current server state.
   */
  private broadcastServerState(): void {
    if (!this.scServer) return;
    const clients = Array.from(this.clientMetadata.entries()).map(([id, m]) => ({
      id, name: m.name,
    }));
    this.broadcast('serverState', {
      port: this.port,
      clients,
      obsConnected: this.plugin.isObsConnected,
    });
  }

  /**
   * Starts the mouse monitor.
   */
  public async startMouseMonitor(): Promise<void> {
    if (this.mouseMonitorProcess) return;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return;
    const s = this.plugin.settings?.mouseMonitor;
    if (!s) return;
    const script = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/mouse_monitor.py');
    const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
    const args = [script, url, s.trackPosition ? '1' : '0',
      s.trackClick ? '1' : '0', s.trackScroll ? '1' : '0'];
    this.mouseMonitorProcess = spawn(this.plugin.settings?.pythonPath ||
        'python3', args);
  }

  /**
   * Starts the keyboard monitor.
   */
  public async startKeyboardMonitor(): Promise<void> {
    if (this.keyboardMonitorProcess) return;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return;
    const s = this.plugin.settings?.keyboardMonitor;
    if (!s) return;
    const script = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/keyboard_monitor.py');
    const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
    const args = [script, url, s.showCombinations ? '1' : '0'];
    this.keyboardMonitorProcess = spawn(this.plugin.settings?.pythonPath ||
        'python3', args);
  }

  /**
   * Starts the UVC bridge.
   */
  public async startUvcUtilBridge(): Promise<void> {
    if (this.uvcUtilBridgeProcess) return;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return;
    const script = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/uvc-util/uvc_util_bridge.py');
    const s = this.plugin.settings?.uvcUtilBridge;
    if (!s) return;
    const lib = s.libraryPath;
    const url = `ws://127.0.0.1:${this.port}/socketcluster/`;
    this.uvcUtilBridgeProcess = spawn(this.plugin.settings?.pythonPath ||
        'python3', [script, '--url', url, '--lib', lib]);
  }

  public stopMouseMonitor(): void {
    this.mouseMonitorProcess?.kill();
    this.mouseMonitorProcess = null;
  }

  public stopKeyboardMonitor(): void {
    this.keyboardMonitorProcess?.kill();
    this.keyboardMonitorProcess = null;
  }

  public stopUvcUtilBridge(): void {
    this.uvcUtilBridgeProcess?.kill();
    this.uvcUtilBridgeProcess = null;
  }

  /**
   * Stops the server.
   * @return {Promise<void>}
   */
  public async stop(): Promise<void> {
    this.stopMouseMonitor();
    this.stopKeyboardMonitor();
    this.stopUvcUtilBridge();
    if (this.obsQueueTimer) clearTimeout(this.obsQueueTimer);
    if (this.scServer) await this.scServer.close();
    if (this.server) {
      await this.server.close();
      this.server = null;
      this.isRunning = false;
    }
  }

  /**
   * Restarts the server on a new port.
   * @param {number} newPort New port number.
   * @return {Promise<void>}
   */
  public async restart(newPort: number): Promise<void> {
    await this.stop();
    this.port = newPort;
    await this.start();
  }

  /**
   * Returns the server URL.
   * @return {string} Server URL.
   */
  public getUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }
}
