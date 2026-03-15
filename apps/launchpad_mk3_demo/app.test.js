import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create a base mock element
const createBaseMock = () => ({
    addEventListener: vi.fn(),
    style: {},
    classList: { add: vi.fn(), remove: vi.fn() },
    dataset: {},
    appendChild: vi.fn(),
    innerHTML: '',
    textContent: '',
    value: '',
});

// Mock DOM elements
const mockElements = {
    'virtual-launchpad': createBaseMock(),
    'status-indicator': createBaseMock(),
    'status-text': createBaseMock(),
    'device-name': { ...createBaseMock(), value: 'Launchpad MK3' },
    'comm-mode': { ...createBaseMock(), value: 'socket' },
    'midi-device-select': { ...createBaseMock(), parentElement: createBaseMock() },
    'sc-select-container': createBaseMock(),
    'midi-select-container': createBaseMock(),
    'btn-connect': { ...createBaseMock(), innerText: 'Connect' },
    'btn-scan': createBaseMock(),
    'btn-programmer': createBaseMock(),
    'btn-clear': createBaseMock(),
    'btn-fill': { ...createBaseMock(), value: '5' }, // button might not have value but color-input does
    'fill-color': { ...createBaseMock(), value: '5' },
    'btn-rainbow': createBaseMock(),
    'btn-sparkle': createBaseMock(),
    'btn-scroll': createBaseMock(),
    'scroll-text': { ...createBaseMock(), value: 'Hello' },
    'scroll-color': { ...createBaseMock(), value: '13' },
    'palette-color': { ...createBaseMock(), value: '5' },
    'led-behavior': { ...createBaseMock(), value: '96' },
    'use-custom-rgb': { ...createBaseMock(), checked: false },
    'custom-rgb-controls': createBaseMock(),
    'rgb-r': { ...createBaseMock(), value: '255' },
    'rgb-g': { ...createBaseMock(), value: '0' },
    'rgb-b': { ...createBaseMock(), value: '0' },
    'val-r': createBaseMock(),
    'val-g': createBaseMock(),
    'val-b': createBaseMock(),
};

vi.stubGlobal('document', {
    getElementById: vi.fn((id) => mockElements[id] || createBaseMock()),
    createElement: vi.fn(() => createBaseMock()),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
});

vi.stubGlobal('window', {
    location: {
        hostname: 'localhost',
        port: '8080',
        protocol: 'http:'
    },
    addEventListener: vi.fn(),
    requestAnimationFrame: vi.fn(),
    cancelAnimationFrame: vi.fn(),
});

vi.stubGlobal('navigator', {
    requestMIDIAccess: vi.fn().mockResolvedValue({ outputs: new Map(), inputs: new Map() })
});

// Mock socketcluster-client
vi.mock('../lib/socketcluster-client.min.js', () => ({
    create: vi.fn(() => ({
        listener: vi.fn(() => ({
            [Symbol.asyncIterator]: async function* () {
                // Empty iterator
            }
        })),
        state: 'closed',
        disconnect: vi.fn(),
        subscribe: vi.fn(),
        transmitPublish: vi.fn()
    }))
}));

import { LaunchpadApp } from './app.js';

describe('LaunchpadApp', () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        app = new LaunchpadApp();
    });

    it('should initialize correctly', () => {
        expect(app).toBeDefined();
        expect(document.getElementById).toHaveBeenCalledWith('virtual-launchpad');
    });

    it('should update status correctly', () => {
        app.updateStatus('Connected', true);
        expect(app.isConnected).toBe(true);
        expect(mockElements['status-text'].textContent).toBe('Connected');
        expect(mockElements['status-indicator'].classList.add).toHaveBeenCalledWith('connected');
        expect(mockElements['btn-connect'].innerText).toBe('Disconnect');

        app.updateStatus('Disconnected', false);
        expect(app.isConnected).toBe(false);
        expect(mockElements['status-indicator'].classList.remove).toHaveBeenCalledWith('connected');
        expect(mockElements['btn-connect'].innerText).toBe('Connect');
    });

    it('should update communication mode display on change event', () => {
        const changeHandler = mockElements['comm-mode'].addEventListener.mock.calls.find(call => call[0] === 'change')[1];
        expect(changeHandler).toBeDefined();

        mockElements['comm-mode'].value = 'direct';
        changeHandler();
        expect(mockElements['midi-select-container'].style.display).toBe('block');
        expect(mockElements['sc-select-container'].style.display).toBe('none');

        mockElements['comm-mode'].value = 'socket';
        changeHandler();
        expect(mockElements['midi-select-container'].style.display).toBe('none');
        expect(mockElements['sc-select-container'].style.display).toBe('block');
    });

    it('should request MIDI access', async () => {
        const midiAccess = { outputs: new Map(), inputs: new Map() };
        navigator.requestMIDIAccess.mockResolvedValue(midiAccess);
        
        await app.requestMidiAccess();
        
        expect(navigator.requestMIDIAccess).toHaveBeenCalledWith({ sysex: true });
        expect(app.midiAccess).toBe(midiAccess);
    });

    it('should scan and list MIDI devices', () => {
        const mockOutput = { id: 'lp1', name: 'Launchpad MK3' };
        app.midiAccess = {
            outputs: new Map([['lp1', mockOutput]]),
            inputs: new Map()
        };

        app.scanDevices();

        expect(mockElements['midi-device-select'].innerHTML).toBe('');
        expect(document.createElement).toHaveBeenCalledWith('option');
    });

    it('should send MIDI in direct mode', () => {
        const mockOutput = { send: vi.fn() };
        app.output = mockOutput;
        mockElements['comm-mode'].value = 'direct';

        const payload = { type: 'noteon', data: [0x90, 60, 127] };
        app.sendMidi(payload);

        expect(mockOutput.send).toHaveBeenCalledWith(payload.data);
    });
});
