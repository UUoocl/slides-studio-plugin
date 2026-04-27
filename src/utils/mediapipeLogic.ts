import { OBSWebSocket } from 'obs-websocket-js';
import { MediaPipeDeviceSetting, WssDetails } from '../types';
import type slidesStudioPlugin from '../main';
import { FilesetResolver, FaceLandmarker, HandLandmarker, PoseLandmarker, FaceLandmarkerResult, HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { FileSystemAdapter } from 'obsidian';

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

/**
 * Manages MediaPipe vision tasks (Face, Hand, Pose detection).
 * Uses a separate OBS WebSocket connection to fetch screenshots and process them.
 */
export class MediaPipeManager {
    private plugin: slidesStudioPlugin;
    private obs: OBSWebSocket;
    private isObsConnected = false;
    private vision: WasmFileset | null = null;
    private faceLandmarker: FaceLandmarker | null = null;
    private handLandmarker: HandLandmarker | null = null;
    private poseLandmarker: PoseLandmarker | null = null;
    private activeLoops = new Map<string, boolean>();

    constructor(plugin: slidesStudioPlugin) {
        this.plugin = plugin;
        this.obs = new OBSWebSocket();
    }

    /**
     * Initializes the MediaPipe vision tasks.
     * Loads WASM files and models from the plugin's local directory.
     */
    private async ensureInitialized() {
        if (this.vision) return;

        const adapter = this.plugin.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) return;
        
        // FilesetResolver for Node.js environment might need specific configuration
        // In Obsidian (Electron), we might need to point to the local filesystem or a URL
        const wasmUrl = `http://127.0.0.1:${this.plugin.settings.serverPort}/mediapipe_models/wasm`;
        
        this.vision = await FilesetResolver.forVisionTasks(wasmUrl);
    }

    private async getFaceLandmarker() {
        if (this.faceLandmarker) return this.faceLandmarker;
        await this.ensureInitialized();
        if (!this.vision) throw new Error("Vision not initialized");
        const modelUrl = `http://127.0.0.1:${this.plugin.settings.serverPort}/mediapipe_models/face_landmarker.task`;
        this.faceLandmarker = await FaceLandmarker.createFromOptions(this.vision, {
            baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
            outputFaceBlendshapes: true,
            runningMode: "IMAGE",
            numFaces: 1
        });
        return this.faceLandmarker;
    }

    private async getHandLandmarker() {
        if (this.handLandmarker) return this.handLandmarker;
        await this.ensureInitialized();
        if (!this.vision) throw new Error("Vision not initialized");
        const modelUrl = `http://127.0.0.1:${this.plugin.settings.serverPort}/mediapipe_models/hand_landmarker.task`;
        this.handLandmarker = await HandLandmarker.createFromOptions(this.vision, {
            baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
            runningMode: "IMAGE",
            numHands: 2
        });
        return this.handLandmarker;
    }

    private async getPoseLandmarker() {
        if (this.poseLandmarker) return this.poseLandmarker;
        await this.ensureInitialized();
        if (!this.vision) throw new Error("Vision not initialized");
        const modelUrl = `http://127.0.0.1:${this.plugin.settings.serverPort}/mediapipe_models/pose_landmarker_lite.task`;
        this.poseLandmarker = await PoseLandmarker.createFromOptions(this.vision, {
            baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
            runningMode: "IMAGE",
            numPoses: 1
        });
        return this.poseLandmarker;
    }

    /**
     * Connects to OBS via a separate WebSocket instance.
     */
    public async connect(details: WssDetails) {
        try {
            if (this.isObsConnected) await this.obs.disconnect();
            await this.obs.connect(`ws://${details.IP}:${details.PORT}`, details.PW, {
                eventSubscriptions: 0
            });
            this.isObsConnected = true;
        } catch (err) {
            console.error("[MediaPipe] Failed to connect to OBS", err);
        }
    }

    public async disconnect() {
        this.activeLoops.clear();
        if (this.isObsConnected) {
            await this.obs.disconnect();
            this.isObsConnected = false;
        }
    }

    /**
     * Starts the vision task detection loop for a specific device setting.
     */
    public async startTask(setting: MediaPipeDeviceSetting) {
        if (!setting.enabled) return;
        if (this.activeLoops.get(setting.name)) return;

        this.activeLoops.set(setting.name, true);

        void this.runTaskLoop(setting);
    }

    public stopTask(name: string) {
        this.activeLoops.delete(name);
    }

    private async runTaskLoop(setting: MediaPipeDeviceSetting) {
        while (this.activeLoops.get(setting.name)) {
            const startTime = Date.now();

            if (!this.isObsConnected) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            try {
                // Use callBatch (RequestBatch) for fetching the screenshot
                const batchResults = await this.obs.callBatch([
                    {
                        requestType: 'GetSourceScreenshot',
                        requestData: {
                            sourceName: setting.sourceName,
                            imageFormat: 'png',
                            imageWidth: setting.width || 200
                        }
                    }
                ]);

                const response = batchResults[0]?.responseData as { imageData?: string } | undefined;

                if (response && response.imageData) {
                    await this.processScreenshot(setting, response.imageData);
                }
            } catch (err) {
                console.error(`[MediaPipe] Screenshot batch failed for ${setting.name}:`, err);
            }

            const elapsed = Date.now() - startTime;
            const targetInterval = 1000 / (setting.fps || 1);
            const delay = Math.max(0, targetInterval - elapsed);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    private async processScreenshot(setting: MediaPipeDeviceSetting, base64Data: string) {
        const fullDataUrl = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
        
        try {
            // Decoded image using browser API (available in Electron renderer)
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = fullDataUrl;
            });

            let result: FaceLandmarkerResult | HandLandmarkerResult | PoseLandmarkerResult | null = null;
            if (setting.type === 'face') {
                const model = await this.getFaceLandmarker();
                result = model.detect(img);
            } else if (setting.type === 'hand') {
                const model = await this.getHandLandmarker();
                result = model.detect(img);
            } else if (setting.type === 'pose') {
                const model = await this.getPoseLandmarker();
                result = model.detect(img);
            }

            if (result) {
                this.plugin.serverManager?.broadcastMediaPipeMessage(setting.name, {
                    type: setting.type,
                    source: setting.sourceName,
                    result,
                    timestamp: Date.now()
                });
            }
        } catch (err) {
            console.error(`[MediaPipe] Processing failed for ${setting.name}:`, err);
        }
    }
}
