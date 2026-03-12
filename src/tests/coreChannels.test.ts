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
        const channel = 'testChannel';
        const data = { foo: 'bar' };
        
        serverManager.broadcast(channel, data);
        
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith(channel, data);
    });

    it('should map OBS events to flat channels', () => {
        const eventName = 'SceneChange';
        const eventData = { scene: 'test' };
        
        serverManager.broadcastObsEvent(eventName, eventData);
        
        // Check for flat channel naming
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith(`obs:${eventName}`, eventData);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('obsEvents', { eventName, eventData });
    });

    it('should map hardware inputs to flat channels', () => {
        // OSC
        serverManager.broadcastOscMessage('MyOsc', ['/test', 1.0]);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('osc_in_MyOsc', expect.any(Object));

        // MIDI
        serverManager.broadcastMidiMessage('MyMidi', { type: 'noteon', note: 60, velocity: 100 });
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('midi_in_MyMidi', expect.any(Object));

        // Gamepad
        serverManager.broadcastGamepadMessage('MyPad', { buttons: [] });
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('gamepad_in_MyPad', expect.any(Object));
    });

    it('should map audio data to flat channels', () => {
        serverManager.broadcastAudioMessage('audioFFT', 'Mic', [1, 2, 3]);
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('audio_fft', expect.objectContaining({ device: 'Mic' }));

        serverManager.broadcastAudioMessage('audioSTT', 'Mic', 'Hello');
        expect(mockScServer.exchange.transmitPublish).toHaveBeenCalledWith('audio_stt', expect.objectContaining({ device: 'Mic' }));
    });
});
