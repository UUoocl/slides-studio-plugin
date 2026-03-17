import { QuadLaunchpadManager } from './QuadLaunchpadManager.js';
import { DEVICE_CONFIG } from './constants.js';
import { GlobalCanvas } from './GlobalCanvas.js';
import { 
  renderDiagonalWave, 
  renderCenterExpansion, 
  renderGlobalSparkle, 
  renderScrollingText 
} from './animations.js';
import {
  GRID_PADS,
  TOP_BUTTONS,
  RIGHT_BUTTONS,
  LOGO_BUTTON
} from '../launchpad_mk3_demo/launchpadCore.js';

export class QuadLaunchpadApp {
  constructor() {
    this.manager = new QuadLaunchpadManager((deviceId, data) => this.handleMidiMessage(deviceId, data));
    this.globalCanvas = new GlobalCanvas(this.manager);
    this.animationFrame = null;
    this.currentPattern = null;
    this.patternStep = 0;
    this.init();
  }

  async init() {
    this.generateGrids();
    this.generateConnectivityUI();
    
    // Attempt WebMIDI init
    await this.manager.init();
    this.manager.onMidiStateChange = () => this.refreshMidiSelectors();
    this.refreshMidiSelectors();

    this.setupGlobalEventListeners();
  }

  generateGrids() {
    for (const deviceId of Object.keys(DEVICE_CONFIG)) {
      const containerId = `device-${deviceId.replace(',', '-')}`;
      const container = document.getElementById(containerId);
      if (!container) continue;

      const grid = container.querySelector('.virtual-launchpad');
      if (!grid) continue;
      
      grid.innerHTML = '';

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
              label = `CC${id}`;
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
              label = `CC${id}`;
            }
          }

          pad.id = `pad-${deviceId}-${id}`;
          pad.textContent = label;
          pad.dataset.id = id;
          pad.dataset.device = deviceId;
          
