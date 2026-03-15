import { create } from '../lib/socketcluster-client.min.js';
import {
  GRID_PADS,
  TOP_BUTTONS,
  RIGHT_BUTTONS,
  LOGO_BUTTON,
  generateProgrammerModeMsg,
  generateSolidFill,
  generateRainbowWave,
  generateRandomSparkle,
  generateTextScroll,
  generateCC
} from './launchpadCore.js';

export class LaunchpadApp {
  constructor() {
    this.gridContainer = document.getElementById('virtual-launchpad');
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.deviceNameInput = document.getElementById('device-name');
    
    // Connectivity UI
    this.commModeSelect = document.getElementById('comm-mode');
    this.midiInputSelect = document.getElementById('midi-input-select');
    this.midiOutputSelect = document.getElementById('midi-output-select');
    this.btnScan = document.getElementById('btn-scan');
    this.btnConnect = document.getElementById('btn-connect');
    
    this.socket = null;
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.isConnected = false;
    
    this.currentPattern = null;
    this.animationFrame = null;
    this.patternStep = 0;

    this.init();
  }

  async init() {
    this.generateGrid();
    this.setupEventListeners();
    this.updateStatus('Disconnected', false);
    
    // We request MIDI access, but it shouldn't block SC from working
    this.requestMidiAccess();
    
    // Set initial display states
    this.updateCommModeDisplay();
  }

  async requestMidiAccess() {
    if (!navigator.requestMIDIAccess) {
      console.warn('WebMIDI not supported in this browser.');
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
    if (!this.midiInputSelect || !this.midiOutputSelect) return;
    
    // Populate Inputs
    this.midiInputSelect.innerHTML = '';
    const inputs = Array.from(this.midiAccess.inputs.values());
    if (inputs.length === 0) {
      this.midiInputSelect.appendChild(this.createOption('', 'No inputs found'));
    } else {
      inputs.forEach(input => {
        const opt = this.createOption(input.id, input.name);
        if (input.name.toLowerCase().includes('launchpad') && input.name.toLowerCase().includes('midi')) opt.selected = true;
        this.midiInputSelect.appendChild(opt);
      });
    }

    // Populate Outputs
    this.midiOutputSelect.innerHTML = '';
    const outputs = Array.from(this.midiAccess.outputs.values());
    if (outputs.length === 0) {
      this.midiOutputSelect.appendChild(this.createOption('', 'No outputs found'));
    } else {
      outputs.forEach(out => {
        const opt = this.createOption(out.id, out.name);
        if (out.name.toLowerCase().includes('launchpad') && out.name.toLowerCase().includes('midi')) opt.selected = true;
        this.midiOutputSelect.appendChild(opt);
      });
    }
  }

  createOption(value, text) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.innerText = text;
    return opt;
  }

  updateCommModeDisplay() {
    if (!this.commModeSelect) return;
    const isDirect = this.commModeSelect.value === 'direct';
    const midiSelect = document.getElementById('midi-select-container');
    const scSelect = document.getElementById('sc-select-container');
    if (midiSelect) midiSelect.style.display = isDirect ? 'block' : 'none';
    if (scSelect) scSelect.style.display = isDirect ? 'none' : 'block';
  }

  generateGrid() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const pad = document.createElement('div');
        pad.className = 'pad';
        
        let id = null;
        let label = '';

        if (row === 0) {
          if (col < 8) {
            id = TOP_BUTTONS[col];
            pad.classList.add('top-row', 'round');
            label = `CC ${id}`;
          } else {
            id = LOGO_BUTTON;
            pad.classList.add('logo');
            label = 'LP';
          }
        } else {
          if (col < 8) {
            const gridIndex = (row - 1) * 8 + col;
            id = GRID_PADS[gridIndex];
            label = id;
          } else {
            id = RIGHT_BUTTONS[row - 1];
            pad.classList.add('right-col', 'round');
            label = `CC ${id}`;
          }
        }

        pad.id = `pad-${id}`;
        pad.textContent = label;
        pad.dataset.id = id;
        
