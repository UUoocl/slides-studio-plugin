import { Notice } from "obsidian";
import { AudioDeviceSetting } from "../types";

interface ActiveAudioConnection {
    context: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    stream: MediaStream;
    animationFrameId: number;
}

export class AudioManager {
    private activeDevices: Map<string, ActiveAudioConnection> = new Map();
    private onAudioData: (eventName: string, data: number[]) => void;

    constructor(onAudioData: (eventName: string, data: number[]) => void) {
        this.onAudioData = onAudioData;
    }

    public async getDevices(): Promise<MediaDeviceInfo[]> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audioinput');
        } catch (err) {
            console.error("Error enumerating audio devices", err);
            return [];
        }
    }

    public async connectDevice(setting: AudioDeviceSetting): Promise<void> {
        this.disconnectDevice(setting.name);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: setting.deviceId ? { exact: setting.deviceId } : undefined
                }
            });

            const context = new AudioContext({
                sampleRate: setting.sampleRate || 44100
            });

            const source = context.createMediaStreamSource(stream);
            const analyser = context.createAnalyser();
            
            analyser.fftSize = setting.fftSize || 2048;
            analyser.smoothingTimeConstant = setting.smoothingTimeConstant ?? 0.8;

            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const loop = () => {
                if (!this.activeDevices.has(setting.name)) return;

                analyser.getByteFrequencyData(dataArray);
                // Convert to regular array for JSON serialization
                // Use Array.from or loop for performance? Array.from is fine for reasonable FFT sizes.
                // Optimizing: maybe we don't want to send 1024 integers 60 times a second if not needed.
                // But the requirement is just "transform... send".
                
                this.onAudioData(setting.name, Array.from(dataArray));
                
                const frameId = requestAnimationFrame(loop);
                // Update the stored ID so we can cancel it
                const conn = this.activeDevices.get(setting.name);
                if (conn) conn.animationFrameId = frameId;
            };

            const frameId = requestAnimationFrame(loop);

            this.activeDevices.set(setting.name, {
                context,
                source,
                analyser,
                stream,
                animationFrameId: frameId
            });

            new Notice(`Connected audio: ${setting.name}`);

        } catch (err) {
            console.error(`Failed to connect audio device ${setting.name}`, err);
            new Notice(`Failed to connect audio: ${setting.name}`);
        }
    }

    public disconnectDevice(name: string): void {
        const conn = this.activeDevices.get(name);
        if (conn) {
            cancelAnimationFrame(conn.animationFrameId);
            conn.stream.getTracks().forEach(track => track.stop());
            conn.source.disconnect();
            conn.analyser.disconnect();
            void conn.context.close();
            this.activeDevices.delete(name);
        }
    }

    public disconnectAll(devices: AudioDeviceSetting[]): void {
        // Disconnect configured devices
        devices.forEach(d => this.disconnectDevice(d.name));
        // Also cleanup any stragglers in the map
        for (const name of this.activeDevices.keys()) {
            this.disconnectDevice(name);
        }
    }
}
