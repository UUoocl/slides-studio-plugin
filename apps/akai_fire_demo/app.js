import { FireConnectionManager } from './connectionManager.js';
import { FireMidiLogic } from './midiLogic.js';

const padMatrix = document.getElementById('pad-matrix');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const btnConnect = document.getElementById('btn-connect');
const commMode = document.getElementById('comm-mode');
const midiDeviceSelect = document.getElementById('midi-device');

let connection = new FireConnectionManager({
  onStatusChange: handleStatusChange,
  onMidiMessage: (data) => console.log('MIDI Input:', data)
});

// State for toggling button LEDs
const buttonStates = {};

async function init() {
  renderMatrix();
  setupButtonListeners();
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
      rowEl.appendChild(pad);
    }
    padMatrix.appendChild(rowEl);
  }
}

function handleStatusChange(status, message) {
  statusText.textContent = message;
  statusIndicator.className = 'status-indicator ' + (status === 'connected' ? 'connected' : 'error');
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
