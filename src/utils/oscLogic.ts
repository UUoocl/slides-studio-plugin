import { Client, Server, Message } from 'node-osc';
import { Notice } from 'obsidian';
import { OscDeviceSetting } from '../types';

interface ActiveOscConnection {
    client: Client;
    server: Server;
}

interface OscClientWithDetails {
    host?: string;
    port?: number;
    send(message: Message, callback?: (err: Error | null) => void): void;
}

/**
 * Manages Open Sound Control (OSC) connections.
 * Handles creating clients/servers for bidirectional communication with OSC devices.
 */
export class OscManager {
    private activeOscDevices: Map<string, ActiveOscConnection> = new Map();
    private activeSettings: Map<string, OscDeviceSetting> = new Map();
    
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
            const oscClient = new Client(deviceSettings.outputAddress, deviceSettings.outputPort);
            const oscServer = new Server(deviceSettings.inputPort, '0.0.0.0');
            oscServer.on("listening", () => {
                new Notice(`OSC Server: ${deviceSettings.name} is listening on ${deviceSettings.inputPort}.`);
            });

            oscServer.on("error", (err: any) => {
                console.error(`[OscManager] Server error for ${deviceSettings.name}:`, err);
                new Notice(`OSC Error: ${deviceSettings.name} - ${err.message || err}`);
            });

            // Handle bundles
            oscServer.on("bundle", (bundle: any) => {
                if (deviceSettings.consoleLogEnabled) {
                    console.warn(`[OscManager] Received OSC Bundle for ${deviceSettings.name}:`, bundle);
                }
                
                // Forward each message in the bundle
                if (bundle.elements && this.onOscMessageReceived) {
                    bundle.elements.forEach((el: any) => {
                        if (Array.isArray(el)) {
                            this.onOscMessageReceived(deviceSettings.name, el);
                        }
                    });
                }
            });

            // FIX: Incoming messages are arrays, not Message instances
            oscServer.on("message", (msg: unknown[]) => {
                if (deviceSettings.consoleLogEnabled) {
                    console.warn(`[OscManager] Received OSC Message for ${deviceSettings.name}:`, msg);
                }

                if (this.onOscMessageReceived) {
                    this.onOscMessageReceived(deviceSettings.name, msg);
                }
            });

            this.activeOscDevices.set(deviceSettings.name, {
                client: oscClient,
                server: oscServer
            });
            this.activeSettings.set(deviceSettings.name, deviceSettings);

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
            this.activeSettings.delete(name);
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
        this.activeSettings.clear();
    }

    /**
     * Sends an OSC message to a connected device.
     * @param deviceName - The name of the target device.
     * @param message - The OSC Message object to send.
     */
    // Outgoing messages use the Message class
    public sendMessage(deviceName: string, message: Message): void {
        let activeDevice = this.activeOscDevices.get(deviceName);
        
        // Case-insensitive fallback
        if (!activeDevice) {
            const lowerName = deviceName.toLowerCase();
            for (const [name, conn] of this.activeOscDevices.entries()) {
                if (name.toLowerCase() === lowerName) {
                    activeDevice = conn;
                    deviceName = name; // Use the correct case for logging
                    break;
                }
            }
        }

        if (activeDevice) {
            const client = activeDevice.client as unknown as OscClientWithDetails;
            // Accessing private fields for debug logging
            const host = client.host || 'unknown';
            const port = client.port || 'unknown';

            const deviceSettings = this.activeSettings.get(deviceName);
            if (deviceSettings?.consoleLogEnabled) {
                console.warn(`[OscManager] Sending OSC to ${deviceName} at ${host}:${port}`, message);
            }

            client.send(message, (err) => {
                if (err) {
                    console.error(`[OscManager] Error sending to ${deviceName}:`, err);
                } else if (deviceSettings?.consoleLogEnabled) {
                    console.warn(`[OscManager] Successfully sent OSC message to ${deviceName}`);
                }
            });
        } else {
            console.warn(`[OscManager] OSC Device '${deviceName}' not connected or found. Available:`, Array.from(this.activeOscDevices.keys()));
        }
    }
}
