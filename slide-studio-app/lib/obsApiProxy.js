/**
 * @fileoverview Replaces REST endpoints with unified SocketCluster calls.
 */

import {create} from './socketcluster-client.min.js';

/**
 * ObsApiProxy (SocketCluster Version)
 * Replaces REST endpoints with unified SocketCluster calls for OBS commands.
 */
class ObsApiProxy {
  /**
   * Initializes the proxy state.
   */
  constructor() {
    this.connected = false;
    this.status = 'disconnected';
    this.events = new Map();
    this.socket = null;
    this.connectionPromise = null;
  }

  /**
   * Connects to the SocketCluster server.
   * @return {Promise} Connection result.
   */
  async connect() {
    if (this.socket && this.socket.state === 'open') {
      return {obsWebSocketVersion: '5.0.0', negotiatedRpcVersion: 1};
    }

    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = (async () => {
      try {
        if (!this.socket) {
          if (window.scSocket) {
            this.socket = window.scSocket;
          } else {
            this.socket = create({
              hostname: window.location.hostname,
              port: window.location.port ||
                  (window.location.protocol === 'https:' ? 443 : 80),
              path: '/socketcluster/',
              authToken: {name: 'Slide-Studio-App (OBS-Proxy)'},
            });
          }

          this.setupPersistentListeners();
        }

        if (this.socket.state !== 'open') {
          await this.socket.listener('connect').once();
        }

        // Ensure name is set
        try {
          await this.socket.invoke('setInfo',
              {name: 'Slide-Studio-App (OBS-Proxy)'});
        } catch (e) {}

        this.connected = true;
        this.status = 'connected';

        try {
          const {connected} = await this.socket.invoke('isObsConnected');
          if (connected) {
            this.emit('ConnectionOpened');
            this.emit('Identified',
                {negotiatedRpcVersion: 1, obsWebSocketVersion: '5.0.0'});
          }
        } catch (e) { }

        return {obsWebSocketVersion: '5.0.0', negotiatedRpcVersion: 1};
      } catch (e) {
        console.error('ObsApiProxy connection failed', e);
        throw e;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Sets up listeners for socket lifecycle events.
   */
  setupPersistentListeners() {
    if (!this.socket) return;

    (async () => {
      for await (const event of this.socket.listener('connect')) {
        this.connected = true;
        this.status = 'connected';
        this.subscribeToChannels();
      }
    })();

    (async () => {
      for await (const event of this.socket.listener('disconnect')) {
        this.connected = false;
        this.status = 'disconnected';
        this.emit('ConnectionClosed');
      }
    })();

    (async () => {
      for await (const {error} of this.socket.listener('error')) {
        console.error('ObsApiProxy: Socket Error:', error);
        this.emit('ConnectionError', error);
      }
    })();
  }

  /**
   * Subscribes to necessary SocketCluster channels.
   */
  async subscribeToChannels() {
    if (!this.socket) return;

    const appChannels = [
      'custom_slidesCommands',
      'obsEvents',
      'keyboardPress',
      'slides_navigation',
      'slides_broadcast',
      'viewer_to_studio',
      'currentSlide_to_studio',
      'viewer_to_teleprompter',
      'studio_to_viewer',
    ];

    appChannels.forEach((chanName) => {
      (async () => {
        const channel = this.socket.subscribe(chanName);
        for await (const data of channel) {
          // Normalize events for legacy compatibility
          if (chanName === 'custom_slidesCommands') {
            this.emit('slidesCommands',
                {eventName: data.eventName, msgParam: data.msgParam});
          } else if (chanName === 'obsEvents') {
            this.emit(data.eventName, data.eventData);
          } else {
            // Generic emission for channels
            this.emit(chanName, data);
          }
        }
      })();
    });
  }

  /**
   * Disconnects the socket.
   */
  async disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Performs an OBS request.
   * @param {string} requestType The request type.
   * @param {Object} requestData The request parameters.
   * @return {Promise} Request result.
   */
  async call(requestType, requestData) {
    if (!this.socket || this.socket.state !== 'open') {
      await this.connect();
    }
    try {
      return await this.socket.invoke('obsRequest',
          {requestType, requestData});
    } catch (e) {
      console.error(`[ObsApiProxy] OBS Request '${requestType}' failed:`, e);
      throw e;
    }
  }

  /**
   * Performs a batch of OBS requests.
   * @param {Array} requests The array of requests.
   * @param {Object} options Batch options.
   * @return {Promise} Request results.
   */
  async callBatch(requests, options) {
    if (!this.socket || this.socket.state !== 'open') {
      await this.connect();
    }
    try {
      return await this.socket.invoke('obsRequest', {requests, options});
    } catch (e) {
      console.error('[ObsApiProxy] OBS Batch Request failed:', e);
      throw e;
    }
  }

  /**
   * Refreshes all OBS browser sources.
   */
  async refreshOBSbrowsers() {
    try {
      const response = await this.call('GetInputList',
          {inputKind: 'browser_source'});
      const batch = response.inputs.map((input) => ({
        requestType: 'PressInputPropertiesButton',
        requestData: {
          inputUuid: input.inputUuid,
          propertyName: 'refreshnocache',
        },
      }));
      if (batch.length > 0) await this.callBatch(batch);
    } catch (err) {
      console.error('[ObsApiProxy] Failed to refresh OBS browsers:', err);
    }
  }

  /**
   * Publishes a message to a channel.
   * @param {string} channel The channel name.
   * @param {string} eventName The event name.
   * @param {Object} msgParam The payload.
   */
  async publish(channel, eventName, msgParam) {
    if (this.socket && this.socket.state === 'open') {
      this.socket.transmitPublish(channel, {eventName, msgParam});
    }
  }

  /**
   * Broadcasts a slide command.
   * @param {string} eventName The event name.
   * @param {Object} msgParam The payload.
   */
  async broadcastSlidesCommand(eventName, msgParam) {
    this.publish('custom_slidesCommands', eventName, msgParam);
  }

  /**
   * Registers an event listener.
   * @param {string} event The event name.
   * @param {Function} callback The callback function.
   */
  on(event, callback) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(callback);
  }

  /**
   * Unregisters an event listener.
   * @param {string} event The event name.
   * @param {Function} callback The callback function.
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} event The event name.
   * @param {Object} data The event data.
   */
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((cb) => cb(data));
    }
  }
}

// Global replacement
window.obsWss = new ObsApiProxy();
window.broadcastSlidesCommand = (event, msg) =>
  window.obsWss.broadcastSlidesCommand(event, msg);
window.refreshOBSbrowsers = () => window.obsWss.refreshOBSbrowsers();
