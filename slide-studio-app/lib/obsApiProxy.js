class ObsApiProxy {
    constructor() {
        this.connected = false;
        this.status = "disconnected";
        this.events = new Map();
        this.eventSource = null;
    }

    async connect(url, password, options) {
        // Ignore args, connect to plugin backend
        console.debug("ObsApiProxy: connecting to plugin backend...");
        
        try {
            const response = await fetch('/api/v1/obs/isconnected');
            if (!response.ok) throw new Error("Failed to check connection status");
            
            const data = await response.json();
            
            if (data.connected) {
                this.connected = true;
                this.status = "connected";
                this.startEventStream();
                
                // Emit connection events
                setTimeout(() => {
                    this.emit('ConnectionOpened');
                    this.emit('Identified', { negotiatedRpcVersion: 1, obsWebSocketVersion: '5.0.0' });
                }, 0);
                
                return { obsWebSocketVersion: '5.0.0', negotiatedRpcVersion: 1 };
            } else {
                throw new Error("Plugin is not connected to OBS");
            }
        } catch (e) {
            console.error("ObsApiProxy connection failed", e);
            this.emit('ConnectionError', e);
            throw e;
        }
    }

    async disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.connected = false;
        this.status = "disconnected";
        this.emit('ConnectionClosed');
    }

    async call(requestType, requestData) {
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
        console.log("[ObsApiProxy] Sending batch request:", requests);
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
        console.log("[ObsApiProxy] Refreshing all OBS browser sources...");
        try {
            const response = await this.call("GetInputList", { inputKind: "browser_source" });
            const batch = response.inputs.map(input => ({
                requestType: "PressInputPropertiesButton",
                requestData: {
                    inputUuid: input.inputUuid,
                    propertyName: "refreshnocache"
                }
            }));
            
            if (batch.length > 0) {
                await this.callBatch(batch);
                console.log("[ObsApiProxy] Successfully refreshed all browser sources.");
            }
        } catch (err) {
            console.error("[ObsApiProxy] Failed to refresh OBS browsers:", err);
        }
    }
    
    async broadcastSlidesCommand(eventName, msgParam) {
        console.log(`[ObsApiProxy] Broadcasting '${eventName}' to /api/custom/message`);
        try {
            const response = await fetch('/api/custom/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'slidesCommands',
                    data: { eventName, msgParam }
                })
            });
            if (response.ok) {
                console.log(`[ObsApiProxy] Successfully broadcasted '${eventName}'`);
            } else {
                console.error(`[ObsApiProxy] Failed to broadcast '${eventName}'. Server responded with status: ${response.status}`);
            }
        } catch (e) {
            console.error(`[ObsApiProxy] Network error while broadcasting '${eventName}':`, e);
        }
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(cb => cb(data));
        }
    }

    startEventStream() {
        if (this.eventSource) return;

        console.log("ObsApiProxy: starting unified event stream...");
        this.eventSource = new EventSource('/api/events');
        
        const eventNames = ['CustomEvent', 'ConnectionOpened', 'ConnectionClosed', 'Identified'];
        eventNames.forEach(name => {
            this.eventSource.addEventListener(name, (e) => {
                const data = JSON.parse(e.data);
                this.emit(name, data);
            });
        });
        
        this.eventSource.onerror = (e) => {
             console.debug("SSE error", e);
        };
    }
}

// Global replacement
window.obsWss = new ObsApiProxy;
window.broadcastSlidesCommand = (event, msg) => window.obsWss.broadcastSlidesCommand(event, msg);
window.refreshOBSbrowsers = () => window.obsWss.refreshOBSbrowsers();
