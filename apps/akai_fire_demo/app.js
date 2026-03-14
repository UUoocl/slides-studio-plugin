import { FireConnectionManager } from './connectionManager.js';

const padMatrix = document.getElementById('pad-matrix');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const btnConnect = document.getElementById('btn-connect');
const commMode = document.getElementById('comm-mode');

let connection;

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

btnConnect.addEventListener('click', async () => {
  connection = new FireConnectionManager({
    mode: commMode.value,
    onStatusChange: handleStatusChange,
    onMidiMessage: (data) => console.log('MIDI Input:', data)
  });
  await connection.connect();
});

renderMatrix();
console.log('AKAI Fire Demo Ready');
