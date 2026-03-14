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
      for (const output of this.midiAccess.outputs.values()) {
        devices.push({ id: output.id, name: output.name });
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

    // Fire usually has same name/ID for in/out
    for (const input of this.midiAccess.inputs.values()) {
      if (input.id === deviceId || input.name.includes(deviceId)) this.input = input;
    }
    for (const output of this.midiAccess.outputs.values()) {
      if (output.id === deviceId || output.name.includes(deviceId)) this.output = output;
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
      this.onStatusChange('connected', `Connected to ${this.output.name}`);
      return true;
    } catch (err) {
      this.onStatusChange('error', `WebMIDI Connection Error: ${err.message}`);
      return false;
    }
  }

  async connectSocketCluster() {
    this.onStatusChange('error', 'SocketCluster integration pending Phase 2');
    return false;
  }

  send(data) {
    if (this.mode === 'direct' && this.output) {
      this.output.send(data);
    }
  }
}
