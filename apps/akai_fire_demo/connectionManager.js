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

  async connect() {
    if (this.mode === 'direct') {
      return this.connectWebMIDI();
    } else {
      return this.connectSocketCluster();
    }
  }

  async connectWebMIDI() {
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.findDevice();
      if (this.input && this.output) {
        this.input.onmidimessage = (msg) => this.onMidiMessage(msg.data);
        this.isConnected = true;
        this.onStatusChange('connected', 'WebMIDI Connected');
        return true;
      } else {
        throw new Error('Device not found');
      }
    } catch (err) {
      this.onStatusChange('error', `WebMIDI Error: ${err.message}`);
      return false;
    }
  }

  findDevice() {
    for (const input of this.midiAccess.inputs.values()) {
      if (input.name.includes(this.deviceName)) this.input = input;
    }
    for (const output of this.midiAccess.outputs.values()) {
      if (output.name.includes(this.deviceName)) this.output = output;
    }
  }

  async connectSocketCluster() {
    // Placeholder for SC integration - will be expanded in Phase 2
    this.onStatusChange('error', 'SocketCluster integration pending Phase 2');
    return false;
  }

  send(data) {
    if (this.mode === 'direct' && this.output) {
      this.output.send(data);
    } else if (this.mode === 'socket' && this.socket) {
      // SC send logic here
    }
  }
}
