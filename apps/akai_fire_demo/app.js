import { FireAppLogic } from './appLogic.js';
import { FireMidiLogic } from './midiLogic.js';
import { FireOledLogic } from './oledLogic.js';
import { create } from '../lib/socketcluster-client.min.js';

class FireApp {
  constructor() {
    this.padMatrix = document.getElementById('pad-matrix');
    this.statusText = document.getElementById('status-text');
    this.statusIndicator = document.getElementById('status-indicator');
    this.btnConnect = document.getElementById('btn-connect');
    this.btnScan = document.getElementById('btn-scan');
    this.commModeSelect = document.getElementById('comm-mode');
    this.midiDeviceSelect = document.getElementById('midi-device-select');
    this.appModeSelect = document.getElementById('app-mode');
    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.btnSendOled = document.getElementById('btn-send-oled');
    this.oledTextInput = document.getElementById('oled-text-input');
    this.oledDisplay = document.getElementById('oled-display');
    this.deviceAliasInput = document.getElementById('device-name');
    this.scSelectContainer = document.getElementById('sc-select-container');
    this.midiSelectContainer = document.getElementById('midi-select-container');

    this.appLogic = new FireAppLogic();
    this.oledLogic = new FireOledLogic();
    
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.socket = null;
    this.isConnected = false;
    this.mode = 'socket'; // Default to socket matching APC app

    this.buttonStates = {};
    this.sequencerInterval = null;

    if (this.padMatrix) {
      this.init();
    }
  }

  async init() {
    this.renderMatrix();
    this.setupEventListeners();
    this.updateStatus('Disconnected', false);
    
    await this.requestMidiAccess();
    this.updateCommModeDisplay();
  }

  updateCommModeDisplay() {
    const isDirect = this.commModeSelect.value === 'direct';
    this.midiSelectContainer.style.display = isDirect ? 'block' : 'none';
    this.scSelectContainer.style.display = isDirect ? 'none' : 'block';
  }

  async requestMidiAccess() {
    if (!navigator.requestMIDIAccess) {
      console.warn('WebMIDI not supported');
      return;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.scanDevices();
      this.midiAccess.onstatechange = () => this.scanDevices();
    } catch (err) {
      console.warn(`MIDI Access Error: ${err.message}`);
    }
  }

  scanDevices() {
    if (!this.midiDeviceSelect) return;
    this.midiDeviceSelect.innerHTML = '';
    const outputs = Array.from(this.midiAccess.outputs.values());

    if (outputs.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'No devices found';
      this.midiDeviceSelect.appendChild(opt);
      return;
    }

    outputs.forEach(out => {
      const opt = document.createElement('option');
      opt.value = out.id;
      opt.innerText = out.name;
      if (out.name.toLowerCase().includes('fire')) opt.selected = true;
      this.midiDeviceSelect.appendChild(opt);
    });
  }

  updateStatus(message, isConnected) {
    this.isConnected = isConnected;
    if (this.statusText) this.statusText.textContent = message;
    if (this.statusIndicator) {
      if (isConnected) {
        this.statusIndicator.classList.add('connected');
      } else {
        this.statusIndicator.classList.remove('connected');
      }
    }
    if (this.btnConnect) {
      this.btnConnect.textContent = isConnected ? 'Disconnect' : 'Connect';
    }
  }

  async toggleConnection() {
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    this.mode = this.commModeSelect.value;
    if (this.mode === 'direct') {
      await this.connectDirect(this.midiDeviceSelect.value);
    } else {
      await this.connectSocket(this.deviceAliasInput.value || 'AKAI Fire');
    }
  }

  async connectDirect(deviceId) {
    this.output = this.midiAccess.outputs.get(deviceId);
    this.input = Array.from(this.midiAccess.inputs.values()).find(i => i.name === this.output?.name);

    if (this.input && this.output) {
      this.input.onmidimessage = (msg) => this.handleMidiInput(msg.data);
      this.updateStatus(`Connected to ${this.output.name}`, true);
    } else {
      this.updateStatus('Device not found', false);
    }
  }

