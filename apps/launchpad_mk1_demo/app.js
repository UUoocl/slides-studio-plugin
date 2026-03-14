import { LaunchpadMk1Core } from './launchpadMk1Core.js';

class LaunchpadApp {
  constructor() {
    this.launchpadGrid = document.getElementById('virtual-launchpad');
    this.statusText = document.getElementById('status-text');
    this.statusIndicator = document.getElementById('status-indicator');
    
    this.midiAccess = null;
    this.output = null;
    this.input = null;
    
    this.pads = new Map(); // Key: 'row,col' or 'top,col'
    
    this.init();
  }

  init() {
    this.generateGrid();
    this.setupEventListeners();
    this.connectMidi();
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
      
      this.input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      this.updateStatus(`Connected to ${this.output.name}`, true);
    } else {
      this.updateStatus('Device not found', false);
    }
  }

  updateStatus(text, connected) {
    this.statusText.innerText = text;
    this.statusIndicator.classList.toggle('connected', connected);
  }

  handlePadClick(pad) {
    if (!this.output) return;

    const red = parseInt(document.getElementById('manual-red').value);
    const green = parseInt(document.getElementById('manual-green').value);
    const velocity = LaunchpadMk1Core.calculateColorVelocity(red, green);

    const type = pad.dataset.type;
    if (type === 'grid' || type === 'scene') {
      const row = parseInt(pad.dataset.row);
      const col = parseInt(pad.dataset.col);
      const note = LaunchpadMk1Core.xyToNote(row, col);
      this.output.send([0x90, note, velocity]);
      this.updateVirtualPad(pad, red, green);
    } else if (type === 'top') {
      const col = parseInt(pad.dataset.col);
      const cc = LaunchpadMk1Core.getTopRowCC(col);
      this.output.send([0xB0, cc, velocity]);
      this.updateVirtualPad(pad, red, green);
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
      } else {
        pad.classList.remove('active-glow');
      }
    }
  }

  updateVirtualPad(pad, red, green) {
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
    if (!this.output) return;
    this.output.send([0xB0, 0x00, 0x00]); // Reset command
    this.clearVirtualGrid();
  }

  clearLeds() {
    if (!this.output) return;
    // Clear all by sending 0 velocity to all notes (slow but reliable for demo)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 9; c++) {
        const note = LaunchpadMk1Core.xyToNote(r, c);
        this.output.send([0x90, note, 0x0C]);
      }
    }
    for (let c = 0; c < 8; c++) {
      const cc = LaunchpadMk1Core.getTopRowCC(c);
      this.output.send([0xB0, cc, 0x0C]);
    }
    this.clearVirtualGrid();
  }

  testLeds() {
    if (!this.output) return;
    this.output.send([0xB0, 0x00, 0x7F]); // All LEDs on (Full)
  }

  applyManualColor() {
    // Logic to apply manual color to entire grid could go here
    console.log('Apply manual color to all');
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
