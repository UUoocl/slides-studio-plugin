class OBSManager {
    constructor() {
        this.isConnected = false;
        this.currentScene = "";
        this.lastUpdateTimes = {};
        
        // WebSocket
        this.socket = null;
        
        // Callbacks
        this.onConnectionChange = null;
        this.onSceneChange = null;
    }

    async connect() {
        if (this.socket) return;

        if (!window.slidesStudioClient) {
            console.error('slidesStudioClient not loaded yet');
            setTimeout(() => this.connect(), 100);
            return;
        }

        this.socket = window.slidesStudioClient.create({
            hostname: window.location.hostname,
            port: window.location.port,
            path: '/websocket/',
            authToken: { name: 'Mouse-Zoom-Follow' }
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Connect handling
        this.socket.on('connect', async () => {
            console.warn('WebSocket connected');
            try {
                await this.socket.invoke('setInfo', { name: 'Mouse_Zoom_and_Follow' });
            } catch (e) {
                console.error('Failed to set WebSocket info:', e);
            }
            await this.checkObsConnection();
        });

        // Disconnect handling
        this.socket.on('disconnect', () => {
            console.warn('WebSocket disconnected');
            this.isConnected = false;
            if (this.onConnectionChange) this.onConnectionChange(false);
        });

        // Listen for OBS events
        this.setupEventListeners();

        // Initial check
        await this.checkObsConnection();
        return this.isConnected;
    }

    async checkObsConnection() {
        if (!this.socket) return;
        try {
            const status = await this.socket.invoke('isObsConnected');
            this.isConnected = status.connected;
            if (this.onConnectionChange) this.onConnectionChange(this.isConnected);

            if (this.isConnected) {
                await this.refreshCurrentScene();
            }
        } catch (err) {
            console.error('Failed to check OBS connection:', err);
            this.isConnected = false;
            if (this.onConnectionChange) this.onConnectionChange(false);
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Listen for connection opened
        const connOpenChannel = this.socket.subscribe('obs:ConnectionOpened');
        connOpenChannel.on('message', (data) => {
            this.isConnected = true;
            if (this.onConnectionChange) this.onConnectionChange(true);
        });

        // Listen for connection closed
        const connCloseChannel = this.socket.subscribe('obs:ConnectionClosed');
        connCloseChannel.on('message', (data) => {
            this.isConnected = false;
            if (this.onConnectionChange) this.onConnectionChange(false);
        });

        // Listen for scene change
        const sceneChangeChannel = this.socket.subscribe('obs:CurrentProgramSceneChanged');
        sceneChangeChannel.on('message', (data) => {
            this.currentScene = data.sceneName;
            if (this.onSceneChange) this.onSceneChange(data.sceneName);
        });

        // Listen for identified (re-check status)
        const identifiedChannel = this.socket.subscribe('obs:Identified');
        identifiedChannel.on('message', async (data) => {
            await this.checkObsConnection();
        });
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
        if (!this.socket) throw new Error('Socket not connected');
        
        return await this.socket.invoke('obsRequest', {
            requestType,
            requestData
        });
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
        if (!this.isConnected) return { width: 1920, height: 1080 };
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
