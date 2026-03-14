import { APCMiniCore } from './apcMiniCore.js';
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
    this.deviceAliasInput = document.getElementById('device-name');
    this.deviceModeSelect = document.getElementById('device-mode');
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
    
    // We request MIDI access, but it shouldn't block SC from working
    this.requestMidiAccess();
    
    // Set initial display states
    this.updateCommModeDisplay();
  }

  updateCommModeDisplay() {
    const isDirect = this.commModeSelect.value === 'direct';
    document.getElementById('midi-select-container').style.display = isDirect ? 'block' : 'none';
    document.getElementById('sc-select-container').style.display = isDirect ? 'none' : 'block';
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
    
    if (mode === 'direct') {
      const deviceId = this.midiDeviceSelect.value;
      await this.connectDirect(deviceId);
    } else {
      const deviceName = this.deviceAliasInput.value;
      await this.connectSocket(deviceName);
    }
  }

  async connectDirect(deviceId) {
    console.log(`Attempting Direct WebMIDI connection to ID: ${deviceId}`);
    
    this.output = this.midiAccess.outputs.get(deviceId);
    
    this.input = this.midiAccess.inputs.get(deviceId);
    if (!this.input && this.output) {
      for (const input of this.midiAccess.inputs.values()) {
        if (input.name === this.output.name) {
          this.input = input;
          break;
        }
      }
    }

    if (this.input && this.output) {
      this.input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      this.updateStatus(`Connected to ${this.output.name}`, true);
      this.sendMidi(APCMiniCore.encodeIntroMessage());
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
    const handleChannel = async (channelName) => {
      const channel = this.socket.subscribe(channelName);
      for await (const data of channel) {
        if (this.commModeSelect.value === 'socket') {
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
            this.handleMidiMessage({ data: bytes });
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
    if (this.commModeSelect.value === 'direct') {
      if (this.output) this.output.send(data);
    } else {
      if (this.socket && this.socket.state === 'open') {
        const deviceName = this.deviceAliasInput.value;
        this.socket.transmitPublish(`midi_out_${deviceName}`, { type: 'raw', data: Array.from(data) });
      }
    }
  }

  handleMidiMessage(msg) {
    if (!msg || !msg.data || msg.data.length < 3) return;
    const [status, data1, data2] = msg.data;
    const type = status & 0xF0;

    if (status === 0xF0) {
      if (msg.data[1] === 0x47 && msg.data[4] === 0x61) {
        for (let i = 0; i < 9; i++) {
          const val = msg.data[7 + i];
          if (val !== undefined) this.updateVirtualFader(i, val);
        }
      }
      return;
    }

    if (type === 0x90 || type === 0x80) {
      const isPress = type === 0x90 && data2 > 0;
      if (data1 >= 0x00 && data1 <= 0x3F) this.updateVirtualPad(data1, isPress, data2);
      if (data1 >= 0x64 && data1 <= 0x6B) this.updateVirtualButton(data1, isPress);
      if (data1 >= 0x70 && data1 <= 0x77) this.updateVirtualButton(data1, isPress);
      if (data1 === 0x7A) {
        const shiftBtn = document.getElementById('btn-shift');
        if (isPress) shiftBtn.classList.add('active');
        else shiftBtn.classList.remove('active');
      }
    }

    if (type === 0xB0 && data1 >= 0x30 && data1 <= 0x38) {
      this.updateVirtualFader(data1 - 0x30, data2);
    }
  }

  updateVirtualPad(note, isPressed, velocity) {
    const pad = document.getElementById(`pad-${note}`);
    if (pad) {
      if (isPressed) {
        pad.classList.add('active');
        pad.style.backgroundColor = `rgba(255, 82, 82, ${velocity / 127})`;
      } else {
        pad.classList.remove('active');
        pad.style.backgroundColor = '';
      }
    }
  }

  updateVirtualButton(note, isPressed) {
    let btn = null;
    if (note >= 0x64 && note <= 0x6B) btn = document.getElementById(`track-${note - 0x64}`);
    else if (note >= 0x70 && note <= 0x77) btn = document.getElementById(`scene-${note - 0x70}`);

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
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const note = (7 - row) * 8 + col;
        const pad = document.createElement('div');
        pad.className = 'pad';
        pad.id = `pad-${note}`;
        pad.dataset.note = note;
        this.padMatrix.appendChild(pad);
      }
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
        this.sendPadLED(note);
      }
    });

    window.addEventListener('mouseup', () => {
      document.querySelectorAll('.pad.active').forEach(p => {
        this.updateVirtualPad(parseInt(p.dataset.note), false, 0);
      });
    });

    document.getElementById('btn-apply-all').addEventListener('click', () => {
      for (let i = 0; i < 64; i++) this.sendPadLED(i);
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      for (let i = 0; i < 64; i++) this.sendMidi(APCMiniCore.encodePadMessage(i, 0, 'solid', 100));
      for (let i = 0x64; i <= 0x6B; i++) this.sendMidi(APCMiniCore.encodeButtonMessage(i, 'off'));
      for (let i = 0x70; i <= 0x77; i++) this.sendMidi(APCMiniCore.encodeButtonMessage(i, 'off'));
    });

    this.btnConnect.addEventListener('click', () => this.toggleConnection());
    this.btnScan.addEventListener('click', () => this.midiAccess ? this.scanDevices() : this.requestMidiAccess());

    this.commModeSelect.addEventListener('change', () => {
      this.updateCommModeDisplay();
    });

    // Custom RGB UI Handlers
    const useCustomRgb = document.getElementById('use-custom-rgb');
    const rgbControls = document.getElementById('custom-rgb-controls');
    useCustomRgb.addEventListener('change', () => {
      rgbControls.style.opacity = useCustomRgb.checked ? '1' : '0.5';
      rgbControls.style.pointerEvents = useCustomRgb.checked ? 'all' : 'none';
    });

    ['r', 'g', 'b'].forEach(c => {
      const slider = document.getElementById(`rgb-${c}`);
      const valDisplay = document.getElementById(`val-${c}`);
      slider.addEventListener('input', () => {
        valDisplay.innerText = slider.value;
      });
    });
    
    // Toggle displays based on comm mode
    this.commModeSelect.addEventListener('change', () => {
      const isDirect = this.commModeSelect.value === 'direct';
      document.getElementById('midi-device-select').parentElement.style.display = isDirect ? 'block' : 'none';
      document.getElementById('sc-select-container').style.display = isDirect ? 'none' : 'block';
    });
  }

  sendPadLED(note) {
    const useCustom = document.getElementById('use-custom-rgb').checked;
    if (useCustom) {
      const r = parseInt(document.getElementById('rgb-r').value);
      const g = parseInt(document.getElementById('rgb-g').value);
      const b = parseInt(document.getElementById('rgb-b').value);
      this.sendMidi(APCMiniCore.encodeCustomRGB(note, note, r, g, b));
    } else {
      const behaviorVal = document.getElementById('led-behavior').value;
      let b = 'solid';
      let s = 100;
      const val = parseInt(behaviorVal, 16);
      if (val >= 0x90 && val <= 0x96) { b = 'solid'; s = [10, 25, 50, 65, 75, 90, 100][val - 0x90]; }
      else if (val >= 0x97 && val <= 0x9A) { b = 'pulse'; s = ['1/16', '1/8', '1/4', '1/2'][val - 0x97]; }
      else if (val >= 0x9B && val <= 0x9F) { b = 'blink'; s = ['1/24', '1/16', '1/8', '1/4', '1/2'][val - 0x9B]; }
      const color = parseInt(document.getElementById('palette-color').value);
      this.sendMidi(APCMiniCore.encodePadMessage(note, color, b, s));
    }
    this.updateVirtualPad(note, true, 127);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new APCMiniApp();
});
