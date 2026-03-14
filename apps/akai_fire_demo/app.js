import { FireConnectionManager } from './connectionManager.js';

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

async function init() {
  renderMatrix();
  const devices = await connection.listDevices();
  midiDeviceSelect.innerHTML = '<option value="">Select a device...</option>';
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name;
    // Auto-select if it looks like a Fire
    if (device.name.toLowerCase().includes('fire')) {
      option.selected = true;
      connection.setDevice(device.id);
    }
    midiDeviceSelect.appendChild(option);
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
  connection.setDevice(e.target.value);
});

btnConnect.addEventListener('click', async () => {
  connection.mode = commMode.value;
  await connection.connect();
});

init();
console.log('AKAI Fire Demo Ready');
