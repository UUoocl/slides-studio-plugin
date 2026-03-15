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
    'midi-input-select': createBaseMock(),
    'midi-output-select': createBaseMock(),
    'sc-select-container': createBaseMock(),
    'midi-select-container': createBaseMock(),
    'btn-connect': { ...createBaseMock(), innerText: 'Connect' },
    'btn-scan': createBaseMock(),
    'btn-programmer': createBaseMock(),
    'btn-clear': createBaseMock(),
    'btn-fill': { ...createBaseMock(), value: '5' },
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

vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 0)));
vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => clearTimeout(id)));

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

    it('should scan and list MIDI devices in separate dropdowns', () => {
        const mockOutput = { id: 'out1', name: 'Launchpad Output' };
        const mockInput = { id: 'in1', name: 'Launchpad Input' };
        app.midiAccess = {
            outputs: new Map([['out1', mockOutput]]),
            inputs: new Map([['in1', mockInput]])
        };

        app.scanDevices();

        expect(mockElements['midi-input-select'].innerHTML).toBe('');
        expect(mockElements['midi-output-select'].innerHTML).toBe('');
        expect(document.createElement).toHaveBeenCalledWith('option');
    });

    it('should connect to direct MIDI using separate Input and Output IDs', async () => {
        const inputId = 'in1';
        const outputId = 'out1';
        const mockOutput = { id: outputId, name: 'Launchpad Output', send: vi.fn() };
        const mockInput = { id: inputId, name: 'Launchpad Input', onmidimessage: null };
        
        app.midiAccess = {
            outputs: new Map([[outputId, mockOutput]]),
            inputs: new Map([[inputId, mockInput]])
        };

        const updateStatusSpy = vi.spyOn(app, 'updateStatus');
        const enterProgrammerModeSpy = vi.spyOn(app, 'enterProgrammerMode');

        await app.connectDirect(inputId, outputId);

        expect(app.output).toBe(mockOutput);
        expect(app.input).toBe(mockInput);
        expect(mockInput.onmidimessage).toBeDefined();
        expect(updateStatusSpy).toHaveBeenCalledWith(`Connected: ${mockOutput.name}`, true);
        expect(enterProgrammerModeSpy).toHaveBeenCalled();
    });

    it('should update virtual UI when MIDI message is received', () => {
        const padId = 60;
        const mockPad = createBaseMock();
        mockElements[`pad-${padId}`] = mockPad;

        // Note On, Velocity 5 (Red)
        app.handleMidiMessage({ data: new Uint8Array([0x90, padId, 5]) });

        expect(mockPad.classList.add).toHaveBeenCalledWith('active-glow');
        expect(mockPad.style.backgroundColor).toBe('#ff0000'); // Palette 5 is Red

        // Note Off
        app.handleMidiMessage({ data: new Uint8Array([0x80, padId, 0]) });
        expect(mockPad.classList.remove).toHaveBeenCalledWith('active-glow');
        expect(mockPad.style.backgroundColor).toBe('');
    });

    it('should send MIDI in direct mode', () => {
        const mockOutput = { send: vi.fn() };
        app.output = mockOutput;
        mockElements['comm-mode'].value = 'direct';

        const payload = { type: 'noteon', data: [0x90, 60, 127] };
        app.sendMidi(payload);

        expect(mockOutput.send).toHaveBeenCalledWith(payload.data);
    });

    it('should send MIDI message when pad is clicked', () => {
        const sendMidiSpy = vi.spyOn(app, 'sendMidi');
        const padId = 60;
        mockElements['palette-color'].value = '5'; // Red

        app.sendPadLED(padId);

        expect(sendMidiSpy).toHaveBeenCalledWith({
            type: 'noteon',
            data: [0x90, padId, 5]
        });
    });

    it('should start patterns and send MIDI messages', async () => {
        vi.useFakeTimers();
        const sendMidiSpy = vi.spyOn(app, 'sendMidi');
        const mockPattern = vi.fn().mockReturnValue([0xF0, 0x00, 0xF7]);

        app.startPatterns(mockPattern);
        
        // Wait for first tick
        await vi.advanceTimersByTimeAsync(100);

        expect(mockPattern).toHaveBeenCalled();
        expect(sendMidiSpy).toHaveBeenCalledWith({
            type: 'sysex',
            data: expect.any(Array)
        });
        
        app.stopPatterns();
        vi.useRealTimers();
    });
});
