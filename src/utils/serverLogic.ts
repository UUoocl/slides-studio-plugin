/**
 * @fileoverview Local Fastify and WebSocket server management.
 */

import {App, FileSystemAdapter, Notice} from 'obsidian';
import fastify, {FastifyInstance} from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket, {SocketStream} from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import {Message} from 'node-osc';
import {spawn, ChildProcess} from 'child_process';
import type {OBSRequestTypes} from 'obs-websocket-js';
import { WebSocket } from 'ws';

import type slidesStudioPlugin from '../main';
import {
  SaveFileBody,
  MidiPayload,
  ReadFileRequest,
  WriteFileRequest,
} from '../types';
import {ObsServer} from './obsEndpoints';

/**
 * Base structure for WebSocket messages.
 */
interface BaseMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Message sent by client to subscribe to a channel.
 */
interface SubscribeMessage extends BaseMessage {
  type: 'subscribe';
  channel: string;
}

/**
 * Message sent by client to unsubscribe from a channel.
 */
interface UnsubscribeMessage extends BaseMessage {
  type: 'unsubscribe';
  channel: string;
}

/**
 * Message sent by client to publish data to a channel.
 */
interface PublishMessage extends BaseMessage {
  type: 'publish';
  channel: string;
  data: unknown;
}

/**
 * Message sent by client to call a procedure.
 */
interface CallMessage extends BaseMessage {
  type: 'call';
  id: string;
  method: string;
  data: unknown; // data structure varies by method
}

/**
 * Client connection structure.
 */
interface Client {
  id: string;
  name: string;
  ws: WebSocket;
  subscriptions: Set<string>;
}


/**
 * Manages the local Fastify and WebSocket server.
 * Handles file operations, API endpoints, and real-time messaging.
 */
export class ServerManager {
  private app: App;
  private plugin: slidesStudioPlugin;
  private server: FastifyInstance | null = null;
  private clients = new Map<string, Client>();
  private port: number;
  private isRunning = false;

  private obsServer: ObsServer | null = null;

  private mouseMonitorProcess: ChildProcess | null = null;
  private keyboardMonitorProcess: ChildProcess | null = null;
  private uvcUtilBridgeProcess: ChildProcess | null = null;


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
      cacheControl: false,
      setHeaders: (res, path) => {
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Security-Policy',
            'frame-ancestors *; frame-src *; default-src * \'unsafe-inline\' ' +
            '\'unsafe-eval\' blob:; img-src * data:; media-src *;');

        if (path.endsWith('.js') || path.endsWith('.html') || path.endsWith('.mjs')) {
          res.setHeader('Cache-Control', 'no-store, must-revalidate');
        }

