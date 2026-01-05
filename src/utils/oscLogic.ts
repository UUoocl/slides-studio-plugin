import { Client, Server, Message } from 'node-osc';
import { Notice } from 'obsidian';
import { OscDeviceSetting } from '../types';

interface ActiveOscConnection {
    client: Client;
    server: Server;
}

/**
 * Manages Open Sound Control (OSC) connections.
 * Handles creating clients/servers for bidirectional communication with OSC devices.
 */
export class OscManager {
    private activeOscDevices: Map<string, ActiveOscConnection> = new Map();
    
    // Received messages from a Server are arrays: [address, ...args]
    private onOscMessageReceived: (name: string, msg: unknown[]) => void;

    constructor(onMessage: (name: string, msg: unknown[]) => void) {
        this.onOscMessageReceived = onMessage;
    }

    /**
     * Connects to a specific OSC device.
     * Sets up both a client (for sending) and a server (for receiving).
     * @param deviceSettings - The configuration for the device (IP, ports).
     */
    public connectDevice(deviceSettings: OscDeviceSetting): void {
        this.disconnectDevice(deviceSettings.name);

        new Notice(`Starting OSC: ${deviceSettings.name}`);

        try {
            const oscClient = new Client(deviceSettings.ip, deviceSettings.outPort);
            const oscServer = new Server(deviceSettings.inPort, '0.0.0.0');
            oscServer.on("listening", () => {
                new Notice(`OSC Server: ${deviceSettings.name} is listening on ${deviceSettings.inPort}.`);
            });

            // FIX: Incoming messages are arrays, not Message instances
            oscServer.on("message", (msg: unknown[]) => {
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

    /**
     * Disconnects a specific OSC device by name.
     * Closes both the client and server connections.
     * @param name - The name of the device to disconnect.
     */
    public disconnectDevice(name: string): void {
        const active = this.activeOscDevices.get(name);
        if (active) {
            // node-osc close methods are synchronous/void or handle their own callbacks
            void active.client.close(); 
            void active.server.close(); 
            this.activeOscDevices.delete(name);
        }
    }

    /**
     * Disconnects all active OSC devices.
     */
    public disconnectAll(): void {
        this.activeOscDevices.forEach((conn) => {
            void conn.client.close(); 
            void conn.server.close(); 
        });
        this.activeOscDevices.clear();
    }

    /**
     * Sends an OSC message to a connected device.
     * @param deviceName - The name of the target device.
     * @param message - The OSC Message object to send.
     */
    // Outgoing messages use the Message class
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