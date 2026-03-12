import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerManager } from '../utils/serverLogic';

// Mock obsidian
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

// Mock socketcluster-server
const mockScServer = {
    listener: vi.fn().mockImplementation(() => ({
        [Symbol.asyncIterator]: async function* () {}
    })),
    setMiddleware: vi.fn(),
    exchange: {
        subscribe: vi.fn(),
        transmitPublish: vi.fn()
    },
    MIDDLEWARE_INBOUND: 'inbound',
    clients: {},
    close: vi.fn().mockResolvedValue(undefined)
};

vi.mock('socketcluster-server', () => {
    return {
        __esModule: true,
        attach: vi.fn(() => mockScServer),
        AGServer: vi.fn()
    };
});

// Mock other dependencies
vi.mock('../utils/obsEndpoints', () => ({
    ObsServer: class {
        registerRoutes() {}
        cleanup() {}
    }
}));

vi.mock('@fastify/static', () => ({
    default: vi.fn()
}));

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

describe('Core Channels Mapping', () => {
    let serverManager: ServerManager;

    beforeEach(async () => {
        // @ts-ignore
        serverManager = new ServerManager(mockApp, mockPlugin, 9999);
        await serverManager.start();
        vi.clearAllMocks();
    });

    it('should have a unified broadcast method that publishes to SocketCluster', () => {
        const channel = 'test/channel';
        const data = { foo: 'bar' };
        
        // @ts-ignore - broadcast might not exist yet
        serverManager.broadcast(channel, data);
        
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith(channel, data);
    });

    it('should map OBS events to hierarchical channels', () => {
        const eventName = 'SceneChange';
        const eventData = { scene: 'test' };
        
        serverManager.broadcastObsEvent(eventName, eventData);
        
        // Check for hierarchical channel naming
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith(`obs/event/${eventName}`, eventData);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('obs/events', { eventName, eventData });
    });

    it('should map hardware inputs to hierarchical channels', () => {
        // OSC
        serverManager.broadcastOscMessage('MyOsc', ['/test', 1.0]);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('osc/in/MyOsc', expect.any(Object));

        // MIDI
        serverManager.broadcastMidiMessage('MyMidi', { type: 'noteon', note: 60, velocity: 100 });
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('midi/in/MyMidi', expect.any(Object));

        // Gamepad
        serverManager.broadcastGamepadMessage('MyPad', { buttons: [] });
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('gamepad/in/MyPad', expect.any(Object));
    });

    it('should map audio data to hierarchical channels', () => {
        serverManager.broadcastAudioMessage('audioFFT', 'Mic', [1, 2, 3]);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('audio/fft', expect.objectContaining({ device: 'Mic' }));

        serverManager.broadcastAudioMessage('audioSTT', 'Mic', 'Hello');
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('audio/stt', expect.objectContaining({ device: 'Mic' }));
    });
});
