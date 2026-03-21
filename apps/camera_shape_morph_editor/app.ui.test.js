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
    createElementNS: vi.fn().mockImplementation((ns, tag) => ({
        tag,
        style: {},
        classList: { add: vi.fn() },
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn()
    })),
    createElement: vi.fn().mockImplementation((tag) => ({
        tag,
        style: {},
        classList: { add: vi.fn() },
        appendChild: vi.fn(),
        addEventListener: vi.fn()
    }))
};

vi.stubGlobal('document', mockDocument);

const mockDOMParser = {
    parseFromString: vi.fn().mockImplementation((str, type) => {
        return {
            querySelector: vi.fn().mockImplementation((sel) => {
                if (sel === 'path') {
                    return { getAttribute: vi.fn().mockReturnValue('M0 0 L100 100') };
                }
                return null;
            })
        };
    })
};
class MockDOMParser {
    constructor() {
        return mockDOMParser;
    }
}
vi.stubGlobal('DOMParser', MockDOMParser);

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

    it('should parse SVG input and update preview', async () => {
        await import('./app.js');
        const loadCallback = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        loadCallback();

        const btnParse = elementCache['btn-parse-svg'];
        const parseCallback = btnParse.addEventListener.mock.calls.find(call => call[0] === 'click')[1];

        elementCache['svg-input'].value = '<svg><path d="M0 0 L100 100"></path></svg>';
        
        parseCallback();

        expect(elementCache['preview-path'].setAttribute).toHaveBeenCalledWith('d', 'M0 0 L100 100');
    });
});
