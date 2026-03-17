import { LaunchpadConnection } from './LaunchpadConnection.js';
import { DEVICE_CONFIG } from './constants.js';

export class QuadLaunchpadManager {
  constructor(onMessageCallback) {
    this.connections = new Map();
    this.midiAccess = null;
    this.onMessageCallback = onMessageCallback; // (deviceId, msgData) => void

    // Initialize the 4 connections based on DEVICE_CONFIG
    for (const deviceId of Object.keys(DEVICE_CONFIG)) {
      this.connections.set(deviceId, new LaunchpadConnection(deviceId, (id, data) => this.handleMessage(id, data)));
    }
  }

  async init() {
    if (navigator.requestMIDIAccess) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
        for (const connection of this.connections.values()) {
          await connection.setMidiAccess(this.midiAccess);
        }
        // Listen for changes in MIDI devices
        this.midiAccess.onstatechange = () => {
          if (this.onMidiStateChange) {
            this.onMidiStateChange();
          }
        };
      } catch (err) {
        console.warn(`MIDI Access Error: ${err.message}`);
      }
    } else {
      console.warn('WebMIDI not supported in this browser.');
    }
  }

  getMidiInputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values());
  }

  getMidiOutputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.outputs.values());
  }

  async connectDevice(deviceId, mode, inputId, outputId, alias) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error(`Unknown device ID: ${deviceId}`);
    return await connection.connect(mode, inputId, outputId, alias);
  }

  async disconnectDevice(deviceId) {
    const connection = this.connections.get(deviceId);
    if (!connection) throw new Error(`Unknown device ID: ${deviceId}`);
    await connection.disconnect();
  }

  getConnection(deviceId) {
    return this.connections.get(deviceId);
  }

  sendToAll(payload) {
    for (const connection of this.connections.values()) {
      connection.sendMidi(payload);
    }
  }

  sendToDevice(deviceId, payload) {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.sendMidi(payload);
    }
  }

  enterProgrammerModeAll() {
    for (const connection of this.connections.values()) {
      if (connection.isConnected) {
        connection.enterProgrammerMode();
      }
    }
  }

  handleMessage(deviceId, data) {
    if (this.onMessageCallback) {
      this.onMessageCallback(deviceId, data);
    }
  }
}
