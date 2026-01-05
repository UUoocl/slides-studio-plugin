import { WebMidi, Input, Output, MessageEvent } from "webmidi";
import { Notice } from "obsidian";
import { MidiDeviceSetting, MidiPayload } from "../types"; // Import from types

interface WebMidiMessageInternal {
    note?: { number: number };
    velocity?: number;
    value?: number;
    controller?: { number: number };
}

/**
 * Manages MIDI device connections and message routing.
 * Uses WebMidi.js to interface with hardware MIDI controllers.
 */
export class MidiManager {
    private isEnabled = false;
    private onMidiMessageReceived: (deviceName: string, msg: MidiPayload) => void;

    constructor(onMessage: (deviceName: string, msg: MidiPayload) => void) {
        this.onMidiMessageReceived = onMessage;
    }

    /**
     * Enables the WebMidi subsystem.
     * Must be called before any MIDI operations can occur.
     */
    public async enable(): Promise<void> {
        if (this.isEnabled) return;
        
        try {
            await WebMidi.enable();
            this.isEnabled = true;
            new Notice("Web midi enabled");
        } catch (err) {
            console.error("Web midi could not be enabled", err);
            new Notice("Failed to enable web midi");
        }
    }

    /**
     * Returns a list of available MIDI input device names.
     */
    public getInputs(): string[] {
        if (!this.isEnabled) return [];
        return WebMidi.inputs.map(i => i.name);
    }

    /**
     * Returns a list of available MIDI output device names.
     */
    public getOutputs(): string[] {
        if (!this.isEnabled) return [];
        return WebMidi.outputs.map(o => o.name);
    }

    /**
     * Connects to a specified MIDI input device.
     * Starts listening for 'midimessage' events and forwards them to the handler.
     * @param setting - The MIDI device configuration.
     */
    public connectDevice(setting: MidiDeviceSetting): void {
        if (!this.isEnabled) {
            new Notice("Midi not enabled. Cannot connect.");
            return;
        }

        const input: Input = WebMidi.getInputByName(setting.inputName);
        if (input) {
            input.removeListener("midimessage");
            new Notice(`Listening to MIDI: ${setting.name}`);

            input.addListener("midimessage", (e: MessageEvent) => {
                // Cast to our internal interface to avoid 'any'
                const msg = e.message as unknown as WebMidiMessageInternal;
                
                const payload: MidiPayload = {
                    type: e.message.type,
                    data: Array.from(e.message.data), 
                    channel: e.message.channel,
                    command: e.message.command,
                    note: msg.note ? msg.note.number : null,
                    velocity: msg.velocity,
                    value: msg.value,
                    controller: msg.controller ? msg.controller.number : null
                };

                if (this.onMidiMessageReceived) {
                    this.onMidiMessageReceived(setting.name, payload);
                }
            });
        } else {
            console.warn(`MIDI Input '${setting.inputName}' not found.`);
        }
    }

    /**
     * Disconnects a MIDI input device.
     * Stops listening for messages.
     * @param setting - The MIDI device configuration.
     */
    public disconnectDevice(setting: MidiDeviceSetting): void {
        if (!this.isEnabled) return;
        const input = WebMidi.getInputByName(setting.inputName);
        if (input) {
            input.removeListener("midimessage");
            console.warn(`Disconnected MIDI Input: ${setting.inputName}`);
        }
    }

    /**
     * Disconnects all configured MIDI devices.
     * @param devices - Array of MIDI device settings to disconnect.
     */
    public disconnectAll(devices: MidiDeviceSetting[]): void {
        devices.forEach(d => this.disconnectDevice(d));
    }

    /**
     * Sends a MIDI message to a specific output device.
     * Supports NoteOn, NoteOff, and ControlChange (CC) messages.
     * @param deviceName - The alias name of the device (must match a configured device).
     * @param deviceList - The list of configured devices to look up the output port.
     * @param messageData - The MIDI message payload.
     */
    public sendMidiMessage(deviceName: string, deviceList: MidiDeviceSetting[], messageData: MidiPayload): void {
        if (!this.isEnabled) return;

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

        const type = messageData.type || "noteon";
        const channel = messageData.channel || 1;
        
        try {
            switch (type.toLowerCase()) {
                case "noteon":
                    if (messageData.note !== undefined && messageData.note !== null) {
                        output.playNote(messageData.note, { channels: channel, attack: messageData.velocity || 0.75 });
                    }
                    break;
                case "noteoff":
                    if (messageData.note !== undefined && messageData.note !== null) {
                        output.stopNote(messageData.note, { channels: channel });
                    }
                    break;
                case "controlchange":
                case "cc":
                    if (messageData.controller !== undefined && messageData.controller !== null && messageData.value !== undefined) {
                        output.sendControlChange(messageData.controller, messageData.value, { channels: channel });
                    }
                    break;
                default:
                    console.warn("Unknown MIDI message type requested:", type);
            }
        } catch (e) {
            console.error("Error sending MIDI message", e);
        }
    }
}