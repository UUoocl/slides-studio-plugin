import { FireConnectionManager } from './connectionManager.js';
import { FireMidiLogic } from './midiLogic.js';
import { FireAppLogic } from './appLogic.js';

const padMatrix = document.getElementById('pad-matrix');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const btnConnect = document.getElementById('btn-connect');
const commMode = document.getElementById('comm-mode');
const midiDeviceSelect = document.getElementById('midi-device');
const appModeSelect = document.getElementById('app-mode');
const colorSwatches = document.querySelectorAll('.color-swatch');

let connection = new FireConnectionManager({
  onStatusChange: handleStatusChange,
  onMidiMessage: (data) => handleMidiInput(data)
});

const appLogic = new FireAppLogic();

// State for toggling button LEDs
const buttonStates = {};

async function init() {
  renderMatrix();
  setupButtonListeners();
  setupPaintControls();
  const devices = await connection.listDevices();
  // ... rest of init

  
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name;
    // Auto-select if it looks like a Fire
    if (device.name.toLowerCase().includes('fire')) {
      option.selected = true;
      // Also manually set the connection's device
      connection.setDevice(device.id);
    }
    midiDeviceSelect.appendChild(option);
  });
}

function setupButtonListeners() {
  const buttons = document.querySelectorAll('.btn-fire');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.id.replace('btn-', '');
      const cc = FireMidiLogic.getButtonCC(id);
      if (!cc) return;

      // Toggle state: 0x00 (Off) <-> 0x02 (High Green/Red)
      buttonStates[id] = buttonStates[id] === 0x02 ? 0x00 : 0x02;
      
      const msg = FireMidiLogic.createButtonMessage(cc, buttonStates[id]);
      connection.send(msg);

      // Update UI
      btn.style.backgroundColor = buttonStates[id] > 0 ? '#ff5252' : '#2a2a2a';
      btn.style.color = buttonStates[id] > 0 ? '#fff' : '#ccc';
    });
  });
}

function setupPaintControls() {
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      // Clear borders
      colorSwatches.forEach(s => s.style.border = '1px solid #444');
      // Set active border
      swatch.style.border = '2px solid #fff';
      
      const r = parseInt(swatch.dataset.r);
      const g = parseInt(swatch.dataset.g);
      const b = parseInt(swatch.dataset.b);
      appLogic.setSelectedColor(r, g, b);
    });
  });
}

function renderMatrix() {
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
        if (appModeSelect.value === 'paint') {
          const index = row * 16 + col;
          const { r, g, b } = appLogic.paintPad(index);
          const msg = FireMidiLogic.createRGBMessage(index, r, g, b);
          connection.send(msg);
          
          // Update UI
          pad.style.backgroundColor = `rgb(${r * 2}, ${g * 2}, ${b * 2})`;
          pad.style.boxShadow = (r+g+b > 0) ? `0 0 10px rgb(${r * 2}, ${g * 2}, ${b * 2})` : 'none';
        }
      });

      rowEl.appendChild(pad);
    }
    padMatrix.appendChild(rowEl);
  }
}

function handleStatusChange(status, message) {
  statusText.textContent = message;
  statusIndicator.className = 'status-indicator ' + (status === 'connected' ? 'connected' : 'error');
}

function handleMidiInput(data) {
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
        // Simple rotation visualization
        const rotation = (input.value <= 0x3F) ? input.value * 5 : (input.value - 0x80) * 5;
        const currentRotation = parseInt(knobEl.dataset.rotation || 0);
        const newRotation = currentRotation + rotation;
        knobEl.style.transform = `rotate(${newRotation}deg)`;
        knobEl.dataset.rotation = newRotation;
      }
    }
  }
}

midiDeviceSelect.addEventListener('change', (e) => {
  console.log('User manually selected MIDI device:', e.target.value);
  connection.setDevice(e.target.value);
});

btnConnect.addEventListener('click', async () => {
  // If no device is set, try to use the selected value from the dropdown
  if (!connection.output && midiDeviceSelect.value) {
    connection.setDevice(midiDeviceSelect.value);
  }
  
  connection.mode = commMode.value;
  await connection.connect();
});

init();
console.log('AKAI Fire Demo Ready');
