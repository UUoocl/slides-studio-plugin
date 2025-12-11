import { Client, Server, Message } from 'node-osc';
import { Notice } from 'obsidian';

export interface OscDeviceSetting {
    name: string;
    ip: string;
    inPort: string;
    outPort: string;
}

interface ActiveOscConnection {
    client: Client;
    server: Server;
}

export class OscManager {
    private activeOscDevices: Map<string, ActiveOscConnection> = new Map();
    // Callback now includes the device name
    private onOscMessageReceived: (name: string, msg: any) => void;

    constructor(onMessage: (name: string, msg: any) => void) {
        this.onOscMessageReceived = onMessage;
    }

    public connectDevice(deviceSettings: OscDeviceSetting) {
        // Cleanup existing connection if it exists
        this.disconnectDevice(deviceSettings.name);

        new Notice(`Starting OSC: ${deviceSettings.name}`);

        try {
            const oscClient = new Client(deviceSettings.ip, parseInt(deviceSettings.outPort));
            const oscServer = new Server(parseInt(deviceSettings.inPort), '0.0.0.0');

            oscServer.on("listening", () => {
                new Notice(`OSC Server ${deviceSettings.name} is listening on ${deviceSettings.inPort}.`);
            });

            oscServer.on("message", (msg) => {
                console.log(`Message from ${deviceSettings.name}: ${msg}`);
                // Forward the device name AND the message back to the plugin
                if (this.onOscMessageReceived) {
                    this.onOscMessageReceived(deviceSettings.name, msg);
                }
            });

            this.activeOscDevices.set(deviceSettings.name, {
                client: oscClient,
                server: oscServer
            });

        } catch (err) {
            console.error(`Failed to start OSC device ${deviceSettings.name}`, err);
            new Notice(`Failed to start OSC: ${deviceSettings.name}`);
        }
    }

    public disconnectDevice(name: string) {
        if (this.activeOscDevices.has(name)) {
            const active = this.activeOscDevices.get(name);
            try { active.client.close(); } catch (e) { }
            try { active.server.close(); } catch (e) { }
            this.activeOscDevices.delete(name);
        }
    }

    public disconnectAll() {
        this.activeOscDevices.forEach((conn, name) => {
            try { conn.client.close(); } catch (e) { }
            try { conn.server.close(); } catch (e) { }
        });
        this.activeOscDevices.clear();
    }

    public sendMessage(deviceName: string, message: Message) {
        const activeDevice = this.activeOscDevices.get(deviceName);
        if (activeDevice) {
            console.log(`Sending to ${deviceName}`);
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