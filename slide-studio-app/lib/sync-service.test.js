import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SocketCluster
const mockSocket = {
    transmitPublish: vi.fn(),
    subscribe: vi.fn(),
    state: 'open'
};

global.window = {
    scSocket: mockSocket,
    location: { origin: 'http://localhost' }
};

describe('SyncService', () => {
    let SyncService;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Dynamic import to ensure we can mock the socket before it's used
        const module = await import('./sync-service.js');
        SyncService = module.SyncService;
    });

    it('should define the slides_sync channel', () => {
        expect(SyncService.CHANNEL).toBe('slides_sync');
    });

    it('should publish deck state', async () => {
        const state = { url: 'deck.html', indexh: 1, indexv: 2 };
        SyncService.publishSync(state);
        expect(mockSocket.transmitPublish).toHaveBeenCalledWith('slides_sync', {
            eventName: 'sync-state',
            msgParam: state
        });
    });

    it('should subscribe to sync events', async () => {
        const callback = vi.fn();
        const mockChannel = {
            [Symbol.asyncIterator]: async function* () {
                yield { eventName: 'sync-state', msgParam: { url: 'test.html' } };
            }
        };
        mockSocket.subscribe.mockReturnValue(mockChannel);

        SyncService.subscribeSync(callback);

        expect(mockSocket.subscribe).toHaveBeenCalledWith('slides_sync');
        
        // Wait for the async iterator to process
        await new Promise(r => setTimeout(r, 50));
        expect(callback).toHaveBeenCalledWith({ url: 'test.html' });
    });
});
