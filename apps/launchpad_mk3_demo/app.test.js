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
    requestMIDIAccess: vi.fn()
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

    it('should update communication mode display', () => {
        mockElements['comm-mode'].value = 'direct';
        app.updateCommModeDisplay();
        expect(mockElements['midi-select-container'].style.display).toBe('block');
        expect(mockElements['sc-select-container'].style.display).toBe('none');

        mockElements['comm-mode'].value = 'socket';
        app.updateCommModeDisplay();
        expect(mockElements['midi-select-container'].style.display).toBe('none');
        expect(mockElements['sc-select-container'].style.display).toBe('block');
    });

    it('should toggle connection', async () => {
        const disconnectSpy = vi.spyOn(app, 'disconnect');
        const connectSpy = vi.spyOn(app, 'connect');

        app.isConnected = true;
        await app.toggleConnection();
        expect(disconnectSpy).toHaveBeenCalled();

        app.isConnected = false;
        await app.toggleConnection();
        expect(connectSpy).toHaveBeenCalled();
    });
});
