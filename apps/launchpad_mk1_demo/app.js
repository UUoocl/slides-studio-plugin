import { LaunchpadMk1Core } from './launchpadMk1Core.js';
import { create } from '../lib/socketcluster-client.min.js';

class LaunchpadApp {
  constructor() {
    this.launchpadGrid = document.getElementById('virtual-launchpad');
    this.statusText = document.getElementById('status-text');
    this.statusIndicator = document.getElementById('status-indicator');
    this.commModeSelect = document.getElementById('comm-mode');
    
    this.midiAccess = null;
    this.output = null;
    this.input = null;
    
    this.socket = null;
    
    this.pads = new Map(); // Key: 'row,col' or 'top,col'
    
    this.sparkleInterval = null;
    this.sparkleActive = false;
    
    this.init();
  }

  init() {
    this.generateGrid();
    this.setupEventListeners();
    this.connectMidi();
    this.connectSocket();
  }

  generateGrid() {
    // Generate 9x9 grid
    // Row 0: Top row buttons (CC) + Empty
    // Rows 1-8: Grid (Note On) + Scene Buttons (Note On)
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const pad = document.createElement('div');
        pad.classList.add('pad');
        
        if (r === 0) {
          // Top row
          if (c < 8) {
            pad.classList.add('top-row', 'round');
            pad.innerText = `CC${104 + c}`;
            pad.dataset.type = 'top';
            pad.dataset.col = c;
            this.pads.set(`top,${c}`, pad);
          } else {
            // Logo area
            pad.classList.add('logo');
            pad.innerText = 'Lp';
            pad.dataset.type = 'logo';
          }
        } else {
          // Grid and Scene
          const rowIdx = r - 1;
          if (c < 8) {
            // Main grid
            pad.dataset.type = 'grid';
            pad.dataset.row = rowIdx;
            pad.dataset.col = c;
            pad.innerText = `${rowIdx},${c}`;
            this.pads.set(`${rowIdx},${c}`, pad);
          } else {
            // Scene buttons
            pad.classList.add('right-col', 'round');
            pad.dataset.type = 'scene';
            pad.dataset.row = rowIdx;
            pad.dataset.col = c;
            pad.innerText = `S${rowIdx}`;
            this.pads.set(`${rowIdx},${c}`, pad);
          }
        }
        
        pad.addEventListener('mousedown', () => this.handlePadClick(pad));
        this.launchpadGrid.appendChild(pad);
      }
    }
  }

  setupEventListeners() {
    document.getElementById('btn-reset').addEventListener('click', () => this.resetDevice());
    document.getElementById('btn-clear').addEventListener('click', () => this.clearLeds());
    document.getElementById('btn-test').addEventListener('click', () => this.testLeds());
    document.getElementById('btn-apply-manual').addEventListener('click', () => this.applyManualColor());
    document.getElementById('btn-wave').addEventListener('click', () => this.startWaveAnimation());
    document.getElementById('btn-sparkle').addEventListener('click', () => this.startSparkleAnimation());
    
    this.commModeSelect.addEventListener('change', () => this.handleCommModeChange());
  }

  async connectSocket() {
    try {
      this.socket = create({
        hostname: window.location.hostname,
        port: window.location.port,
        path: '/socketcluster/'
      });

      for await (const {error} of this.socket.listener('error')) {
        console.error('Socket error:', error);
      }

      for await (const {socket: s} of this.socket.listener('connect')) {
        console.log('Socket connected:', s.id);
        if (this.commModeSelect.value === 'socket') {
          this.updateStatus('Connected to Server', true);
          this.subscribeToDeviceEvents();
        }
      }

      for await (const {code, reason} of this.socket.listener('close')) {
        console.log('Socket closed:', code, reason);
        if (this.commModeSelect.value === 'socket') {
          this.updateStatus('Server Disconnected', false);
        }
      }
    } catch (err) {
      console.error('Socket initialization failed:', err);
    }
  }

  async subscribeToDeviceEvents() {
    const deviceName = document.getElementById('device-name').value;
    const channelName = `midi_in_${deviceName}`;
    const channel = this.socket.subscribe(channelName);
    
    for await (const data of channel) {
      if (this.commModeSelect.value === 'socket') {
        this.handleMidiMessage({ data });
      }
    }
  }

  handleCommModeChange() {
    const mode = this.commModeSelect.value;
    if (mode === 'direct') {
      if (this.output) {
        this.updateStatus(`Connected to ${this.output.name}`, true);
      } else {
        this.updateStatus('Device not found', false);
      }
    } else {
      if (this.socket && this.socket.state === 'open') {
        this.updateStatus('Connected to Server', true);
        this.subscribeToDeviceEvents();
      } else {
        this.updateStatus('Server Disconnected', false);
      }
    }
  }

  async connectMidi() {
    if (!navigator.requestMIDIAccess) {
      this.updateStatus('WebMIDI not supported', false);
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.scanDevices();
      
      this.midiAccess.onstatechange = () => this.scanDevices();
    } catch (err) {
      this.updateStatus(`MIDI Error: ${err.message}`, false);
    }
  }

  scanDevices() {
    const deviceAlias = document.getElementById('device-name').value.toLowerCase();
    
    let foundInput = null;
    let foundOutput = null;

    for (const input of this.midiAccess.inputs.values()) {
      if (input.name.toLowerCase().includes(deviceAlias)) {
        foundInput = input;
        break;
      }
    }

    for (const output of this.midiAccess.outputs.values()) {
      if (output.name.toLowerCase().includes(deviceAlias)) {
        foundOutput = output;
        break;
      }
    }

    if (foundInput && foundOutput) {
      this.input = foundInput;
      this.output = foundOutput;
      
      this.input.onmidimessage = (msg) => {
        if (this.commModeSelect.value === 'direct') {
          this.handleMidiMessage(msg);
        }
      };
      
      if (this.commModeSelect.value === 'direct') {
        this.updateStatus(`Connected to ${this.output.name}`, true);
      }
    } else {
      if (this.commModeSelect.value === 'direct') {
        this.updateStatus('Device not found', false);
      }
    }
  }

  updateStatus(text, connected) {
    this.statusText.innerText = text;
    this.statusIndicator.classList.toggle('connected', connected);
  }

  handlePadClick(pad) {
    const red = parseInt(document.getElementById('manual-red').value);
    const green = parseInt(document.getElementById('manual-green').value);
    const velocity = LaunchpadMk1Core.calculateColorVelocity(red, green);

    const type = pad.dataset.type;
    let payload = null;

    if (type === 'grid' || type === 'scene') {
      const row = parseInt(pad.dataset.row);
      const col = parseInt(pad.dataset.col);
      const note = LaunchpadMk1Core.xyToNote(row, col);
      payload = [0x90, note, velocity];
    } else if (type === 'top') {
      const col = parseInt(pad.dataset.col);
      const cc = LaunchpadMk1Core.getTopRowCC(col);
      payload = [0xB0, cc, velocity];
    }

    if (payload) {
      this.sendMidi(payload);
      this.updateVirtualPad(pad, red, green);
    }
  }

  sendMidi(data) {
    const mode = this.commModeSelect.value;
    if (mode === 'direct') {
      if (this.output) {
        this.output.send(data);
      }
    } else {
      if (this.socket && this.socket.state === 'open') {
        const deviceName = document.getElementById('device-name').value;
        const channel = `midi_out_${deviceName}`;
        this.socket.transmitPublish(channel, { type: 'raw', data: Array.from(data) });
      }
    }
  }

  handleMidiMessage(msg) {
    const parsed = LaunchpadMk1Core.parseMessage(msg.data);
    if (!parsed) return;

    let pad;
    if (parsed.isTopRow) {
      pad = this.pads.get(`top,${parsed.col}`);
    } else {
      pad = this.pads.get(`${parsed.row},${parsed.col}`);
    }

    if (pad) {
      if (parsed.isPress) {
        pad.classList.add('active-glow');
        // On press, light up the device with the current manual color
        this.handlePadClick(pad);
      } else {
        pad.classList.remove('active-glow');
      }
    }
  }

  updateVirtualPad(pad, red, green) {
    if (!pad) return;
    // Remove old LED classes
    pad.classList.remove('led-red-full', 'led-red-low', 'led-green-full', 'led-green-low', 'led-amber-full', 'led-amber-low', 'led-off');
    
    if (red === 0 && green === 0) {
      pad.classList.add('led-off');
    } else if (red > 0 && green === 0) {
      pad.classList.add(red > 1 ? 'led-red-full' : 'led-red-low');
    } else if (red === 0 && green > 0) {
      pad.classList.add(green > 1 ? 'led-green-full' : 'led-green-low');
    } else {
      pad.classList.add((red + green) > 3 ? 'led-amber-full' : 'led-amber-low');
    }
  }

  resetDevice() {
    this.sendMidi([0xB0, 0x00, 0x00]); // Reset command
    this.clearVirtualGrid();
  }

  clearLeds() {
    this.resetDevice();
  }

  testLeds() {
    this.sendMidi([0xB0, 0x00, 0x7F]); // All LEDs on (Full)
    this.pads.forEach(pad => this.updateVirtualPad(pad, 3, 3));
  }

  applyManualColor() {
    const red = parseInt(document.getElementById('manual-red').value);
    const green = parseInt(document.getElementById('manual-green').value);
    const velocity = LaunchpadMk1Core.calculateColorVelocity(red, green);

    // Apply to 8x8 grid and scene buttons
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 9; c++) {
        const note = LaunchpadMk1Core.xyToNote(r, c);
        this.sendMidi([0x90, note, velocity]);
        this.updateVirtualPad(this.pads.get(`${r},${c}`), red, green);
      }
    }
    // Apply to top row
    for (let c = 0; c < 8; c++) {
      const cc = LaunchpadMk1Core.getTopRowCC(c);
      this.sendMidi([0xB0, cc, velocity]);
      this.updateVirtualPad(this.pads.get(`top,${c}`), red, green);
    }
  }

  async startWaveAnimation() {
    this.clearLeds();
    
    for (let c = 0; c < 9; c++) {
      for (let r = 0; r < 8; r++) {
        const note = LaunchpadMk1Core.xyToNote(r, c);
        const velocity = LaunchpadMk1Core.calculateColorVelocity(3, 3); // Amber
        this.sendMidi([0x90, note, velocity]);
        this.updateVirtualPad(this.pads.get(`${r},${c}`), 3, 3);
      }
      await new Promise(r => setTimeout(r, 80));
    }
  }

  startSparkleAnimation() {
    if (this.sparkleActive) {
      clearInterval(this.sparkleInterval);
      this.sparkleActive = false;
      return;
    }

    this.sparkleActive = true;
    this.sparkleInterval = setInterval(() => {
      const r = Math.floor(Math.random() * 8);
      const c = Math.floor(Math.random() * 9);
      const red = Math.floor(Math.random() * 4);
      const green = Math.floor(Math.random() * 4);
      
      const note = LaunchpadMk1Core.xyToNote(r, c);
      const velocity = LaunchpadMk1Core.calculateColorVelocity(red, green);
      this.sendMidi([0x90, note, velocity]);
      this.updateVirtualPad(this.pads.get(`${r},${c}`), red, green);
    }, 50);
  }

  clearVirtualGrid() {
    this.pads.forEach(pad => {
      pad.classList.remove('led-red-full', 'led-red-low', 'led-green-full', 'led-green-low', 'led-amber-full', 'led-amber-low');
      pad.classList.add('led-off');
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new LaunchpadApp();
});
