/**
 * AKAI APC mini mk2 Demo App
 * Main Orchestrator
 */

class APCMiniApp {
  constructor() {
    this.padMatrix = document.getElementById('pad-matrix');
    this.sceneButtons = document.getElementById('scene-buttons');
    this.trackButtons = document.getElementById('track-buttons');
    this.faderContainer = document.getElementById('fader-container');
    
    this.statusText = document.getElementById('status-text');
    this.statusIndicator = document.getElementById('status-indicator');
    this.commModeSelect = document.getElementById('comm-mode');
    this.midiDeviceSelect = document.getElementById('midi-device-select');
    this.btnScan = document.getElementById('btn-scan');
    
    this.midiAccess = null;
    this.availableDevices = [];
    
    this.init();
  }

  async init() {
    this.generatePads();
    this.generateSceneButtons();
    this.generateTrackButtons();
    this.generateFaders();
    this.setupEventListeners();
    this.updateStatus('Disconnected', false);
    
    await this.requestMidiAccess();
  }

  async requestMidiAccess() {
    if (!navigator.requestMIDIAccess) {
      this.updateStatus('WebMIDI not supported', false);
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.scanDevices();
      
      this.midiAccess.onstatechange = () => this.scanDevices();
    } catch (err) {
      this.updateStatus(`MIDI Access Error: ${err.message}`, false);
    }
  }

  scanDevices() {
    this.midiDeviceSelect.innerHTML = '';
    const inputs = Array.from(this.midiAccess.inputs.values());
    const outputs = Array.from(this.midiAccess.outputs.values());

    // Group by name - we need both in/out for full functionality
    const deviceNames = new Set();
    outputs.forEach(out => deviceNames.add(out.name));

    if (deviceNames.size === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'No devices found';
      this.midiDeviceSelect.appendChild(opt);
      return;
    }

    deviceNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.innerText = name;
      if (name.toLowerCase().includes('apc mini')) opt.selected = true;
      this.midiDeviceSelect.appendChild(opt);
    });
  }

  updateStatus(message, isConnected) {
    this.statusText.innerText = message;
    if (isConnected) {
      this.statusIndicator.classList.add('connected');
    } else {
      this.statusIndicator.classList.remove('connected');
    }
  }

  generatePads() {
    for (let i = 0; i < 64; i++) {
      const pad = document.createElement('div');
      pad.className = 'pad';
      pad.id = `pad-${i}`;
      pad.dataset.note = i;
      this.padMatrix.appendChild(pad);
    }
  }

  generateSceneButtons() {
    for (let i = 0; i < 8; i++) {
      const note = 0x70 + i;
      const btn = document.createElement('div');
      btn.className = 'btn-scene';
      btn.id = `scene-${i}`;
      btn.dataset.note = note;
      btn.innerText = `S${i+1}`;
      this.sceneButtons.appendChild(btn);
    }
  }

  generateTrackButtons() {
    for (let i = 0; i < 8; i++) {
      const note = 0x64 + i;
      const btn = document.createElement('div');
      btn.className = 'btn-track';
      btn.id = `track-${i}`;
      btn.dataset.note = note;
      btn.innerText = `T${i+1}`;
      this.trackButtons.appendChild(btn);
    }

    const shiftBtn = document.createElement('div');
    shiftBtn.className = 'btn-shift';
    shiftBtn.id = 'btn-shift';
    shiftBtn.dataset.note = 122;
    shiftBtn.innerText = 'SHIFT';
    this.trackButtons.appendChild(shiftBtn);
  }

  generateFaders() {
    for (let i = 0; i < 9; i++) {
      const faderUnit = document.createElement('div');
      faderUnit.className = 'fader-unit';
      const label = i === 8 ? 'MASTER' : `${i+1}`;
      faderUnit.innerHTML = `
        <div class="fader-track" id="fader-track-${i}">
          <div class="fader-fill" id="fader-fill-${i}" style="height: 0%"></div>
          <div class="fader-cap" id="fader-cap-${i}" style="bottom: 0%"></div>
        </div>
        <div class="fader-label">${label}</div>
      `;
      this.faderContainer.appendChild(faderUnit);
    }
  }

  setupEventListeners() {
    this.padMatrix.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('pad')) {
        console.log(`Pad pressed: ${e.target.dataset.note}`);
      }
    });

    document.getElementById('btn-connect').addEventListener('click', () => {
      const mode = this.commModeSelect.value;
      const deviceName = this.midiDeviceSelect.value;
      this.updateStatus(`Connecting to ${deviceName} via ${mode}...`, false);
      console.log(`Attempting connection: Mode=${mode}, Device=${deviceName}`);
    });

    this.btnScan.addEventListener('click', () => {
      if (this.midiAccess) this.scanDevices();
      else this.requestMidiAccess();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new APCMiniApp();
});