          grid.appendChild(pad);
        }
      }
    }
  }

  generateConnectivityUI() {
    const group = document.getElementById('connectivity-group');
    if (!group) return;

    for (const deviceId of Object.keys(DEVICE_CONFIG)) {
      const devCtrl = document.createElement('div');
      devCtrl.className = 'device-control';
      
      const idStr = deviceId.replace(',', '-');
      
      devCtrl.innerHTML = `
        <h4>Device ${deviceId} <span id="status-${idStr}" class="device-status"></span></h4>
        <select id="mode-${idStr}">
          <option value="socket">SocketCluster</option>
          <option value="direct">WebMIDI</option>
        </select>
        
        <div id="sc-ui-${idStr}">
          <input type="text" id="alias-${idStr}" value="lp_${deviceId.replace(',', '_')}">
        </div>
        
        <div id="midi-ui-${idStr}" style="display: none;">
          <select id="midi-in-${idStr}"><option value="">Scan...</option></select>
          <select id="midi-out-${idStr}"><option value="">Scan...</option></select>
        </div>
        
        <button id="btn-conn-${idStr}">Connect</button>
      `;
      group.appendChild(devCtrl);

      // Event Listeners for this device's UI
      const modeSel = document.getElementById(`mode-${idStr}`);
      modeSel.addEventListener('change', () => {
        document.getElementById(`sc-ui-${idStr}`).style.display = modeSel.value === 'socket' ? 'block' : 'none';
        document.getElementById(`midi-ui-${idStr}`).style.display = modeSel.value === 'direct' ? 'block' : 'none';
      });

      const btnConn = document.getElementById(`btn-conn-${idStr}`);
      btnConn.addEventListener('click', async () => {
        const conn = this.manager.getConnection(deviceId);
        if (conn && conn.isConnected) {
          await this.manager.disconnectDevice(deviceId);
          btnConn.innerText = 'Connect';
          document.getElementById(`status-${idStr}`).classList.remove('connected');
        } else {
          const mode = modeSel.value;
          const inputId = document.getElementById(`midi-in-${idStr}`).value;
          const outputId = document.getElementById(`midi-out-${idStr}`).value;
          const alias = document.getElementById(`alias-${idStr}`).value;
          
          try {
            btnConn.innerText = 'Connecting...';
            await this.manager.connectDevice(deviceId, mode, inputId, outputId, alias);
            btnConn.innerText = 'Disconnect';
            document.getElementById(`status-${idStr}`).classList.add('connected');
          } catch (err) {
            console.error(err);
            btnConn.innerText = 'Connect';
            alert(`Failed to connect: ${err.message}`);
          }
        }
      });
    }
  }

  refreshMidiSelectors() {
    const inputs = this.manager.getMidiInputs();
    const outputs = this.manager.getMidiOutputs();

    for (const deviceId of Object.keys(DEVICE_CONFIG)) {
      const idStr = deviceId.replace(',', '-');
      const selIn = document.getElementById(`midi-in-${idStr}`);
      const selOut = document.getElementById(`midi-out-${idStr}`);
      
      if (!selIn || !selOut) continue;

      selIn.innerHTML = inputs.length ? '' : '<option value="">No inputs found</option>';
      inputs.forEach(input => {
        const opt = document.createElement('option');
        opt.value = input.id;
        opt.innerText = input.name;
        selIn.appendChild(opt);
      });

      selOut.innerHTML = outputs.length ? '' : '<option value="">No outputs found</option>';
      outputs.forEach(output => {
        const opt = document.createElement('option');
        opt.value = output.id;
        opt.innerText = output.name;
        selOut.appendChild(opt);
      });
    }
  }

  setupGlobalEventListeners() {
    document.querySelectorAll('.virtual-launchpad').forEach(grid => {
      grid.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('pad')) {
          const note = parseInt(e.target.dataset.id);
          const deviceId = e.target.dataset.device;
          this.manager.sendToDevice(deviceId, { type: 'noteon', data: [0x90, note, 127] }); // White color for direct UI click
          this.updateVirtualPad(deviceId, note, 127, true);
        }
      });
      grid.addEventListener('mouseup', (e) => {
        if (e.target.classList.contains('pad')) {
          const note = parseInt(e.target.dataset.id);
          const deviceId = e.target.dataset.device;
          this.manager.sendToDevice(deviceId, { type: 'noteoff', data: [0x80, note, 0] });
          this.updateVirtualPad(deviceId, note, 0, false);
        }
      });
    });

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        // Simple clear - send solid fill 0 to all
        const header = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D];
        const specs = GRID_PADS.map(index => ({ type: 0x00, index, data: [0] }));
        const payload = [];
        specs.forEach(s => payload.push(s.type, s.index, ...s.data));
        const msg = [...header, 0x03, ...payload, 0xF7];
        this.manager.sendToAll({ type: 'sysex', data: msg });
      });
    }

    const btnProgrammer = document.getElementById('btn-programmer');
    if (btnProgrammer) {
      btnProgrammer.addEventListener('click', () => {
        this.manager.enterProgrammerModeAll();
      });
    }

    const btnDiagWave = document.getElementById('btn-diag-wave');
    if (btnDiagWave) {
      btnDiagWave.addEventListener('click', () => {
        this.startPatterns(renderDiagonalWave);
      });
    }

    const btnCenterExp = document.getElementById('btn-center-exp');
    if (btnCenterExp) {
      btnCenterExp.addEventListener('click', () => {
        this.startPatterns(renderCenterExpansion);
      });
    }

    const btnScrollText = document.getElementById('btn-scroll-text');
    if (btnScrollText) {
      btnScrollText.addEventListener('click', () => {
        this.startPatterns(renderScrollingText);
      });
    }

    const btnGlobalSparkle = document.getElementById('btn-global-sparkle');
    if (btnGlobalSparkle) {
      btnGlobalSparkle.addEventListener('click', () => {
        this.startPatterns(renderGlobalSparkle);
      });
    }
  }

  startPatterns(patternFn) {
    this.stopPatterns();
    this.currentPattern = patternFn;
    this.patternStep = 0;
    
    const loop = () => {
      if (!this.currentPattern) return;
      this.currentPattern(this.globalCanvas, this.patternStep++);
      this.globalCanvas.render();
      this.animationFrame = requestAnimationFrame(() => {
        setTimeout(loop, 100);
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
    this.globalCanvas.clear();
    this.globalCanvas.render();
  }

  handleMidiMessage(deviceId, data) {
    if (!data || data.length < 3) return;
    const [status, data1, data2] = data;
    const type = status & 0xF0;

    const useLocalFeedback = document.getElementById('local-feedback-toggle')?.checked;

    if (type === 0x90 || type === 0xB0) {
      const isPress = data2 > 0;
      this.updateVirtualPad(deviceId, data1, data2, isPress);

      // Hardware feedback
      if (useLocalFeedback && isPress) {
        // simple echo back with green color (velocity 21) or red (5)
        this.manager.sendToDevice(deviceId, { type: 'noteon', data: [status, data1, 21] });
      } else if (useLocalFeedback && !isPress) {
        this.manager.sendToDevice(deviceId, { type: 'noteoff', data: [status, data1, 0] });
      }
    } else if (type === 0x80) {
      this.updateVirtualPad(deviceId, data1, 0, false);
    }
  }

  updateVirtualPad(deviceId, note, velocity, isPress) {
    const pad = document.getElementById(`pad-${deviceId}-${note}`);
    if (pad) {
      if (isPress) {
        pad.classList.add('active-glow');
        pad.style.backgroundColor = this.getPaletteColor(velocity);
      } else {
        pad.classList.remove('active-glow');
        pad.style.backgroundColor = '';
      }
    }
  }

  getPaletteColor(index) {
    const colors = {
      5: '#ff0000', 9: '#ff8000', 13: '#ffff00', 21: '#00ff00',
      45: '#0000ff', 53: '#8000ff', 1: '#ffffff', 0: 'transparent',
      127: '#ffffff'
    };
    return colors[index] || `hsl(${index * 2.8}, 100%, 50%)`;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new QuadLaunchpadApp();
  });
}
