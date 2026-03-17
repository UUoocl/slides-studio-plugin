import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuadLaunchpadApp } from './app';
import { DEVICE_CONFIG } from './constants';

vi.mock('./QuadLaunchpadManager', () => {
  const MockManager = vi.fn().mockImplementation(function() {
    this.init = vi.fn().mockResolvedValue(true);
    this.getMidiInputs = vi.fn().mockReturnValue([]);
    this.getMidiOutputs = vi.fn().mockReturnValue([]);
    this.connectDevice = vi.fn().mockResolvedValue(true);
    this.disconnectDevice = vi.fn().mockResolvedValue(true);
    this.getConnection = vi.fn();
    this.sendToAll = vi.fn();
    this.sendToDevice = vi.fn();
    this.enterProgrammerModeAll = vi.fn();
  });
  return { QuadLaunchpadManager: MockManager };
});

const createBaseMock = () => ({
  addEventListener: vi.fn(),
  style: {},
  classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
  dataset: {},
  appendChild: vi.fn(),
  innerHTML: '',
  textContent: '',
  value: '',
  querySelector: vi.fn()
});

const mockElements = {
  'connectivity-group': createBaseMock(),
  'device-0-0': { ...createBaseMock(), querySelector: vi.fn(() => createBaseMock()) },
  'device-0-1': { ...createBaseMock(), querySelector: vi.fn(() => createBaseMock()) },
  'device-1-0': { ...createBaseMock(), querySelector: vi.fn(() => createBaseMock()) },
  'device-1-1': { ...createBaseMock(), querySelector: vi.fn(() => createBaseMock()) },
  'pad-0,0-11': createBaseMock(),
  'btn-clear': createBaseMock(),
  'btn-programmer': createBaseMock(),
  'local-feedback-toggle': { ...createBaseMock(), checked: false },
};

// Add connectivity UI elements
for (const id of ['0-0', '0-1', '1-0', '1-1']) {
  mockElements[`mode-${id}`] = createBaseMock();
  mockElements[`sc-ui-${id}`] = createBaseMock();
  mockElements[`midi-ui-${id}`] = createBaseMock();
  mockElements[`btn-conn-${id}`] = createBaseMock();
  mockElements[`status-${id}`] = createBaseMock();
  mockElements[`alias-${id}`] = createBaseMock();
  mockElements[`midi-in-${id}`] = createBaseMock();
  mockElements[`midi-out-${id}`] = createBaseMock();
}

vi.stubGlobal('document', {
  getElementById: vi.fn((id) => mockElements[id] || null),
  createElement: vi.fn(() => createBaseMock()),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
});

vi.stubGlobal('window', {
  addEventListener: vi.fn(),
});

describe('QuadLaunchpadApp', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new QuadLaunchpadApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    expect(app.manager).toBeDefined();
    // Verify it tries to get the main container
    expect(document.getElementById).toHaveBeenCalledWith('connectivity-group');
  });

  it('should generate connectivity UI for all 4 devices', () => {
    const group = mockElements['connectivity-group'];
    // In our mock, createElement is called for the device-control divs
    // and appendChild is called on the group.
    // 4 devices = 4 appends
    expect(group.appendChild).toHaveBeenCalledTimes(4);
  });

  it('should handle incoming midi messages to update pad styles', () => {
    const pad = mockElements['pad-0,0-11'];
    
    // 0x90 Note On
    app.handleMidiMessage('0,0', [0x90, 11, 127]); // velocity 127
    expect(pad.classList.add).toHaveBeenCalledWith('active-glow');

    // 0x80 Note Off
    app.handleMidiMessage('0,0', [0x80, 11, 0]);
    expect(pad.classList.remove).toHaveBeenCalledWith('active-glow');
  });

  it('should call enterProgrammerModeAll when programmer button is clicked', () => {
    const btn = mockElements['btn-programmer'];
    const clickHandler = btn.addEventListener.mock.calls.find(call => call[0] === 'click')[1];
    expect(clickHandler).toBeDefined();
    
    clickHandler();
    expect(app.manager.enterProgrammerModeAll).toHaveBeenCalled();
  });

  it('should route local feedback when toggle is checked', () => {
    const toggle = mockElements['local-feedback-toggle'];
    toggle.checked = true;

    // 0x90 Note On
    app.handleMidiMessage('0,0', [0x90, 11, 127]);
    expect(app.manager.sendToDevice).toHaveBeenCalledWith('0,0', { type: 'noteon', data: [0x90, 11, 21] });

    // 0x90 Note Off (velocity 0)
    app.handleMidiMessage('0,0', [0x90, 11, 0]);
    expect(app.manager.sendToDevice).toHaveBeenCalledWith('0,0', { type: 'noteoff', data: [0x90, 11, 0] });
  });

  it('should NOT route local feedback when toggle is unchecked', () => {
    const toggle = mockElements['local-feedback-toggle'];
    toggle.checked = false;
    vi.clearAllMocks();

    app.handleMidiMessage('0,0', [0x90, 11, 127]);
    expect(app.manager.sendToDevice).not.toHaveBeenCalled();
  });
});
