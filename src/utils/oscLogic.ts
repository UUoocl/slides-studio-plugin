import { Client, Server, Message } from 'node-osc';
import { Notice } from 'obsidian';
import { OscDeviceSetting } from '../types';

interface ActiveOscConnection {
    client: Client;
    server: Server;
}

export class OscManager {
    private activeOscDevices: Map<string, ActiveOscConnection> = new Map();
    
    // FIX: Replaced 'any' with 'Message'
    private onOscMessageReceived: (name: string, msg: Message) => void;

    // FIX: Replaced 'any' with 'Message'
    constructor(onMessage: (name: string, msg: Message) => void) {
        this.onOscMessageReceived = onMessage;
    }

    public connectDevice(deviceSettings: OscDeviceSetting): void {
        // Cleanup existing connection if it exists
        this.disconnectDevice(deviceSettings.name);

        new Notice(`Starting OSC: ${deviceSettings.name}`);

        try {
            // FIX: Removed parseInt since ports are already numbers in types.ts
            const oscClient = new Client(deviceSettings.ip, deviceSettings.outPort);
            const oscServer = new Server(deviceSettings.inPort, '0.0.0.0');

            oscServer.on("listening", () => {
                new Notice(`OSC Server ${deviceSettings.name} is listening on ${deviceSettings.inPort}.`);
            });

            // The 'msg' here is automatically typed as Message by node-osc
            oscServer.on("message", (msg: Message) => {
                if (this.onOscMessageReceived) {
                    this.onOscMessageReceived(deviceSettings.name, msg);
                }
            });

            this.activeOscDevices.set(deviceSettings.name, {
                client: oscClient,
                server: oscServer
            });

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`Failed to start OSC device ${deviceSettings.name}`, errorMsg);
            new Notice(`Failed to start OSC: ${deviceSettings.name}`);
        }
    }

    public disconnectDevice(name: string): void {
        const active = this.activeOscDevices.get(name);
        if (active) {
            void active.client.close(); 
            void active.server.close();
            this.activeOscDevices.delete(name);
        }
    }

    public disconnectAll(): void {
        this.activeOscDevices.forEach((conn) => {
            void conn.client.close();
            void conn.server.close();
        });
        this.activeOscDevices.clear();
    }

    public sendMessage(deviceName: string, message: Message): void {
        const activeDevice = this.activeOscDevices.get(deviceName);
        if (activeDevice) {
            activeDevice.client.send(message, (err) => {
                if (err) {
                    console.error(`Error sending to ${deviceName}:`, err);
                }
            });
        } else {
            console.warn(`OSC Device '${deviceName}' not connected or found.`);
        }
    }
}