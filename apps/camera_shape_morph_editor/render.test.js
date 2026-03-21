import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../../slide-studio-app/lib/sync-service.js';

// Detailed DOM Mock
const elementCache = {};
const mockDocument = {
    getElementById: vi.fn().mockImplementation((id) => {
        if (!elementCache[id]) {
            elementCache[id] = {
                id,
                setAttribute: vi.fn(),
                getAttribute: vi.fn(),
                style: {}
            };
        }
        return elementCache[id];
    })
};
vi.stubGlobal('document', mockDocument);

const mockWindow = {
    addEventListener: vi.fn(),
    location: { hostname: 'localhost' }
};
vi.stubGlobal('window', mockWindow);

// Mock persistence
vi.mock('./persistence.js', () => ({
    loadShapes: vi.fn().mockResolvedValue({
        'circle-mask': { path: 'M10 10 L20 20', duration: 1, ease: 'power2.inOut' }
    })
}));

describe('Render Page Synchronization', () => {
    let subscribeSpy;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        Object.keys(elementCache).forEach(k => delete elementCache[k]);
        subscribeSpy = vi.spyOn(SyncService, 'subscribeSync').mockImplementation(() => {});
    });

    it('should subscribe to SyncService on initialization', async () => {
        await import('./render.js');
        const loadCallback = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        await loadCallback();

        expect(subscribeSpy).toHaveBeenCalled();
    });

    it('should trigger morph when cameraShape changes', async () => {
        await import('./render.js');
        const loadCallback = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        await loadCallback();

        const syncCallback = subscribeSpy.mock.calls[0][0];

        // Simulate sync event
        syncCallback({ cameraShape: 'circle-mask' });

        expect(elementCache['mask-path'].setAttribute).toHaveBeenCalledWith('d', 'M10 10 L20 20');
    });

    it('should trigger GSAP morph when GSAP is available', async () => {
        const mockGsap = {
            to: vi.fn(),
            registerPlugin: vi.fn()
        };
        vi.stubGlobal('gsap', mockGsap);
        vi.stubGlobal('MorphSVGPlugin', {});

        await import('./render.js');
        const loadCallback = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        await loadCallback();

        const syncCallback = subscribeSpy.mock.calls[0][0];

        // Simulate sync event
        syncCallback({ cameraShape: 'circle-mask' });

        expect(mockGsap.to).toHaveBeenCalledWith(elementCache['mask-path'], expect.objectContaining({
            morphSVG: {
                shape: 'M10 10 L20 20',
                shapeIndex: 'auto'
            },
            duration: 1,
            ease: 'power2.inOut'
        }));
    });
});