  async connectSocket(deviceName) {
    try {
      this.socket = create({
        hostname: window.location.hostname,
        port: window.location.port || 8080,
        path: '/socketcluster/'
      });

      (async () => {
        for await (const {error} of this.socket.listener('error')) {
          console.error('Socket error:', error);
          this.updateStatus(`Socket Error: ${error.message}`, false);
        }
      })();

      (async () => {
        for await (const {socket: s} of this.socket.listener('connect')) {
          this.updateStatus(`Connected to Server (Remote: ${deviceName})`, true);
          this.subscribeToRemoteMidi(deviceName);
        }
      })();

      if (this.socket.state === 'open') {
        this.updateStatus(`Connected to Server (Remote: ${deviceName})`, true);
        this.subscribeToRemoteMidi(deviceName);
      }
    } catch (err) {
      this.updateStatus(`Socket Error: ${err.message}`, false);
    }
  }

  async subscribeToRemoteMidi(deviceName) {
    const handleChannel = async (channelName) => {
      const channel = this.socket.subscribe(channelName);
      for await (const data of channel) {
        if (this.mode === 'socket') {
          let midiData = data.message?.data || data.message || data.data || data;
          if (midiData) {
            const bytes = (midiData instanceof Uint8Array) ? midiData : new Uint8Array(Object.values(midiData));
            this.handleMidiInput(bytes);
          }
        }
      }
    };
    handleChannel(`midi_in_${deviceName}`);
    handleChannel(`midi_out_${deviceName}`);
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
    this.updateStatus('Disconnected', false);
  }

  sendMidi(data) {
    if (this.mode === 'direct') {
      if (this.output) this.output.send(data);
    } else if (this.socket && this.socket.state === 'open') {
      const deviceName = this.deviceAliasInput.value || 'AKAI Fire';
      this.socket.transmitPublish(`midi_out_${deviceName}`, { 
        type: 'raw', 
        data: Array.from(data),
        message: Array.from(data) // Backward compatibility
      });
    }
  }

