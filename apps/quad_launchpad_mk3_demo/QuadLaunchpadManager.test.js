import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuadLaunchpadManager } from './QuadLaunchpadManager';
import { LaunchpadConnection } from './LaunchpadConnection';
import { DEVICE_CONFIG } from './constants';

vi.mock('./LaunchpadConnection', () => {
  const MockConnection = vi.fn().mockImplementation(function(id, cb) {
    this.deviceId = id;
    this.callback = cb;
    this.setMidiAccess = vi.fn();
    this.connect = vi.fn().mockResolvedValue(true);
    this.disconnect = vi.fn();
    this.sendMidi = vi.fn();
    this.enterProgrammerMode = vi.fn();
    this.isConnected = false;
  });
  return { LaunchpadConnection: MockConnection };
});

describe('QuadLaunchpadManager', () => {
  let manager;
  let mockCallback;

  beforeEach(() => {
    mockCallback = vi.fn();
    // Reset the mock before each test to clear instances
    vi.clearAllMocks();
    manager = new QuadLaunchpadManager(mockCallback);
  });

  it('should initialize 4 connections', () => {
    expect(manager.connections.size).toBe(4);
    expect(LaunchpadConnection).toHaveBeenCalledTimes(4);
    
    for (const id of Object.keys(DEVICE_CONFIG)) {
      expect(manager.connections.has(id)).toBe(true);
    }
  });

  it('should handle incoming messages from connections', () => {
    const data = [0x90, 11, 127];
    manager.handleMessage('0,0', data);
    expect(mockCallback).toHaveBeenCalledWith('0,0', data);
  });

  it('should send payload to all devices', () => {
    const payload = { type: 'sysex', data: [0xF0, 0xF7] };
    manager.sendToAll(payload);
    
    for (const conn of manager.connections.values()) {
      expect(conn.sendMidi).toHaveBeenCalledWith(payload);
    }
  });

  it('should route connection requests to the correct connection', async () => {
    const conn = manager.getConnection('0,0');
    await manager.connectDevice('0,0', 'direct', 'in1', 'out1');
    expect(conn.connect).toHaveBeenCalledWith('direct', 'in1', 'out1', undefined);
  });
});