        this.gridContainer.appendChild(pad);
      }
    }
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
      this.btnConnect.innerText = isConnected ? 'Disconnect' : 'Connect';
    }
  }

  setupEventListeners() {
    if (document.getElementById('btn-programmer')) {
      document.getElementById('btn-programmer').addEventListener('click', () => this.enterProgrammerMode());
    }
    if (document.getElementById('btn-clear')) {
      document.getElementById('btn-clear').addEventListener('click', () => this.clearAll());
    }

    if (document.getElementById('btn-fill')) {
      document.getElementById('btn-fill').addEventListener('click', () => {
        this.stopPatterns();
        const colorInput = document.getElementById('fill-color');
        const color = colorInput ? parseInt(colorInput.value) : 5;
        const msg = generateSolidFill(color);
        this.sendMidi({ type: 'sysex', data: msg });
      });
    }

    if (document.getElementById('btn-rainbow')) {
      document.getElementById('btn-rainbow').addEventListener('click', () => {
        this.startPatterns(generateRainbowWave);
      });
    }

    if (document.getElementById('btn-sparkle')) {
      document.getElementById('btn-sparkle').addEventListener('click', () => {
        this.startPatterns(() => generateRandomSparkle(5));
      });
    }

    if (document.getElementById('btn-scroll')) {
      document.getElementById('btn-scroll').addEventListener('click', () => {
        this.stopPatterns();
        const textInput = document.getElementById('scroll-text');
        const colorInput = document.getElementById('scroll-color');
        const text = textInput ? textInput.value || 'Hello!' : 'Hello!';
        const color = colorInput ? parseInt(colorInput.value) : 13;
        const msg = generateTextScroll(text, color);
        this.sendMidi({ type: 'sysex', data: msg });
      });
    }

    if (this.commModeSelect) {
      this.commModeSelect.addEventListener('change', () => this.updateCommModeDisplay());
    }

    if (this.btnConnect) {
      this.btnConnect.addEventListener('click', () => this.toggleConnection());
    }

    if (this.btnScan) {
      this.btnScan.addEventListener('click', () => this.scanDevices());
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
    const mode = this.commModeSelect ? this.commModeSelect.value : 'socket';
    if (mode === 'socket') {
      const deviceName = this.deviceNameInput ? this.deviceNameInput.value || 'Launchpad' : 'Launchpad';
      await this.connectSocket(deviceName);
    } else {
      const inputId = this.midiInputSelect ? this.midiInputSelect.value : '';
      const outputId = this.midiOutputSelect ? this.midiOutputSelect.value : '';
      
      if (inputId && outputId) {
        await this.connectDirect(inputId, outputId);
      } else {
        this.updateStatus('Input or Output not selected', false);
      }
    }
  }

  async connectDirect(inputId, outputId) {
    if (!this.midiAccess) return;
    
    console.log(`Attempting Direct WebMIDI connection. Input: ${inputId}, Output: ${outputId}`);
    
    this.input = this.midiAccess.inputs.get(inputId);
    this.output = this.midiAccess.outputs.get(outputId);

    if (this.input && this.output) {
      this.input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      this.updateStatus(`Connected: ${this.output.name}`, true);
      this.enterProgrammerMode();
    } else {
      console.error('Failed to establish bidirectional connection.');
      console.log('Input found:', !!this.input, 'Output found:', !!this.output);
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

      // Handle connection success
      (async () => {
        for await (const {socket: s} of this.socket.listener('connect')) {
          this.updateStatus(`Connected to Server (Remote: ${deviceName})`, true);
          this.enterProgrammerMode();
        }
      })();
    } catch (err) {
      this.updateStatus(`Socket Error: ${err.message}`, false);
    }
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

  sendMidi(payload) {
    const mode = this.commModeSelect ? this.commModeSelect.value : 'socket';
    
    if (mode === 'direct') {
      if (this.output) {
        this.output.send(payload.data);
      }
    } else {
      if (this.socket && this.socket.state === 'open') {
        const deviceName = this.deviceNameInput ? this.deviceNameInput.value || 'Launchpad' : 'Launchpad';
        const channel = `midi_out_${deviceName}`;
        this.socket.transmitPublish(channel, payload);
      }
    }
    
    // Also update virtual grid
    this.updateVirtualGrid(payload);
  }

  updateVirtualGrid(payload) {
    if (payload.type === 'sysex' || payload.type === 'raw') {
      const data = payload.data;
      if (data && data[6] === 0x03) { // Bulk LED
        const payloadData = data.slice(7, data.length - 1);
        for (let i = 0; i < payloadData.length; ) {
          const type = payloadData[i++];
          const index = payloadData[i++];
          const val = payloadData[i++]; 
          
          const pad = document.getElementById(`pad-${index}`);
          if (pad) {
            pad.style.backgroundColor = val > 0 ? this.getPaletteColor(val) : '';
            pad.style.boxShadow = val > 0 ? `0 0 10px ${this.getPaletteColor(val)}` : '';
          }
        }
      }
    }
  }

  getPaletteColor(index) {
    const colors = {
      5: '#ff0000',   // Red
      9: '#ff8000',   // Orange
      13: '#ffff00',  // Yellow
      21: '#00ff00',  // Green
      45: '#0000ff',  // Blue
      53: '#8000ff',  // Purple
      1: '#ffffff',   // White
      0: 'transparent'
    };
    return colors[index] || `hsl(${index * 2.8}, 100%, 50%)`;
  }

  handleMidiMessage(msg) {
    // This will be implemented in Phase 3
    console.log('MIDI message received:', msg.data);
  }

  enterProgrammerMode() {
    const msg = generateProgrammerModeMsg();
    this.sendMidi({ type: 'sysex', data: msg });
  }

  clearAll() {
    this.stopPatterns();
    const msg = generateSolidFill(0);
    this.sendMidi({ type: 'sysex', data: msg });
  }

  startPatterns(patternFn) {
    this.stopPatterns();
    this.currentPattern = patternFn;
    this.patternStep = 0;
    
    const loop = () => {
      if (!this.currentPattern) return;
      const msg = this.currentPattern(this.patternStep++);
      this.sendMidi({ type: 'sysex', data: msg });
      this.animationFrame = requestAnimationFrame(() => {
        setTimeout(loop, 50);
      });
    };
    loop();
  }

  stopPatterns() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.currentPattern = null;
  }
}

// Initialization
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new LaunchpadApp();
  });
}
