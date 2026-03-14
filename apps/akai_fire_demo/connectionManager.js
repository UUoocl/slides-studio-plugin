/* global socketClusterClient */

export class FireConnectionManager {
  constructor(options = {}) {
    this.mode = options.mode || 'direct'; // 'direct' or 'socket'
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onMidiMessage = options.onMidiMessage || (() => {});
    this.isConnected = false;
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.socket = null;
    this.deviceName = options.deviceName || 'Akai Fire';
  }

  async listDevices() {
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      const devices = [];
      const seenNames = new Set();
      for (const output of this.midiAccess.outputs.values()) {
        if (!seenNames.has(output.name)) {
          devices.push({ id: output.id, name: output.name });
          seenNames.add(output.name);
        }
      }
      return devices;
    } catch (err) {
      this.onStatusChange('error', `MIDI Access Denied: ${err.message}`);
      return [];
    }
  }

  setDevice(deviceId) {
    if (!this.midiAccess) return;
    this.input = null;
    this.output = null;

    if (!deviceId) return;

    for (const output of this.midiAccess.outputs.values()) {
      if (output.id === deviceId || output.name === deviceId) {
        this.output = output;
        this.deviceName = output.name;
        break;
      }
    }

    if (this.output) {
      for (const input of this.midiAccess.inputs.values()) {
        if (input.name === this.output.name) {
          this.input = input;
          break;
        }
      }
    }
  }

  async connect() {
    if (this.mode === 'direct') {
      return this.connectWebMIDI();
    } else {
      return this.connectSocketCluster();
    }
  }

  async connectWebMIDI() {
    if (!this.input || !this.output) {
      this.onStatusChange('error', 'Please select a device first');
      return false;
    }

    try {
      this.input.onmidimessage = (msg) => this.onMidiMessage(msg.data);
      this.isConnected = true;
      this.onStatusChange('connected', `WebMIDI: ${this.output.name}`);
      return true;
    } catch (err) {
      this.onStatusChange('error', `WebMIDI Error: ${err.message}`);
      return false;
    }
  }

  async connectSocketCluster() {
    try {
      this.socket = socketClusterClient.create({
        hostname: '127.0.0.1',
        port: 8080 // Default Slides-Studio port
      });

      this.onStatusChange('error', 'Connecting to SocketCluster...');

      for await (const { error } of this.socket.listener('error')) {
        console.error('Socket error:', error);
      }

      for await (const status of this.socket.listener('connect')) {
        this.isConnected = true;
        this.onStatusChange('connected', `SocketCluster: ${this.deviceName}`);
        this.setupSocketChannels();
      }

      return true;
    } catch (err) {
      this.onStatusChange('error', `Socket Error: ${err.message}`);
      return false;
    }
  }

  async setupSocketChannels() {
    const inChannel = this.socket.subscribe(`midi_in_${this.deviceName}`);
    for await (const data of inChannel) {
      if (data && data.message) {
        this.onMidiMessage(new Uint8Array(Object.values(data.message)));
      }
    }
  }

  send(data) {
    if (this.mode === 'direct' && this.output) {
      this.output.send(data);
    } else if (this.mode === 'socket' && this.socket && this.socket.state === 'open') {
      this.socket.transmitPublish(`midi_out_${this.deviceName}`, {
        message: Array.from(data)
      });
    }
  }
}
