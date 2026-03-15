import { create } from '../lib/socketcluster-client.min.js';
import {
  GRID_PADS,
  TOP_BUTTONS,
  RIGHT_BUTTONS,
  LOGO_BUTTON,
  generateProgrammerModeMsg,
  generateSolidFill,
  generateRainbowWave,
  generateRandomSparkle,
  generateTextScroll,
  generateCC
} from './launchpadCore.js';

const gridContainer = document.getElementById('virtual-launchpad');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const deviceNameInput = document.getElementById('device-name');

let socket = null;
let currentPattern = null;
let animationFrame = null;
let patternStep = 0;

/**
 * Generates the 9x9 virtual Launchpad grid.
 */
function generateGrid() {
  gridContainer.innerHTML = '';

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
          label = `CC ${id}`;
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
          label = `CC ${id}`;
        }
      }

      pad.id = `pad-${id}`;
      pad.textContent = label;
      pad.dataset.id = id;
      
      gridContainer.appendChild(pad);
    }
  }
}

/**
 * Connects to the SocketCluster server.
 */
async function connect() {
  // Determine the server URL from the current window location
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const url = `${protocol}://${host}/socketcluster/`;

  console.log(`Connecting to SocketCluster at ${url}...`);

  socket = create({
    hostname: window.location.hostname,
    port: window.location.port,
    path: '/socketcluster/'
  });

  for await (const {error} of socket.listener('error')) {
    console.error('Socket error:', error);
  }

  for await (const {socket: s} of socket.listener('connect')) {
    console.log('Socket connected:', s.id);
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Connected to Server';
    
    // Auto-enter Programmer Mode
    enterProgrammerMode();
  }

  for await (const {code, reason} of socket.listener('close')) {
    console.log('Socket closed:', code, reason);
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Sends a MIDI message via the SocketCluster bridge.
 */
function sendMidi(payload) {
  if (!socket || socket.state !== 'open') {
    console.warn('Socket not connected. Cannot send MIDI.');
    return;
  }

  const deviceName = deviceNameInput.value || 'Launchpad';
  const channel = `midi_out_${deviceName}`;
  socket.transmitPublish(channel, payload);
  
  // Also update virtual grid
  updateVirtualGrid(payload);
}

/**
 * Updates the virtual grid based on outgoing MIDI messages.
 */
function updateVirtualGrid(payload) {
  if (payload.type === 'sysex' || payload.type === 'raw') {
    const data = payload.data;
    if (data && data[6] === 0x03) { // Bulk LED
      // [Header] 03h <type> <index> <data> ...
      const payloadData = data.slice(7, data.length - 1);
      for (let i = 0; i < payloadData.length; ) {
        const type = payloadData[i++];
        const index = payloadData[i++];
        const val = payloadData[i++]; // Static palette index
        
        const pad = document.getElementById(`pad-${index}`);
        if (pad) {
          pad.style.backgroundColor = val > 0 ? getPaletteColor(val) : '';
          pad.style.boxShadow = val > 0 ? `0 0 10px ${getPaletteColor(val)}` : '';
        }
      }
    }
  }
  // Note: Standard NoteOn/CC updates can be added here
}

/**
 * Returns a CSS color for a Launchpad palette index.
 * (Simplified mapping for demo)
 */
function getPaletteColor(index) {
  const colors = {
    5: '#ff0000',   // Red
    9: '#ff8000',   // Orange
    13: '#ffff00',  // Yellow
    21: '#00ff00',  // Green
    45: '#0000ff',  // Blue
    53: '#8000ff',  // Purple
    1: '#ffffff',   // White
    0: 'transparent'
  };
  return colors[index] || `hsl(${index * 2.8}, 100%, 50%)`;
}

/**
 * System Commands
 */
function enterProgrammerMode() {
  const msg = generateProgrammerModeMsg();
  sendMidi({ type: 'sysex', data: msg });
  console.log('Sent Programmer Mode command');
}

function clearAll() {
  stopPatterns();
  const msg = generateSolidFill(0);
  sendMidi({ type: 'sysex', data: msg });
}

/**
 * Animation Loop
 */
function startPatterns(patternFn) {
  stopPatterns();
  currentPattern = patternFn;
  patternStep = 0;
  
  const loop = () => {
    const msg = currentPattern(patternStep++);
    sendMidi({ type: 'sysex', data: msg });
    animationFrame = requestAnimationFrame(() => {
      // Throttling animations for demo
      setTimeout(loop, 50);
    });
  };
  loop();
}

function stopPatterns() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  currentPattern = null;
}

/**
 * UI Event Listeners
 */
function setupEventListeners() {
  document.getElementById('btn-programmer').addEventListener('click', enterProgrammerMode);
  document.getElementById('btn-clear').addEventListener('click', clearAll);

  document.getElementById('btn-fill').addEventListener('click', () => {
    stopPatterns();
    const color = parseInt(document.getElementById('fill-color').value);
    const msg = generateSolidFill(color);
    sendMidi({ type: 'sysex', data: msg });
  });

  document.getElementById('btn-rainbow').addEventListener('click', () => {
    startPatterns(generateRainbowWave);
  });

  document.getElementById('btn-sparkle').addEventListener('click', () => {
    startPatterns(() => generateRandomSparkle(5));
  });

  document.getElementById('btn-scroll').addEventListener('click', () => {
    stopPatterns();
    const text = document.getElementById('scroll-text').value || 'Hello!';
    const color = parseInt(document.getElementById('scroll-color').value);
    const msg = generateTextScroll(text, color);
    sendMidi({ type: 'sysex', data: msg });
  });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  generateGrid();
  setupEventListeners();
  connect();
});
