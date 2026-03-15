import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock SocketCluster client BEFORE importing app.js
vi.mock('../lib/socketcluster-client.min.js', () => ({
  create: vi.fn().mockReturnValue({
    listener: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true })
      })
    }),
    subscribe: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true })
      })
    }),
    state: 'closed',
    disconnect: vi.fn()
  })
}));

// Mock DOM
const elementCache = {};
const mockDocument = {
  getElementById: vi.fn().mockImplementation((id) => {
    if (!elementCache[id]) {
      elementCache[id] = {
        id,
        style: {},
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        },
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        dataset: {},
        innerHTML: '',
        textContent: '',
        value: ''
      };
    }
    return elementCache[id];
  }),
  querySelectorAll: vi.fn().mockReturnValue([]),
  createElement: vi.fn().mockImplementation((tag) => ({
    tag,
    style: {},
    classList: { add: vi.fn() },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    dataset: {},
    innerHTML: '',
    textContent: ''
  }))
};

const mockWindow = {
  location: {
    hostname: 'localhost',
    port: '8080'
  },
  WebSocket: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn()
  })),
  addEventListener: vi.fn(),
  __vitest_worker__: true // Important for our app.js to not auto-init
};

const mockNavigator = {
  requestMIDIAccess: vi.fn().mockResolvedValue({
    inputs: new Map(),
    outputs: new Map(),
    onstatechange: null
  })
};

vi.stubGlobal('document', mockDocument);
vi.stubGlobal('window', mockWindow);
vi.stubGlobal('navigator', mockNavigator);
vi.stubGlobal('WebSocket', mockWindow.WebSocket);

import { FireApp } from './app.js';

describe('FireApp', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new FireApp();
  });

  it('should initialize with default state', () => {
    expect(app.mode).toBe('socket');
    expect(app.isConnected).toBe(false);
  });

  it('should update status UI', () => {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    
    app.updateStatus('App Connected', true);
    
    expect(statusText.textContent).toBe('App Connected');
    expect(statusIndicator.classList.add).toHaveBeenCalledWith('connected');
  });

  it('should toggle connectivity UI based on mode', () => {
    const scContainer = document.getElementById('sc-select-container');
    const midiContainer = document.getElementById('midi-select-container');
    
    app.commModeSelect.value = 'direct';
    app.updateCommModeDisplay();
    expect(scContainer.style.display).toBe('none');
    expect(midiContainer.style.display).toBe('block');
    
    app.commModeSelect.value = 'socket';
    app.updateCommModeDisplay();
    expect(scContainer.style.display).toBe('block');
    expect(midiContainer.style.display).toBe('none');
  });

  it('should handle MIDI note input by updating pad UI', () => {
    // Note 54 is Row 0, Col 0 on Fire
    const midiData = new Uint8Array([0x90, 54, 127]);
    
    const pad = document.getElementById('pad-0-0');
    app.handleMidiInput(midiData);
    
    expect(pad.classList.add).toHaveBeenCalledWith('active');
    expect(pad.style.backgroundColor).toBe('#ff5252');
  });
});
