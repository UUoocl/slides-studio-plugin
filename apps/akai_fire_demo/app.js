/* global FireConnectionManager, FireMidiLogic, FireAppLogic, FireOledLogic */

const padMatrix = document.getElementById('pad-matrix');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const btnConnect = document.getElementById('btn-connect');
const commMode = document.getElementById('comm-mode');
const midiDeviceSelect = document.getElementById('midi-device');
const appModeSelect = document.getElementById('app-mode');
const colorSwatches = document.querySelectorAll('.color-swatch');
const btnSendOled = document.getElementById('btn-send-oled');
const oledTextInput = document.getElementById('oled-text-input');
const oledDisplay = document.getElementById('oled-display');

const midiSelectContainer = document.getElementById('midi-select-container');
const scSelectContainer = document.getElementById('sc-select-container');
const scDeviceInput = document.getElementById('sc-device-name');
const scDeviceList = document.getElementById('sc-device-list');

let connection = new FireConnectionManager({
  onStatusChange: handleStatusChange,
  onMidiMessage: (data) => handleMidiInput(data)
});

const appLogic = new FireAppLogic();
const oledLogic = new FireOledLogic();

// State for toggling button LEDs
const buttonStates = {};
let sequencerInterval = null;

async function init() {
  renderMatrix();
  setupButtonListeners();
  setupPaintControls();
  setupModeListener();
  setupOledControls();
  setupCommModeListener();
  
  const devices = await connection.listDevices();
  
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name;
    if (device.name.toLowerCase().includes('fire')) {
      option.selected = true;
      connection.setDevice(device.id);
    }
    midiDeviceSelect.appendChild(option);
  });

  setupSocketDiscovery();
}

function setupCommModeListener() {
  commMode.addEventListener('change', () => {
    if (commMode.value === 'direct') {
      midiSelectContainer.style.display = 'block';
      scSelectContainer.style.display = 'none';
    } else {
      midiSelectContainer.style.display = 'none';
      scSelectContainer.style.display = 'block';
    }
  });
}

async function setupSocketDiscovery() {
  if (connection.mode === 'socket' || true) {
    await connection.connectSocketCluster();
    if (connection.socket) {
      const channel = connection.socket.subscribe('serverState');
      (async () => {
        for await (const data of channel) {
          if (data && data.clients) {
            const internal = data.clients.find(c => c.id === 'plugin-internal');
            if (internal && internal.channels) {
              populateSCDeviceList(internal.channels);
            }
          }
        }
      })();
    }
  }
}

function populateSCDeviceList(channels) {
  const midiNames = channels
    .filter(c => c.startsWith('midi_out_'))
    .map(c => c.replace('midi_out_', ''));

  scDeviceList.innerHTML = '<option value="">(Select from Plugin...)</option>';
  midiNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    scDeviceList.appendChild(option);
  });

  scDeviceList.onchange = (e) => {
    scDeviceInput.value = e.target.value;
    connection.setSCDeviceName(e.target.value);
  };
}

function setupButtonListeners() {
  const buttons = document.querySelectorAll('.btn-fire');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.id.replace('btn-', '');
      const cc = FireMidiLogic.getButtonCC(id);
      if (!cc) return;

      buttonStates[id] = buttonStates[id] === 0x02 ? 0x00 : 0x02;
      const msg = FireMidiLogic.createButtonMessage(cc, buttonStates[id]);
      connection.send(msg);

      btn.style.backgroundColor = buttonStates[id] > 0 ? '#ff5252' : '#2a2a2a';
      btn.style.color = buttonStates[id] > 0 ? '#fff' : '#ccc';
    });
  });
}

function setupPaintControls() {
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.style.border = '1px solid #444');
      swatch.style.border = '2px solid #fff';
      const r = parseInt(swatch.dataset.r);
      const g = parseInt(swatch.dataset.g);
      const b = parseInt(swatch.dataset.b);
      appLogic.setSelectedColor(r, g, b);
    });
  });
}

function setupModeListener() {
  appModeSelect.addEventListener('change', () => {
    if (appModeSelect.value === 'sequencer') {
      appLogic.startSequencer();
      sequencerInterval = setInterval(tickSequencer, 125);
    } else {
      appLogic.stopSequencer();
      if (sequencerInterval) clearInterval(sequencerInterval);
      sequencerInterval = null;
      clearGridUI();
    }
  });
}

function setupOledControls() {
  btnSendOled.addEventListener('click', () => {
    sendOLEDData(oledTextInput.value || 'AKAI FIRE');
  });
}

function sendOLEDData(text) {
  oledLogic.clear();
  oledLogic.drawText(text, 0, 0);
  const msg = oledLogic.createOledMessage();
  connection.send(msg);
  oledDisplay.textContent = text;
}

function tickSequencer() {
  const updates = appLogic.tick();
  if (!updates) return;

  updates.clearIndices.forEach(index => {
    const pad = document.getElementById(`pad-${Math.floor(index / 16)}-${index % 16}`);
    const color = appLogic.getPadColor(index);
    if (pad) {
      pad.style.backgroundColor = (color.r || color.g || color.b) ? `rgb(${color.r * 2}, ${color.g * 2}, ${color.b * 2})` : '';
      pad.style.boxShadow = 'none';
    }
    connection.send(FireMidiLogic.createRGBMessage(index, color.r, color.g, color.b));
  });

  updates.highlightIndices.forEach(index => {
    const pad = document.getElementById(`pad-${Math.floor(index / 16)}-${index % 16}`);
    if (pad) {
      pad.style.backgroundColor = '#ffffff';
      pad.style.boxShadow = '0 0 15px #ffffff';
    }
    connection.send(FireMidiLogic.createRGBMessage(index, 127, 127, 127));
  });
}

function clearGridUI() {
  for (let i = 0; i < 64; i++) {
    const pad = document.getElementById(`pad-${Math.floor(i / 16)}-${i % 16}`);
    const color = appLogic.getPadColor(i);
    if (pad) {
      pad.style.backgroundColor = (color.r || color.g || color.b) ? `rgb(${color.r * 2}, ${color.g * 2}, ${color.b * 2})` : '';
      pad.style.boxShadow = 'none';
    }
  }
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
  connection.setDevice(e.target.value);
});

btnConnect.addEventListener('click', async () => {
  connection.mode = commMode.value;
  if (connection.mode === 'direct') {
    if (!connection.output && midiDeviceSelect.value) {
      connection.setDevice(midiDeviceSelect.value);
    }
  } else {
    if (scDeviceInput.value) {
      connection.setSCDeviceName(scDeviceInput.value);
    }
  }
  await connection.connect();
});

init();
console.log('AKAI Fire Demo Ready');
