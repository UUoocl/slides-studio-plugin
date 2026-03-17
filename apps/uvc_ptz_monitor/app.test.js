import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create a base mock element
const createBaseMock = () => {
    const el = {
        addEventListener: vi.fn(),
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
        dataset: {},
        children: [],
        appendChild: vi.fn((child) => {
            el.children.push(child);
            if (child.textContent) {
                el.innerHTML += `<option>${child.textContent}</option>`;
            }
        }),
        innerHTML: '',
        textContent: '',
        value: '',
        checked: false,
    };
    return el;
};

// Mock DOM elements
const mockElements = {
    'preview': createBaseMock(),
    'camera-select': createBaseMock(),
    'refresh-devices': createBaseMock(),
    'status': createBaseMock(),
    'controls-container': createBaseMock(),
    'video-overlay': createBaseMock(),
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
});

vi.stubGlobal('navigator', {
    mediaDevices: {
        enumerateDevices: vi.fn(),
        getUserMedia: vi.fn(),
    }
});

import { UVCPTZMonitor } from './app.js';

describe('UVCPTZMonitor', () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        navigator.mediaDevices.enumerateDevices.mockResolvedValue([]);
        app = new UVCPTZMonitor();
    });

    it('should initialize correctly', () => {
        expect(app).toBeDefined();
        expect(document.getElementById).toHaveBeenCalledWith('status');
        expect(mockElements['status'].textContent).toBe('Ready');
    });

    it('should list and populate camera devices', async () => {
        const mockDevices = [
            { kind: 'videoinput', deviceId: 'cam1', label: 'Camera 1' },
            { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' },
            { kind: 'videoinput', deviceId: 'cam2', label: 'Camera 2' },
        ];
        navigator.mediaDevices.enumerateDevices.mockResolvedValue(mockDevices);

        await app.listDevices();

        expect(app.devices).toHaveLength(2);
        expect(app.devices[0].deviceId).toBe('cam1');
        
        // Check dropdown population
        expect(mockElements['camera-select'].innerHTML).toContain('Camera 1');
        expect(mockElements['camera-select'].innerHTML).toContain('Camera 2');
        expect(mockElements['camera-select'].innerHTML).not.toContain('Microphone');
    });

    it('should request camera access and set video source', async () => {
        const mockTracks = [{ 
            kind: 'video', 
            stop: vi.fn(),
            getCapabilities: vi.fn(() => ({})),
            applyConstraints: vi.fn().mockResolvedValue({})
        }];
        const mockStream = {
            getTracks: vi.fn(() => mockTracks),
            getVideoTracks: vi.fn(() => mockTracks)
        };
        navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
        
        mockElements['camera-select'].value = 'cam1';
        await app.connectCamera('cam1');

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: { deviceId: { exact: 'cam1' } }
        });
        expect(app.stream).toBe(mockStream);
        expect(mockElements['preview'].srcObject).toBe(mockStream);
        expect(mockElements['video-overlay'].style.display).toBe('none');
    });

    it('should handle camera connection error', async () => {
        const error = new Error('Permission denied');
        error.name = 'NotAllowedError';
        navigator.mediaDevices.getUserMedia.mockRejectedValue(error);
        
        await app.connectCamera('cam1');

        expect(mockElements['status'].textContent).toBe('Error: NotAllowedError');
        expect(mockElements['status'].className).toBe('status-indicator error');
    });

    it('should update status correctly', () => {
        app.updateStatus('Connected', false);
        expect(mockElements['status'].textContent).toBe('Connected');
        expect(mockElements['status'].className).toBe('status-indicator connected');

        app.updateStatus('Error', true);
        expect(mockElements['status'].textContent).toBe('Error');
        expect(mockElements['status'].className).toBe('status-indicator error');
    });
});
