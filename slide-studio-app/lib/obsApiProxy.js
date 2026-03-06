/**
 * ObsApiProxy (SocketCluster Version)
 * Replaces SSE and legacy WebSocket logic with a unified SocketCluster connection.
 */
class ObsApiProxy {
    constructor() {
        this.connected = false;
        this.status = "disconnected";
        this.events = new Map();
        this.socket = null;
    }

    async connect() {
        if (this.socket) return;

        console.debug("ObsApiProxy: connecting via SocketCluster...");
        
        try {
            // Check if plugin is connected to OBS (still via API)
            const response = await fetch('/api/v1/obs/isconnected');
            const data = await response.json();
            
            this.socket = socketClusterClient.create({
                hostname: window.location.hostname,
                port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
                path: '/socketcluster/'
            });

            (async () => {
                for await (let event of this.socket.listener('connect')) {
                    console.warn('ObsApiProxy: SocketCluster connected');
                    this.connected = true;
                    this.status = "connected";
                    this.emit('ConnectionOpened');
                    this.emit('Identified', { negotiatedRpcVersion: 1, obsWebSocketVersion: '5.0.0' });
                    this.subscribeToChannels();
                }
            })();

            (async () => {
                for await (let event of this.socket.listener('disconnect')) {
                    console.warn('ObsApiProxy: SocketCluster disconnected');
                    this.connected = false;
                    this.status = "disconnected";
                    this.emit('ConnectionClosed');
                }
            })();

            (async () => {
                for await (let {error} of this.socket.listener('error')) {
                    console.error('ObsApiProxy: Socket Error:', error);
                    this.emit('ConnectionError', error);
                }
            })();

            return { obsWebSocketVersion: '5.0.0', negotiatedRpcVersion: 1 };
        } catch (e) {
            console.error("ObsApiProxy connection failed", e);
            throw e;
        }
    }

    async subscribeToChannels() {
        // Subscribe to slidesCommands
        (async () => {
            const channel = this.socket.subscribe('custom_slidesCommands');
            for await (let data of channel) {
                // data is the msgParam from the plugin
                this.emit('slidesCommands', { eventName: data.eventName, msgParam: data.msgParam });
            }
        })();

        // Subscribe to keyboard events
        (async () => {
            const channel = this.socket.subscribe('keyboardPress');
            for await (let data of channel) {
                this.emit('keyboardPress', data);
            }
        })();

        // Subscribe to mouse events (optional but available)
        (async () => {
            const channel = this.socket.subscribe('mouseClick');
            for await (let data of channel) {
                this.emit('mouseClick', data);
            }
        })();
    }

    async disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    async call(requestType, requestData) {
        // Still use the REST API for OBS calls for simplicity, 
        // or we could use socket.invoke if we added procedures to the server.
        // Keeping REST for now as it works well.
        const response = await fetch(`/api/v1/obs/${requestType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData || {})
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || response.statusText);
        }

        return await response.json();
    }

    async callBatch(requests, options) {
        const response = await fetch(`/api/v1/obs/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests, options })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || response.statusText);
        }

        return await response.json();
    }

    async refreshOBSbrowsers() {
        try {
            const response = await this.call("GetInputList", { inputKind: "browser_source" });
            const batch = response.inputs.map(input => ({
                requestType: "PressInputPropertiesButton",
                requestData: {
                    inputUuid: input.inputUuid,
                    propertyName: "refreshnocache"
                }
            }));
            if (batch.length > 0) await this.callBatch(batch);
        } catch (err) {
            console.error("[ObsApiProxy] Failed to refresh OBS browsers:", err);
        }
    }
    
    async broadcastSlidesCommand(eventName, msgParam) {
        if (this.socket && this.socket.state === 'open') {
            this.socket.transmitPublish('custom_slidesCommands', { eventName, msgParam });
        } else {
            // Fallback to REST API if socket is not ready
            await fetch('/api/custom/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'slidesCommands',
                    data: { eventName, msgParam }
                })
            });
        }
    }

    on(event, callback) {
        if (!this.events.has(event)) this.events.set(event, []);
        this.events.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(cb => cb(data));
        }
    }
}

// Global replacement
window.obsWss = new ObsApiProxy;
window.broadcastSlidesCommand = (event, msg) => window.obsWss.broadcastSlidesCommand(event, msg);
window.refreshOBSbrowsers = () => window.obsWss.refreshOBSbrowsers();
