import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('obsidian', () => {
    class FileSystemAdapter {
        getBasePath() { return '/mock/base/path'; }
    }
    return {
        App: vi.fn(),
        Notice: vi.fn(),
        FileSystemAdapter,
        Plugin: class {}
    };
});

import { FileSystemAdapter } from 'obsidian';

// Mock WebSocket-server before importing ServerManager
const mockScServer = {
    listener: vi.fn().mockImplementation((name) => {
        if (name === 'connection') {
            return {
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        socket: {
                            id: 'test-socket-id',
                            authToken: { name: 'TestClient' },
                            procedure: () => ({ [Symbol.asyncIterator]: async function* () {} }),
                            receiver: () => ({ [Symbol.asyncIterator]: async function* () {} }),
                            listener: () => ({ [Symbol.asyncIterator]: async function* () {} }),
                            subscriptions: () => []
                        }
                    };
                }
            };
        }
        return { [Symbol.asyncIterator]: async function* () {} };
    }),
    setMiddleware: vi.fn(),
    exchange: {
        subscribe: vi.fn(),
        transmitPublish: vi.fn()
    },
    MIDDLEWARE_INBOUND: 'inbound',
    clients: {},
    close: vi.fn().mockResolvedValue(undefined)
};

vi.mock('WebSocket-server', () => {
    return {
        __esModule: true,
        attach: vi.fn(() => mockScServer),
        AGServer: vi.fn()
    };
});

// Mock ObsServer to avoid side effects
vi.mock('../utils/obsEndpoints', () => ({
    ObsServer: class {
        registerRoutes() {}
        cleanup() {}
    }
}));

// Mock fastify-static to avoid path issues
vi.mock('@fastify/static', () => ({
    default: vi.fn()
}));

import { ServerManager } from '../utils/serverLogic';
import { WebSocketServer } from 'ws';

// Mock slidesStudioPlugin
const mockPlugin = {
    manifest: { dir: 'plugins/slides-studio' },
    settings: {
        mouseMonitorEnabled: false,
        keyboardMonitorEnabled: false,
        uvcUtilEnabled: false,
        oscDevices: [],
        midiDevices: [],
        gamepadDevices: [],
        audioDevices: [],
        uvcDevices: []
    },
    isObsConnected: false,
    obs: {
        call: vi.fn(),
        callBatch: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    },
    handleUvcResponse: vi.fn(),
    oscManager: { sendMessage: vi.fn() },
    midiManager: { sendMidiMessage: vi.fn() }
};

const mockApp = {
    vault: {
        adapter: new FileSystemAdapter()
    }
};

describe('ServerManager WebSocket Integration', () => {
    let serverManager: ServerManager;
    const port = 9999;

    beforeEach(() => {
        // @ts-ignore
        serverManager = new ServerManager(mockApp, mockPlugin, port);
    });

    afterEach(async () => {
        await serverManager.stop();
    });

    it('should capture client name from connection metadata/handshake', async () => {
        await serverManager.start();
        
        // Give it a moment for the async connection loop to run
        await new Promise(resolve => setTimeout(resolve, 300));

        const clientMetadata = (serverManager as unknown).clientMetadata;
        
        expect(clientMetadata.get('test-socket-id')).toBeDefined();
        expect(clientMetadata.get('test-socket-id')?.name).toBe('TestClient');
    });
});