        if (path.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.task')) {
          res.setHeader('Content-Type', 'application/octet-stream');
        } else if (path.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      },
    });

    // Register WebSocket support
    await this.server.register(fastifyWebsocket);
    this.registerWebSocketRoutes();

    this.obsServer = new ObsServer(this.plugin);
    this.obsServer.registerRoutes(this.server);

    this.registerApiRoutes();

    try {
      // Listen only on 127.0.0.1 for security
      const address = await this.server.listen({port: this.port, host: '127.0.0.1'});
      console.log(`[Server] Listening on ${address} (Fastify + Native WebSockets)`);
      this.isRunning = true;

      // Broadcast initial state
      this.broadcastServerState();

      if (this.plugin.settings?.mouseMonitorEnabled) {
        void this.startMouseMonitor();
      }
      if (this.plugin.settings?.keyboardMonitorEnabled) {
        void this.startKeyboardMonitor();
      }
      if (this.plugin.settings?.uvcUtilEnabled) {
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
          this.broadcastSTTMessage(res.device, res.transcript);
        }
      }
      return {success: true};
    });

    this.server.get('/api/obswss', () => {
      const s = this.plugin.settings;
      return {
        IP: s.websocketIP_Text || '127.0.0.1',
        PORT: s.websocketPort_Text || 4455,
        PW: s.websocketPW_Text || '',
      };
    });

    this.server.post<{Body: {folder: string, filename: string, data: unknown}}>('/api/file/save', async (request, reply) => {
      const {folder, filename, data} = request.body;
      const adapter = this.app.vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) {
        return reply.code(500).send({error: 'No FS adapter'});
      }
      const basePath = adapter.getBasePath();
      const targetDir = path.join(basePath, folder);
      const fullPath = path.join(targetDir, filename.endsWith('.json') ? filename : `${filename}.json`);
      
      if (!targetDir.startsWith(basePath)) {
        return reply.code(403).send({error: 'Access denied'});
      }
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
      }
      
      try {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
        return {success: true, path: fullPath};
      } catch (err) {
        return reply.code(500).send({error: String(err)});
      }
    });

    this.server.get<{Querystring: {folder: string, filename: string}}>('/api/file/get', async (request, reply) => {
      const {folder, filename} = request.query;
      const adapter = this.app.vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) return reply.code(500).send({error: 'No FS adapter'});
      
      const basePath = adapter.getBasePath();
      const fullPath = path.join(basePath, folder, filename.endsWith('.json') ? filename : `${filename}.json`);
      
      if (!fullPath.startsWith(basePath)) return reply.code(403).send({error: 'Access denied'});
      
      try {
        if (!fs.existsSync(fullPath)) {
            // Auto-create sidecar if it's an obs-map.json file
            if (filename.endsWith('.obs-map.json')) {
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(fullPath, '[]');
                return [];
            }
            return reply.code(404).send({error: 'File not found'});
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        return reply.code(500).send({error: String(err)});
      }
    });

    this.server.get<{Querystring: {folder: string}}>('/api/file/list', async (request, reply) => {
      const {folder} = request.query;
      const adapter = this.app.vault.adapter;
      if (!(adapter instanceof FileSystemAdapter)) return reply.code(500).send({error: 'No FS adapter'});
      
      const basePath = adapter.getBasePath();
      const targetDir = path.join(basePath, folder);
      
      if (!targetDir.startsWith(basePath)) return reply.code(403).send({error: 'Access denied'});
      
      try {
        if (!fs.existsSync(targetDir)) return [];
        const files = fs.readdirSync(targetDir);
        return files.filter(f => f.endsWith('.json'));
      } catch (err) {
        return reply.code(500).send({error: String(err)});
      }
    });

    this.server.get('/api/shortcuts/list', async (request, reply) => {
      const s = this.plugin.settings;
      if (!s.appleShortcutsEnabled) {
        console.warn('[Shortcuts] List requested but bridge is disabled');
        return reply.code(403).send({error: 'Shortcuts bridge is disabled in settings'});
      }

      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('shortcuts list', (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error('[Shortcuts] Failed to list shortcuts:', error, stderr);
            resolve([]);
          } else {
            const list = stdout.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            resolve(list);
          }
        });
      });
    });

    this.server.post<{Body: {shortcut: string, data?: unknown}}>('/api/shortcuts/run', async (request, reply) => {
      const {shortcut, data} = request.body;
      const s = this.plugin.settings;

      if (!s.appleShortcutsEnabled) return reply.code(403).send({error: 'Shortcuts bridge is disabled in settings'});
      if (!shortcut) return reply.code(400).send({error: 'Missing shortcut name'});

      const requestId = Math.random().toString(36).substring(2, 15);
      const payload = {
        id: requestId,
        payload: data || {},
        callback_url: `http://127.0.0.1:${s.serverPort}/api/shortcuts/callback?id=${requestId}`
      };

      const inputStr = JSON.stringify(payload);
      
      if (s.appleShortcutsLoggingEnabled) {
        console.log(`[Shortcuts] Triggering shortcut "${shortcut}" with requestId: ${requestId}`);
        new Notice(`Triggering shortcut: ${shortcut}`);
      }

      // Execute: echo 'input' | shortcuts run "shortcut"
      try {
        const echo = spawn('echo', [inputStr]);
        const shortcuts = spawn('shortcuts', ['run', shortcut]);

        echo.stdout.pipe(shortcuts.stdin);

        let errorOutput = '';
        shortcuts.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        shortcuts.on('close', (code) => {
          if (code !== 0) {
            console.error(`[Shortcuts] Failed to run shortcut "${shortcut}" (exit code ${code}): ${errorOutput}`);
            if (s.appleShortcutsLoggingEnabled) {
                new Notice(`Shortcut failed: ${shortcut}`);
            }
          } else {
            if (s.appleShortcutsLoggingEnabled) {
                console.log(`[Shortcuts] Shortcut "${shortcut}" execution started successfully.`);
            }
          }
        });
      } catch (err) {
        console.error(`[Shortcuts] Error spawning shortcut process:`, err);
        return reply.code(500).send({error: String(err)});
      }

      return {success: true, requestId};
    });

    this.server.post('/api/shortcuts/callback', async (request, reply) => {
      const data = request.body;
      const id = (request.query as any).id;
      const s = this.plugin.settings;
      if (!s.appleShortcutsEnabled) return reply.code(403).send({error: 'Shortcuts bridge is disabled in settings'});

      if (s.appleShortcutsLoggingEnabled) {
        console.log(`[Shortcuts] Callback received for ID ${id}:`, data);
        new Notice(`Shortcut result received: ${id}`);
      }
      
      this.broadcast('shortcuts_result', {id, data});
      return {status: 'ok'};
    });

    /**
     * v2.0 Initialization Handshake
     * Provides browser sources with their initial state based on the current OBS scene.
     */
    this.server.get<{Querystring: {id: string}}>('/api/init-state', async (request, reply) => {
      const {id} = request.query;
      if (!id) return reply.code(400).send({error: 'Missing component ID'});

      try {
        if (!this.plugin.isObsConnected) return reply.code(503).send({error: 'OBS not connected'});

        // Fetch SceneConfig from OBS Text Source in the current scene
        const scene = await this.plugin.obs.call('GetCurrentProgramScene');
        const items = await this.plugin.obs.call('GetSceneItemList', {sceneName: scene.currentProgramSceneName});
        
        // Look for a Text Source named 'SceneConfig'
        const configItem = items.sceneItems.find(i => i.sourceName === 'SceneConfig');
        if (!configItem) return {}; // No config found, return empty

        const settings = await this.plugin.obs.call('GetInputSettings', {inputName: 'SceneConfig'});
        const config = JSON.parse(settings.inputSettings?.text || '{}');
        
        return config[id] || {};
      } catch (err) {
        console.error(`[Server] Init state failed for ${id}:`, err);
        return reply.code(500).send({error: String(err)});
      }
    });

    /**
     * v2.0 Sidecar Persistence
     * Saves slide-to-scene mappings to a JSON file in the vault.
     */
    this.server.post<{Body: {deckId: string, data: any}}>('/api/save-sidecar', async (request, reply) => {
      const {deckId, data} = request.body;
      if (!deckId || !data) return reply.code(400).send({error: 'Missing deckId or data'});

      try {
        // We'll save it as [deckId].obs-map.json in the plugin's folder or root
        const fileName = `${deckId}.obs-map.json`;
        await this.plugin.app.vault.adapter.write(fileName, JSON.stringify(data, null, 2));
        return {status: 'ok', file: fileName};
      } catch (err) {
        console.error(`[Server] Save sidecar failed:`, err);
        return reply.code(500).send({error: String(err)});
      }
    });
  }

  /**
   * Registers WebSocket routes.
   */
  private registerWebSocketRoutes(): void {
    if (!this.server) return;

    this.server.get('/websocket/', {websocket: true}, async (connection, req) => {
      if (!connection) {
        console.error('[WebSocket] Connection object is undefined');
        return;
      }
      
      // Handle both SocketStream and raw WebSocket objects
      const ws = connection.socket || (connection as any);
      
      if (!ws || typeof ws.on !== 'function') {
        console.error('[WebSocket] Could not find valid socket object on connection', connection);
        return;
      }

      const clientId = Math.random().toString(36).substring(2, 15);
      
      const client: Client = {
        id: clientId,
        name: 'Unknown',
        ws: ws,
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);

      // Initial state
      this.broadcastServerState();

      // Create a promise that resolves when the socket closes
      const closedPromise = new Promise<void>((resolve) => {
        ws.once('close', (code, reason) => {
          resolve();
        });
        ws.once('error', (err) => {
          console.error(`[WebSocket] Socket error for ${clientId}:`, err);
          resolve();
        });
      });

      // Handle messages via events
      ws.on('message', (data) => {
        try {
          const raw = data.toString();
          const message = JSON.parse(raw);
          this.handleWebSocketMessage(client, message);
        } catch (err) {
          console.error(`[WebSocket] Error parsing message from ${clientId}:`, err);
        }
      });

      try {
        // Wait for the socket to close before ending the handler
        await closedPromise;
      } finally {
        this.clients.delete(clientId);
        this.broadcastServerState();
      }
    });
  }

  /**
   * Handles incoming WebSocket messages.
   */
  private handleWebSocketMessage(client: Client, message: unknown): void {
    if (!message || typeof message !== 'object') return;
    const msg = message as BaseMessage;

    switch (msg.type) {
      case 'subscribe':
        {
          const sMsg = msg as unknown as SubscribeMessage;
          if (sMsg.channel) {
            client.subscriptions.add(sMsg.channel);
          }
        }
        break;
      case 'unsubscribe':
        {
          const uMsg = msg as unknown as UnsubscribeMessage;
          if (uMsg.channel) {
            client.subscriptions.delete(uMsg.channel);
          }
        }
        break;
      case 'publish':
        {
          const pMsg = msg as unknown as PublishMessage;
          if (pMsg.channel && pMsg.data) {
            this.handleIncomingPublish(pMsg.channel, pMsg.data, client.id);
          }
        }
        break;
      case 'call':
        this.handleWebSocketCall(client, msg as unknown as CallMessage);
        break;
      default:
        console.warn(`[WebSocket] Unknown message type: ${msg.type}`);
    }
  }

  /**
   * Handles WebSocket procedure calls.
   */
  private async handleWebSocketCall(client: Client, message: CallMessage): Promise<void> {
    const {id, method, data} = message;

    const respond = (responseData?: unknown, error?: string) => {
      if (client.ws.readyState === 1) { // OPEN
        client.ws.send(JSON.stringify({
          type: 'response',
          id,
          data: responseData,
          error,
        }));
      }
    };

    try {
      switch (method) {
        case 'setInfo': {
          const infoData = data as {name?: string};
          client.name = infoData.name || 'Unknown';
          this.broadcastServerState();
          respond({success: true});
          break;
        }

        case 'readFile': {
          const adapter = this.app.vault.adapter;
          if (!(adapter instanceof FileSystemAdapter)) {
            return respond(null, 'FileSystemAdapter not available');
          }
          const readData = data as {path: string};
          const fullPath = path.join(adapter.getBasePath(), readData.path);
          if (!fs.existsSync(fullPath)) {
            return respond(null, 'File not found');
          }
          const content = fs.readFileSync(fullPath, 'utf-8');
          respond({content});
          break;
        }

        case 'writeFile': {
          const adapter = this.app.vault.adapter;
          if (!(adapter instanceof FileSystemAdapter)) {
            return respond(null, 'FileSystemAdapter not available');
          }
          const writeData = data as {path: string, content: string};
          const fullPath = path.join(adapter.getBasePath(), writeData.path);
          const targetDir = path.dirname(fullPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, {recursive: true});
          }
          fs.writeFileSync(fullPath, writeData.content);
          respond({success: true});
          break;
        }

        case 'isObsConnected':
          respond({connected: this.plugin.isObsConnected});
          break;
        
        case 'connectObs':
            void this.plugin.obsWSSconnect({
                IP: this.plugin.settings.websocketIP_Text,
                PORT: this.plugin.settings.websocketPort_Text,
                PW: this.plugin.settings.websocketPW_Text
            });
            respond({success: true});
            break;

        case 'obsRequest': {
          const obsData = data as {requestType?: string, requestData?: unknown,
            requests?: unknown[], options?: unknown};
          
          this.plugin.enqueueObsRequest({
            requestType: obsData.requestType,
            requestData: obsData.requestData,
            requests: obsData.requests,
            options: obsData.options,
          }).then(result => {
            respond(result);
          }).catch(err => {
            respond(null, String(err));
          });
          break;
        }

        case 'uvcResponse': {
          const uvcData = data as {action?: string, data?: any, status?: string};
          console.warn("[Server] Received uvcResponse:", uvcData);
          if (uvcData.action === 'list_devices' && Array.isArray(uvcData.data)) {
            this.app.workspace.trigger("slides-studio:uvc-devices", uvcData.data);
          } else if (uvcData.status === 'connected') {
            console.log("[Server] UVC Bridge connected:", uvcData);
          }
          respond({success: true});
          break;
        }

        default:
          respond(null, `Unknown method: ${method}`);
      }
    } catch (err) {
      respond(null, String(err));
    }
  }


  /**
   * Handles incoming publishes from clients.
   * @param {string} channel Channel name.
   * @param {unknown} data Payload.
   * @param {string} [excludeClientId] Optional ID of client to exclude from broadcast.
   */
  private handleIncomingPublish(channel: string, data: unknown, excludeClientId?: string): void {
    if (!data) return;
    
    // Internal routing for device outputs
    if (channel.startsWith('osc_out_')) {
      const name = channel.replace('osc_out_', '');
      const p = data as {address: string, args: unknown[]};
      const msg = new Message(p.address);
      p.args.forEach((a) => msg.append(a as string | number | boolean | Buffer));
      this.plugin.oscManager.sendMessage(name, msg);
    } else if (channel.startsWith('midi_out_')) {
      const name = channel.replace('midi_out_', '');
      this.plugin.midiManager.sendMidiMessage(name,
          this.plugin.settings.midiDevices, data as any);
    } else if (channel.startsWith('gamepad_out_')) {
      const name = channel.replace('gamepad_out_', '');
      this.plugin.rumbleGamepad(name, data as { weakMagnitude?: number, strongMagnitude?: number, duration?: number });
    } else {
      // Python monitor logging
      const s = this.plugin.settings;
      if (channel === 'mousePosition' && s.mouseConsoleLogPosition) {
        console.warn(`[Mouse] Position:`, data);
      } else if (channel === 'mouseClick' && s.mouseConsoleLogClicks) {
        console.warn(`[Mouse] Click:`, data);
      } else if (channel === 'mouseScroll' && s.mouseConsoleLogScroll) {
        console.warn(`[Mouse] Scroll:`, data);
      } else if ((channel === 'keyboardPress' || channel === 'keyboardRelease') && s.keyboardConsoleLogEnabled) {
        console.warn(`[Keyboard] ${channel === 'keyboardPress' ? 'Press' : 'Release'}:`, data);
      } else if (channel.startsWith('uvc_in_')) {
        const name = channel.replace('uvc_in_', '');
        const dev = s.uvcDevices.find((d) => d.name === name);
        if (dev?.consoleLogEnabled) {
          console.warn(`[UVC] ${name}:`, data);
        }
      } else if (channel.startsWith('gamepad_in_')) {
        const name = channel.replace('gamepad_in_', '');
        const dev = s.gamepadDevices.find((d) => d.name === name);
        if (dev?.consoleLogEnabled) {
          console.warn(`[Gamepad] ${name}:`, data);
        }
      } else if (channel === 'CHOREOGRAPHY_UPDATE') {
        // v2.0 Centralized animation stream
        // Expected data: { id: string, transform?: object, mask?: string, timing?: object }
      }
    }

    // Re-broadcast to all subscribed clients
    this.broadcast(channel, data, excludeClientId);
  }

  /**
   * Broadcasts a message to all subscribed clients.
   * @param {string} channel Channel name.
   * @param {unknown} data Payload.
   * @param {string} [excludeClientId] Optional ID of client to exclude.
   */
  public broadcast(channel: string, data: unknown, excludeClientId?: string): void {
    const message = JSON.stringify({
      type: 'event',
      channel,
      data,
    });

    for (const client of this.clients.values()) {
      if (client.id !== excludeClientId && client.subscriptions.has(channel)) {
        if (client.ws.readyState === 1) { // OPEN
          client.ws.send(message);
        }
      }
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
   * @param {unknown} message MIDI payload.
   */
  public broadcastMidiMessage(name: string, message: unknown): void {
    this.broadcast(`midi_in_${name}`, {deviceName: name, message});
  }

  /**
   * Broadcasts an audio message.
   * @param {string} topic Topic name.
   * @param {string} device Device name.
   * @param {unknown} data Payload.
   */
  public broadcastAudioMessage(topic: string, device: string, data: unknown) {
    const s = this.plugin.settings;
    const deviceSetting = s.audioDevices.find((d) => d.name === device);
    
    if (deviceSetting?.consoleLogEnabled) {
      console.log(`[Audio] ${device} (${topic}):`, data);
    }

    const payload: {device: string, fft?: unknown, stt?: unknown} = {device};
    if (topic === 'audioFFT') payload.fft = data;
    else if (topic === 'audioSTT') payload.stt = data;
    const chan = topic === 'audioFFT' ? 'audio_fft' : 'audio_stt';
    this.broadcast(chan, payload);
  }

  /**
   * Broadcasts a speech-to-text message.
   * @param {string} device Device name.
   * @param {string} transcript Transcript text.
   */
  public broadcastSTTMessage(device: string, transcript: string): void {
    const s = this.plugin.settings;
    
    if (s.sttConsoleLogEnabled) {
      console.log(`[STT] ${device}:`, transcript);
    }

    const chan = s.sttChannelName || 'audio_stt';
    this.broadcast(chan, { device, stt: transcript });
  }

  /**
   * Broadcasts a gamepad message.
   * @param {string} name Device name.
   * @param {unknown} data Payload.
   */
  public broadcastGamepadMessage(name: string, data: unknown): void {
    const s = this.plugin.settings;
    const dev = s.gamepadDevices.find((d) => d.name === name);
    if (dev?.consoleLogEnabled) {
      console.warn(`[Gamepad] ${name}:`, data);
    }
    this.broadcast(`gamepad_in_${name}`, data);
  }

  /**
   * Broadcasts a MediaPipe message.
   * @param {string} name Task name.
   * @param {unknown} data Payload.
   */
  public broadcastMediaPipeMessage(name: string, data: unknown): void {
    const s = this.plugin.settings;
    const taskSetting = s.mediapipeDevices.find((d) => d.name === name);
    
    if (taskSetting?.consoleLogEnabled) {
      console.log(`[MediaPipe] ${name}:`, data);
    }

    this.broadcast(`mediapipe_in_${name}`, data);
  }
  
  /**
   * Broadcasts a UVC command.
   * @param {unknown} command The command payload.
   */
  public broadcastUvcCommand(command: unknown): void {
    this.broadcast('uvcCommands', command);
  }

  /**
   * Broadcasts current server state.
   */
  private broadcastServerState(): void {
    const clients = Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      name: c.name,
      channels: Array.from(c.subscriptions),
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
    const s = this.plugin.settings;
    const script = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/mouse_monitor.py');
    const url = `ws://127.0.0.1:${this.port}/websocket/`;
    const args = [script, url, s.mouseMonitorPosition ? '1' : '0',
      s.mouseMonitorClicks ? '1' : '0', s.mouseMonitorScroll ? '1' : '0',
      (s.mouseMonitorPPS || 20).toString()];
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
    const s = this.plugin.settings;
    const script = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/keyboard_monitor.py');
    const url = `ws://127.0.0.1:${this.port}/websocket/`;
    const args = [script, url, s.keyboardMonitorShowCombinations ? '1' : '0'];
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
    const lib = path.join(adapter.getBasePath(), this.plugin.manifest.dir,
        'pythonScripts/uvc-util/libuvcutil.dylib');
    const url = `ws://127.0.0.1:${this.port}/websocket/`;
    console.log(`[Server] Starting UVC bridge with lib: ${lib}`);
    
    this.uvcUtilBridgeProcess = spawn(this.plugin.settings?.pythonPath ||
        'python3', ['-u', script, '--url', url, '--lib', lib]);

    this.uvcUtilBridgeProcess.stdout?.on('data', (data) => {
      console.log(`[UVC Bridge STDOUT] ${data}`);
    });

    this.uvcUtilBridgeProcess.stderr?.on('data', (data) => {
      console.error(`[UVC Bridge STDERR] ${data}`);
    });
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

  public async restartMouseMonitor(): Promise<void> {
    this.stopMouseMonitor();
    await this.startMouseMonitor();
  }

  public async restartKeyboardMonitor(): Promise<void> {
    this.stopKeyboardMonitor();
    await this.startKeyboardMonitor();
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
    
    if (this.server) {
      await this.server.close();
      this.server = null;
      this.isRunning = false;
    }
    this.clients.clear();
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
