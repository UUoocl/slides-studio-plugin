import { describe, it, expect, vi, beforeEach } from 'vitest';

// Detailed DOM Mock
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
                setAttribute: vi.fn(),
                getAttribute: vi.fn(),
                dataset: {},
                innerHTML: '',
                textContent: '',
                value: ''
            };
        }
        return elementCache[id];
    }),
    createElement: vi.fn().mockImplementation((tag) => ({
        tag,
        style: {},
        classList: { add: vi.fn() },
        appendChild: vi.fn(),
        addEventListener: vi.fn()
    }))
};

vi.stubGlobal('document', mockDocument);

const mockWindow = {
    addEventListener: vi.fn(),
    scSocket: { invoke: vi.fn().mockResolvedValue({}) },
    location: { hostname: 'localhost' }
};
vi.stubGlobal('window', mockWindow);

describe('CameraShapeEditor UI', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        Object.keys(elementCache).forEach(key => delete elementCache[key]);
    });

    it('should initialize and setup event listeners', async () => {
        await import('./app.js');
        
        // Find DOMContentLoaded listener
        const loadCall = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded');
        expect(loadCall).toBeDefined();
        const loadCallback = loadCall[1];
        loadCallback();

        expect(mockDocument.getElementById).toHaveBeenCalledWith('btn-update-canvas');
        expect(elementCache['btn-update-canvas'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should update canvas size on button click', async () => {
        await import('./app.js');
        const loadCallback = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        loadCallback();

        const btnUpdate = elementCache['btn-update-canvas'];
        const updateCallback = btnUpdate.addEventListener.mock.calls.find(call => call[0] === 'click')[1];

        elementCache['canvas-width'].value = '1280';
        elementCache['canvas-height'].value = '720';

        updateCallback();

        expect(elementCache['canvas-container'].style.width).toBe('1280px');
        expect(elementCache['canvas-container'].style.height).toBe('720px');
        expect(elementCache['preview-svg'].setAttribute).toHaveBeenCalledWith('viewBox', '0 0 1280 720');
    });
});
