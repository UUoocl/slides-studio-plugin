import { APCMiniCore } from './apcMiniCore.js';
// socketcluster-client will be loaded via script tag in index.html for simplicity in this demo environment, 
// similar to launchpad_mk1_demo if needed, but I'll use the module import if available.
// Actually, looking at launchpad_mk1_demo/app.js, it uses: import { create } from '../lib/socketcluster-client.min.js';
import { create } from '../lib/socketcluster-client.min.js';

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
    this.btnConnect = document.getElementById('btn-connect');
    
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.socket = null;
    
    this.isConnected = false;
    
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
      if (out.name.toLowerCase().includes('apc mini')) opt.selected = true;
      this.midiDeviceSelect.appendChild(opt);
    });
  }

  updateStatus(message, isConnected) {
    this.isConnected = isConnected;
    this.statusText.innerText = message;
    if (isConnected) {
      this.statusIndicator.classList.add('connected');
      this.btnConnect.innerText = 'Disconnect';
    } else {
      this.statusIndicator.classList.remove('connected');
      this.btnConnect.innerText = 'Connect';
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
    const mode = this.commModeSelect.value;
    const deviceId = this.midiDeviceSelect.value;
    
    if (mode === 'direct') {
      await this.connectDirect(deviceId);
    } else {
      await this.connectSocket(deviceId);
    }
  }

  async connectDirect(deviceId) {
    this.input = this.midiAccess.inputs.get(deviceId);
    this.output = this.midiAccess.outputs.get(deviceId);

    if (this.input && this.output) {
      this.input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      this.updateStatus(`Connected to ${this.output.name}`, true);
      
      // Send Intro Message
      this.sendMidi(APCMiniCore.encodeIntroMessage());
    } else {
      this.updateStatus('Device not found', false);
    }
  }

  async connectSocket(deviceId) {
    try {
      const deviceName = this.midiDeviceSelect.options[this.midiDeviceSelect.selectedIndex].text;
      
      this.socket = create({
        hostname: window.location.hostname,
        port: window.location.port || 8080,
        path: '/socketcluster/'
      });

      for await (const {error} of this.socket.listener('error')) {
        console.error('Socket error:', error);
      }

      for await (const {socket: s} of this.socket.listener('connect')) {
        this.updateStatus(`Connected to Server (Remote: ${deviceName})`, true);
        this.subscribeToRemoteMidi(deviceName);
        this.sendMidi(APCMiniCore.encodeIntroMessage());
      }
    } catch (err) {
      this.updateStatus(`Socket Error: ${err.message}`, false);
    }
  }

  async subscribeToRemoteMidi(deviceName) {
    const channel = this.socket.subscribe(`midi_in_${deviceName}`);
    for await (const data of channel) {
      if (this.commModeSelect.value === 'socket') {
        this.handleMidiMessage({ data: new Uint8Array(Object.values(data.message)) });
      }
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

  sendMidi(data) {
    if (this.commModeSelect.value === 'direct') {
      if (this.output) this.output.send(data);
    } else {
      if (this.socket && this.socket.state === 'open') {
        const deviceName = this.midiDeviceSelect.options[this.midiDeviceSelect.selectedIndex].text;
        this.socket.transmitPublish(`midi_out_${deviceName}`, { type: 'raw', data: Array.from(data) });
      }
    }
  }

  handleMidiMessage(msg) {
    if (!msg || !msg.data || msg.data.length < 3) return;
    
    const [status, data1, data2] = msg.data;
    const channel = status & 0x0F;
    const type = status & 0xF0;

    // Fader CC Messages (0xB0, 0x30-0x38)
    if (type === 0xB0 && data1 >= 0x30 && data1 <= 0x38) {
      const faderIndex = data1 - 0x30;
      this.updateVirtualFader(faderIndex, data2);
    }

    // Pad Matrix Messages (0x90-0x9F / 0x80, Note 0x00-0x3F)
    if (data1 >= 0x00 && data1 <= 0x3F) {
      if (type === 0x90 || type === 0x80) {
        const isPress = type === 0x90 && data2 > 0;
        this.updateVirtualPad(data1, isPress, data2);
      }
    }

    // Peripheral Buttons (Track 0x64-0x6B, Scene 0x70-0x77)
    if ((data1 >= 0x64 && data1 <= 0x6B) || (data1 >= 0x70 && data1 <= 0x77)) {
      if (type === 0x90 || type === 0x80) {
        const isPress = type === 0x90 && data2 > 0;
        this.updateVirtualButton(data1, isPress);
      }
    }

    console.log(`Incoming MIDI: Status=${status.toString(16)}, Data1=${data1.toString(16)}, Data2=${data2}`);
  }

  updateVirtualButton(note, isPressed) {
    let btn = null;
    if (note >= 0x64 && note <= 0x6B) {
      btn = document.getElementById(`track-${note - 0x64}`);
    } else if (note >= 0x70 && note <= 0x77) {
      btn = document.getElementById(`scene-${note - 0x70}`);
    }

    if (btn) {
      if (isPressed) {
        btn.classList.add('active');
        btn.style.backgroundColor = (note >= 0x64 && note <= 0x6B) ? '#ff5252' : '#00e676';
        btn.style.color = '#fff';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }
    }
  }

  updateVirtualPad(note, isPressed, velocity) {
    const pad = document.getElementById(`pad-${note}`);
    if (pad) {
      if (isPressed) {
        pad.classList.add('active');
        // Simple visualization: use the velocity to guess a color for UI feedback
        pad.style.backgroundColor = `rgba(255, 82, 82, ${velocity / 127})`;
      } else {
        pad.classList.remove('active');
        pad.style.backgroundColor = '';
      }
    }
  }

  updateVirtualFader(index, value) {
    const percent = (value / 127) * 100;
    const fill = document.getElementById(`fader-fill-${index}`);
    const cap = document.getElementById(`fader-cap-${index}`);
    
    if (fill && cap) {
      fill.style.height = `${percent}%`;
      cap.style.bottom = `${percent}%`;
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
        const note = parseInt(e.target.dataset.note);
        const behaviorVal = document.getElementById('led-behavior').value;
        const behavior = behaviorVal.startsWith('9') ? 'blink' : (behaviorVal === '97' || behaviorVal === '9A' ? 'pulse' : 'solid');
        
        // Map UI select values to speeds/behaviors correctly
        let b = 'solid';
        let s = 100;
        
        const val = parseInt(behaviorVal, 16);
        if (val >= 0x90 && val <= 0x96) {
          b = 'solid';
          s = [10, 25, 50, 65, 75, 90, 100][val - 0x90];
        } else if (val >= 0x97 && val <= 0x9A) {
          b = 'pulse';
          s = ['1/16', '1/8', '1/4', '1/2'][val - 0x97];
        } else if (val >= 0x9B && val <= 0x9F) {
          b = 'blink';
          s = ['1/24', '1/16', '1/8', '1/4', '1/2'][val - 0x9B];
        }

        const color = parseInt(document.getElementById('palette-color').value);
        const msg = APCMiniCore.encodePadMessage(note, color, b, s);
        this.sendMidi(msg);
        
        // Local UI feedback (will be overwritten by hardware echo if connected and supported)
        this.updateVirtualPad(note, true, 127);
      }
    });

    window.addEventListener('mouseup', () => {
      // Clear active UI states on global mouseup for simplicity in this demo
      document.querySelectorAll('.pad.active').forEach(p => {
        this.updateVirtualPad(parseInt(p.dataset.note), false, 0);
      });
    });

    this.sceneButtons.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('btn-scene')) {
        const note = parseInt(e.target.dataset.note);
        // Toggle: On -> Blink -> Off
        const currentState = e.target.dataset.led || 'off';
        let nextState = 'on';
        if (currentState === 'on') nextState = 'blink';
        else if (currentState === 'blink') nextState = 'off';
        
        e.target.dataset.led = nextState;
        this.sendMidi(APCMiniCore.encodeButtonMessage(note, nextState));
        this.updateVirtualButton(note, nextState !== 'off');
      }
    });

    this.trackButtons.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('btn-track')) {
        const note = parseInt(e.target.dataset.note);
        const currentState = e.target.dataset.led || 'off';
        let nextState = 'on';
        if (currentState === 'on') nextState = 'blink';
        else if (currentState === 'blink') nextState = 'off';
        
        e.target.dataset.led = nextState;
        this.sendMidi(APCMiniCore.encodeButtonMessage(note, nextState));
        this.updateVirtualButton(note, nextState !== 'off');
      }
    });

    this.btnConnect.addEventListener('click', () => this.toggleConnection());

    this.btnScan.addEventListener('click', () => {
      if (this.midiAccess) this.scanDevices();
      else this.requestMidiAccess();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new APCMiniApp();
});
