import { create } from '../lib/socketcluster-client.min.js';
import { generateProgrammerModeMsg } from '../launchpad_mk3_demo/launchpadCore.js';

export class LaunchpadConnection {
  constructor(deviceId, onMessageCallback) {
    this.deviceId = deviceId;
    this.onMessageCallback = onMessageCallback; // Callback for incoming MIDI from this device
    
    this.socket = null;
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    
    this.isConnected = false;
    this.mode = 'socket'; // 'direct' or 'socket'
    this.alias = `lp_${deviceId.replace(',', '_')}`; // e.g., lp_0_0
  }

  async setMidiAccess(midiAccess) {
    this.midiAccess = midiAccess;
  }

  async connect(mode, inputId, outputId, alias) {
    await this.disconnect();
    
    this.mode = mode;
    this.alias = alias || this.alias;

    if (this.mode === 'socket') {
      return this.connectSocket(this.alias);
    } else {
      return this.connectDirect(inputId, outputId);
    }
  }

  async connectDirect(inputId, outputId) {
    if (!this.midiAccess) throw new Error('MIDI Access not available');
    
    this.input = this.midiAccess.inputs.get(inputId);
    this.output = this.midiAccess.outputs.get(outputId);

    if (this.input && this.output) {
      this.input.onmidimessage = (msg) => {
        if (this.onMessageCallback) this.onMessageCallback(this.deviceId, msg.data);
      };
      this.isConnected = true;
      this.enterProgrammerMode();
      return true;
    } else {
      this.isConnected = false;
      throw new Error('MIDI Input/Output not found');
    }
  }

  async connectSocket(deviceName) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = create({
          hostname: window.location.hostname,
          port: window.location.port || 8080,
          path: '/socketcluster/'
        });

        const onConnect = async () => {
          this.isConnected = true;
          this.subscribeToRemoteMidi(deviceName);
          this.enterProgrammerMode();
          resolve(true);
        };

        if (this.socket.state === 'open') {
          onConnect();
        } else {
          (async () => {
            for await (const {socket: s} of this.socket.listener('connect')) {
              await onConnect();
              break;
            }
          })();
        }

        (async () => {
          for await (const {error} of this.socket.listener('error')) {
            console.error(`Socket error for ${this.deviceId}:`, error);
            if (!this.isConnected) reject(error);
          }
        })();

      } catch (err) {
        reject(err);
      }
    });
  }

  async subscribeToRemoteMidi(deviceName) {
    if (!this.socket) return;
    
    const handleChannel = async (channelName) => {
      const channel = this.socket.subscribe(channelName);
      for await (const data of channel) {
        if (this.mode === 'socket') {
          let midiData = null;
          if (data.message) {
            midiData = data.message.data || data.message;
          } else if (data.data) {
            midiData = data.data;
          } else {
            midiData = data;
          }

          if (midiData) {
            const bytes = (midiData instanceof Uint8Array) ? midiData : new Uint8Array(Object.values(midiData));
            if (this.onMessageCallback) this.onMessageCallback(this.deviceId, bytes);
          }
        }
      }
    };

    handleChannel(`midi_in_${deviceName}`);
    // Optional: subscribe to midi_out if we want to echo other clients' messages, but usually we just send out.
  }

  async disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.input) {
      this.input.onmidimessage = null;
      this.input = null;
    }
    this.output = null;
    this.isConnected = false;
  }

  sendMidi(payload) {
    if (!this.isConnected) return;

    if (this.mode === 'direct') {
      if (this.output && payload.data) {
        this.output.send(payload.data);
      }
    } else {
      if (this.socket && this.socket.state === 'open') {
        const channel = `midi_out_${this.alias}`;
        this.socket.transmitPublish(channel, payload);
      }
    }
  }

  enterProgrammerMode() {
    const msg = generateProgrammerModeMsg();
    this.sendMidi({ type: 'sysex', data: msg });
  }
}
