import { WebMidi, Input, Output, MessageEvent } from "webmidi";
import { Notice } from "obsidian";

export interface MidiDeviceSetting {
    name: string;      // User defined alias (e.g. "My Keyboard")
    inputName: string; // System Input Name (e.g. "Keystation 49")
    outputName: string;// System Output Name
}

export class MidiManager {
    private isEnabled: boolean = false;
    // Callback to send data back to main plugin (which sends to OBS)
    private onMidiMessageReceived: (deviceName: string, msg: any) => void;

    constructor(onMessage: (deviceName: string, msg: any) => void) {
        this.onMidiMessageReceived = onMessage;
    }

    public async enable(): Promise<void> {
        if (this.isEnabled) return;
        
        try {
            await WebMidi.enable();
            this.isEnabled = true;
            console.log("WebMidi enabled!");
            new Notice("MIDI System Enabled");
        } catch (err) {
            console.error("WebMidi could not be enabled", err);
            new Notice("Failed to enable MIDI system");
        }
    }

    public getInputs(): string[] {
        if (!this.isEnabled) return [];
        return WebMidi.inputs.map(i => i.name);
    }

    public getOutputs(): string[] {
        if (!this.isEnabled) return [];
        return WebMidi.outputs.map(o => o.name);
    }

    public connectDevice(setting: MidiDeviceSetting) {
        if (!this.isEnabled) {
            new Notice("MIDI not enabled. Cannot connect.");
            return;
        }

        // 1. Connect Input
        const input: Input = WebMidi.getInputByName(setting.inputName);
        if (input) {
            // Remove existing listeners to avoid duplicates if re-connecting
            input.removeListener("midimessage");
            
            console.log(`Connected to MIDI Input: ${setting.inputName}`);
            new Notice(`Listening to MIDI: ${setting.name}`);

            // Listen to all MIDI messages
            input.addListener("midimessage", (e: MessageEvent) => {
                // Simplify the object for OBS
                const payload = {
                    type: e.message.type,
                    // @ts-ignore - dataBytes exists on message
                    data: e.message.dataBytes, 
                    channel: e.message.channel,
                    command: e.message.command,
                    // specific helpers depending on type
                    note: (e.message as any).note ? (e.message as any).note.number : null,
                    velocity: (e.message as any).velocity,
                    value: (e.message as any).value, // For CC
                    controller: (e.message as any).controller ? (e.message as any).controller.number : null // For CC
                };

                // Send to main -> OBS
                if (this.onMidiMessageReceived) {
                    this.onMidiMessageReceived(setting.name, payload);
                }
            });
        } else {
            console.warn(`MIDI Input '${setting.inputName}' not found.`);
        }
    }

    public disconnectDevice(setting: MidiDeviceSetting) {
        if (!this.isEnabled) return;
        const input = WebMidi.getInputByName(setting.inputName);
        if (input) {
            input.removeListener("midimessage");
            console.log(`Disconnected MIDI Input: ${setting.inputName}`);
        }
    }

    public disconnectAll(devices: MidiDeviceSetting[]) {
        devices.forEach(d => this.disconnectDevice(d));
    }

    // Handle outgoing messages from OBS -> MIDI Device
    public sendMidiMessage(deviceName: string, deviceList: MidiDeviceSetting[], messageData: any) {
        if (!this.isEnabled) return;

        // Find the settings for the target alias
        const deviceSetting = deviceList.find(d => d.name === deviceName);
        if (!deviceSetting) {
            console.warn(`MIDI Device alias '${deviceName}' not found in settings.`);
            return;
        }

        const output: Output = WebMidi.getOutputByName(deviceSetting.outputName);
        if (!output) {
            console.warn(`MIDI Output '${deviceSetting.outputName}' not found.`);
            return;
        }

        // Basic parsing of the request from OBS
        // Expected format from OBS arg1: "noteon", "controlchange", etc.
        const type = messageData.type || "noteon";
        const channel = messageData.channel || 1;
        
        try {
            switch (type.toLowerCase()) {
                case "noteon":
                    output.playNote(messageData.note, { channels: channel, attack: messageData.velocity || 0.75 });
                    break;
                case "noteoff":
                    output.stopNote(messageData.note, { channels: channel });
                    break;
                case "controlchange":
                case "cc":
                    output.sendControlChange(messageData.controller, messageData.value, { channels: channel });
                    break;
                default:
                    console.warn("Unknown MIDI message type requested:", type);
            }
        } catch (e) {
            console.error("Error sending MIDI message", e);
        }
    }
}