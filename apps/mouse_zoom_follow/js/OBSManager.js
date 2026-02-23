class OBSManager {
    constructor() {
        this.isConnected = false;
        this.currentScene = "";
        this.lastUpdateTimes = {};
        this.sseSource = null;
        
        // Callbacks
        this.onConnectionChange = null;
        this.onSceneChange = null;
    }

    async connect() {
        try {
            // Check if plugin is connected to OBS
            const res = await fetch('/api/v1/obs/isconnected');
            const status = await res.json();
            
            this.isConnected = status.connected;
            if (this.onConnectionChange) this.onConnectionChange(this.isConnected);

            if (this.isConnected) {
                this.setupSSE();
                await this.refreshCurrentScene();
            }

            return this.isConnected;
        } catch (err) {
            console.error('OBS Proxy connection check failed:', err);
            if (this.onConnectionChange) this.onConnectionChange(false);
            return false;
        }
    }

    setupSSE() {
        if (this.sseSource) this.sseSource.close();
        
        this.sseSource = new EventSource('/api/v1/obs/events');
        
        this.sseSource.addEventListener('CurrentProgramSceneChanged', (event) => {
            const data = JSON.parse(event.data);
            this.currentScene = data.sceneName;
            if (this.onSceneChange) this.onSceneChange(data.sceneName);
        });

        this.sseSource.addEventListener('ConnectionOpened', () => {
            this.isConnected = true;
            if (this.onConnectionChange) this.onConnectionChange(true);
        });

        this.sseSource.addEventListener('ConnectionClosed', () => {
            this.isConnected = false;
            if (this.onConnectionChange) this.onConnectionChange(false);
        });

        this.sseSource.onerror = () => {
            console.warn('OBS SSE connection lost, retrying...');
        };
    }

    async refreshCurrentScene() {
        try {
            const data = await this.call('GetCurrentProgramScene');
            this.currentScene = data.currentProgramSceneName;
            if (this.onSceneChange) this.onSceneChange(this.currentScene);
        } catch (e) {
            console.error('Failed to get current scene:', e);
        }
    }

    async call(requestType, requestData = {}) {
        const response = await fetch(`/api/v1/obs/${requestType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error ${response.status}`);
        }
        
        return await response.json();
    }

    async getMonitorList() {
        if (!this.isConnected) return [];
        try {
            const data = await this.call('GetMonitorList');
            return data.monitors || [];
        } catch (e) { console.error(e); return []; }
    }

    async getInputList() {
        if (!this.isConnected) return [];
        try {
            const inputs = await this.call('GetInputList');
            return inputs.inputs.map(i => i.inputName);
        } catch (e) { console.error(e); return []; }
    }

    async getVideoSettings() {
        if (!this.isConnected) return { baseWidth: 1920, baseHeight: 1080 };
        try {
            const settings = await this.call('GetVideoSettings');
            return {
                width: settings.baseWidth,
                height: settings.baseHeight
            };
        } catch (e) { console.error(e); return { width: 1920, height: 1080 }; }
    }

    async setInputSettings(sourceName, settings) {
        if (!this.isConnected) return;
        try {
            await this.call('SetInputSettings', {
                inputName: sourceName,
                inputSettings: settings
            });
        } catch (e) { console.error('Failed to set input settings:', e); }
    }

    async getBrowserSources() {
        if (!this.isConnected) return [];
        try {
            const inputs = await this.call('GetInputList', { inputKind: 'browser_source' });
            return inputs.inputs
                .filter(i => i.inputKind === 'browser_source' || i.unversionedInputKind === 'browser_source')
                .map(i => i.inputName);
        } catch (e) { console.error(e); return []; }
    }

    async getSceneItemDimensions(sourceName) {
        if (!this.isConnected || !this.currentScene) return null;
        try {
            const { sceneItemId } = await this.call('GetSceneItemId', {
                sceneName: this.currentScene,
                sourceName: sourceName
            });
            const { sceneItemTransform } = await this.call('GetSceneItemTransform', {
                sceneName: this.currentScene,
                sceneItemId: sceneItemId
            });
            return {
                width: sceneItemTransform.sourceWidth,
                height: sceneItemTransform.sourceHeight
            };
        } catch (e) { return null; }
    }

    async updateSceneItemTransform(sourceName, x, y, scaleX, scaleY) {
        if (!this.isConnected || !this.currentScene) return;
        
        const now = Date.now();
        if (now - (this.lastUpdateTimes[sourceName] || 0) < 16) return; 
        this.lastUpdateTimes[sourceName] = now;

        try {
            const { sceneItemId } = await this.call('GetSceneItemId', {
                sceneName: this.currentScene,
                sourceName: sourceName
            });
            await this.call('SetSceneItemTransform', {
                sceneName: this.currentScene,
                sceneItemId: sceneItemId,
                sceneItemTransform: {
                    scaleX: scaleX,
                    scaleY: scaleY,
                    positionX: x,
                    positionY: y
                }
            });
        } catch (e) { }
    }
}
