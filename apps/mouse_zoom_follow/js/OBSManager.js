class OBSManager {
    constructor() {
        this.isConnected = false;
        this.currentScene = "";
        this.lastUpdateTimes = {};
        
        // SocketCluster
        this.socket = null;
        
        // Callbacks
        this.onConnectionChange = null;
        this.onSceneChange = null;
    }

    async connect() {
        if (this.socket) return;

        this.socket = socketClusterClient.create({
            hostname: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/socketcluster/'
        });

        // Error handling
        (async () => {
            for await (let {error} of this.socket.listener('error')) {
                console.error('SocketCluster error:', error);
            }
        })();

        // Connect handling
        (async () => {
            for await (let event of this.socket.listener('connect')) {
                console.warn('SocketCluster connected');
                try {
                    await this.socket.invoke('setInfo', { name: 'Mouse_Zoom_and_Follow' });
                } catch (e) {
                    console.error('Failed to set SocketCluster info:', e);
                }
                await this.checkObsConnection();
            }
        })();

        // Disconnect handling
        (async () => {
            for await (let event of this.socket.listener('disconnect')) {
                console.warn('SocketCluster disconnected');
                this.isConnected = false;
                if (this.onConnectionChange) this.onConnectionChange(false);
            }
        })();

        // Listen for OBS events
        this.setupEventListeners();

        // Initial check
        await this.checkObsConnection();
        return this.isConnected;
    }

    async checkObsConnection() {
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
        // Listen for connection opened
        (async () => {
            const channel = this.socket.subscribe('obs:ConnectionOpened');
            for await (let data of channel) {
                this.isConnected = true;
                if (this.onConnectionChange) this.onConnectionChange(true);
            }
        })();

        // Listen for connection closed
        (async () => {
            const channel = this.socket.subscribe('obs:ConnectionClosed');
            for await (let data of channel) {
                this.isConnected = false;
                if (this.onConnectionChange) this.onConnectionChange(false);
            }
        })();

        // Listen for scene change
        (async () => {
            const channel = this.socket.subscribe('obs:CurrentProgramSceneChanged');
            for await (let data of channel) {
                this.currentScene = data.sceneName;
                if (this.onSceneChange) this.onSceneChange(data.sceneName);
            }
        })();

        // Listen for identified (re-check status)
        (async () => {
            const channel = this.socket.subscribe('obs:Identified');
            for await (let data of channel) {
                await this.checkObsConnection();
            }
        })();
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