  setupEventListeners() {
    this.btnConnect.addEventListener('click', () => this.toggleConnection());
    this.btnScan.addEventListener('click', () => this.midiAccess ? this.scanDevices() : this.requestMidiAccess());
    this.commModeSelect.addEventListener('change', () => this.updateCommModeDisplay());

    this.appModeSelect.addEventListener('change', () => {
      if (this.appModeSelect.value === 'sequencer') {
        this.appLogic.startSequencer();
        this.sequencerInterval = setInterval(() => this.tickSequencer(), 125);
      } else {
        this.appLogic.stopSequencer();
        if (this.sequencerInterval) clearInterval(this.sequencerInterval);
        this.sequencerInterval = null;
        this.clearGridUI();
      }
    });

    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.colorSwatches.forEach(s => s.style.border = '1px solid #444');
        swatch.style.border = '2px solid #fff';
        this.appLogic.setSelectedColor(
          parseInt(swatch.dataset.r),
          parseInt(swatch.dataset.g),
          parseInt(swatch.dataset.b)
        );
      });
    });

    this.btnSendOled.addEventListener('click', () => {
      const text = this.oledTextInput.value || 'AKAI FIRE';
      this.oledLogic.clear();
      this.oledLogic.drawText(text, 0, 0);
      this.sendMidi(this.oledLogic.createOledMessage());
      this.oledDisplay.textContent = text;
    });

    // Side buttons (Solo 1-4)
    document.querySelectorAll('.btn-fire').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.id.replace('btn-', '');
        const cc = FireMidiLogic.getButtonCC(id);
        if (!cc) return;
        this.buttonStates[id] = this.buttonStates[id] === 0x02 ? 0x00 : 0x02;
        this.sendMidi(FireMidiLogic.createButtonMessage(cc, this.buttonStates[id]));
        btn.style.backgroundColor = this.buttonStates[id] > 0 ? '#ff5252' : '#2a2a2a';
        btn.style.color = this.buttonStates[id] > 0 ? '#fff' : '#ccc';
      });
    });
  }

  renderMatrix() {
    this.padMatrix.innerHTML = '';
    for (let row = 0; row < 4; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'matrix-row';
      for (let col = 0; col < 16; col++) {
        const pad = document.createElement('div');
        pad.className = 'pad';
        pad.id = `pad-${row}-${col}`;
        pad.dataset.row = row;
        pad.dataset.col = col;
        pad.addEventListener('click', () => {
          if (this.appModeSelect.value === 'paint') {
            const index = row * 16 + col;
            const { r, g, b } = this.appLogic.paintPad(index);
            this.sendMidi(FireMidiLogic.createRGBMessage(index, r, g, b));
            pad.style.backgroundColor = `rgb(${r * 2}, ${g * 2}, ${b * 2})`;
            pad.style.boxShadow = (r+g+b > 0) ? `0 0 10px rgb(${r * 2}, ${g * 2}, ${b * 2})` : 'none';
          }
        });
        rowEl.appendChild(pad);
      }
      this.padMatrix.appendChild(rowEl);
    }
  }

  tickSequencer() {
    const updates = this.appLogic.tick();
    if (!updates) return;
    updates.clearIndices.forEach(index => {
      const pad = document.getElementById(`pad-${Math.floor(index / 16)}-${index % 16}`);
      const color = this.appLogic.getPadColor(index);
      if (pad) {
        pad.style.backgroundColor = (color.r || color.g || color.b) ? `rgb(${color.r * 2}, ${color.g * 2}, ${color.b * 2})` : '';
        pad.style.boxShadow = 'none';
      }
      this.sendMidi(FireMidiLogic.createRGBMessage(index, color.r, color.g, color.b));
    });
    updates.highlightIndices.forEach(index => {
      const pad = document.getElementById(`pad-${Math.floor(index / 16)}-${index % 16}`);
      if (pad) {
        pad.style.backgroundColor = '#ffffff';
        pad.style.boxShadow = '0 0 15px #ffffff';
      }
      this.sendMidi(FireMidiLogic.createRGBMessage(index, 127, 127, 127));
    });
  }

  clearGridUI() {
    for (let i = 0; i < 64; i++) {
      const pad = document.getElementById(`pad-${Math.floor(i / 16)}-${i % 16}`);
      const color = this.appLogic.getPadColor(i);
      if (pad) {
        pad.style.backgroundColor = (color.r || color.g || color.b) ? `rgb(${color.r * 2}, ${color.g * 2}, ${color.b * 2})` : '';
        pad.style.boxShadow = 'none';
      }
    }
  }

  handleMidiInput(data) {
    const input = FireMidiLogic.parseInput(data);
    if (!input) return;
    if (input.type === 'note') {
      const padCoords = FireMidiLogic.getPadFromNote(input.note);
      if (padCoords) {
        const pad = document.getElementById(`pad-${padCoords.row}-${padCoords.col}`);
        if (pad) {
          if (input.isPress) {
            pad.classList.add('active');
            pad.style.backgroundColor = '#ff5252';
          } else {
            pad.classList.remove('active');
            pad.style.backgroundColor = '';
          }
        }
      }
    } else if (input.type === 'cc') {
      const knobName = FireMidiLogic.getKnobFromCC(input.cc);
      if (knobName) {
        const knobEl = document.getElementById(`knob-${knobName}`);
        if (knobEl) {
          const rotation = (input.value <= 0x3F) ? input.value * 5 : (input.value - 0x80) * 5;
          const currentRotation = parseInt(knobEl.dataset.rotation || 0);
          const newRotation = currentRotation + rotation;
          knobEl.style.transform = `rotate(${newRotation}deg)`;
          knobEl.dataset.rotation = newRotation;
        }
      }
    }
  }
}

// Global attachment and export
if (typeof window !== 'undefined') {
  window.FireApp = FireApp;
  // Auto-init only if not in a test environment (e.g. check for Vitest)
  if (!window.__vitest_worker__) {
    window.addEventListener('DOMContentLoaded', () => {
      new FireApp();
    });
  }
}

export { FireApp };
