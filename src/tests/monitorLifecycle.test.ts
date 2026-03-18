
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('obsidian', () => {
    class FileSystemAdapter {
        getBasePath() { return '/mock/path'; }
    }
    return {
        App: vi.fn(),
        Notice: vi.fn(),
        FileSystemAdapter,
        Plugin: class {},
        Platform: { isWin: false }
    };
});

import { FileSystemAdapter } from 'obsidian';

vi.mock('child_process', () => ({
    spawn: vi.fn(() => ({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
    }))
}));

vi.mock('socketcluster-server', () => ({
    attach: vi.fn(() => ({
        listener: vi.fn(() => ({ [Symbol.asyncIterator]: async function* () {} })),
        setMiddleware: vi.fn(),
        exchange: { transmitPublish: vi.fn() },
        clients: {},
        close: vi.fn()
    }))
}));

// Mock ObsServer to avoid side effects
vi.mock('../utils/obsEndpoints', () => ({
    ObsServer: class {
        registerRoutes() {}
        cleanup() {}
    }
}));

import { spawn } from 'child_process';
import { ServerManager } from '../utils/serverLogic';

describe('Monitor Lifecycle', () => {
    let serverManager: any;
    const mockApp: any = { vault: { adapter: new FileSystemAdapter() } };
    const mockPlugin: any = { 
        manifest: { dir: 'plugins/slides-studio' },
        settings: { 
            pythonPath: 'python3',
            mouseMonitorEnabled: true,
            keyboardMonitorEnabled: true,
            mouseMonitorPosition: true,
            mouseMonitorClicks: true,
            mouseMonitorScroll: true,
            keyboardMonitorShowCombinations: true
        }
    };

    beforeEach(() => {
        serverManager = new ServerManager(mockApp, mockPlugin, 59000);
    });

    it('should spawn python processes when enabled', async () => {
        await serverManager.startMouseMonitor();
        expect(spawn).toHaveBeenCalledWith('python3', expect.arrayContaining([expect.stringContaining('mouse_monitor.py')]));
        
        await serverManager.startKeyboardMonitor();
        expect(spawn).toHaveBeenCalledWith('python3', expect.arrayContaining([expect.stringContaining('keyboard_monitor.py')]));
    });

    it('should kill processes on stop', async () => {
        await serverManager.startMouseMonitor();
        serverManager.stopMouseMonitor();
        expect(serverManager.mouseMonitorProcess).toBeNull();
    });
});
