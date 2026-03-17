import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LaunchpadConnection } from './LaunchpadConnection';
import * as scClient from '../lib/socketcluster-client.min.js';
import * as launchpadCore from '../launchpad_mk3_demo/launchpadCore.js';

vi.mock('../lib/socketcluster-client.min.js', () => ({
  create: vi.fn()
}));

vi.mock('../launchpad_mk3_demo/launchpadCore.js', () => ({
  generateProgrammerModeMsg: vi.fn(() => [0xF0, 0, 0, 0xF7])
}));

describe('LaunchpadConnection', () => {
  let connection;
  let mockCallback;

  beforeEach(() => {
    mockCallback = vi.fn();
    connection = new LaunchpadConnection('0,0', mockCallback);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    expect(connection.deviceId).toBe('0,0');
    expect(connection.isConnected).toBe(false);
    expect(connection.mode).toBe('socket');
    expect(connection.alias).toBe('lp_0_0');
  });

  it('should set MIDI access', async () => {
    const mockMidiAccess = { inputs: new Map(), outputs: new Map() };
    await connection.setMidiAccess(mockMidiAccess);
    expect(connection.midiAccess).toBe(mockMidiAccess);
  });

  it('should connect direct with valid inputs', async () => {
    const mockInput = { onmidimessage: null };
    const mockOutput = { send: vi.fn() };
    
    const mockMidiAccess = {
      inputs: new Map([['in1', mockInput]]),
      outputs: new Map([['out1', mockOutput]])
    };
    
    await connection.setMidiAccess(mockMidiAccess);
    
    const result = await connection.connect('direct', 'in1', 'out1');
    expect(result).toBe(true);
    expect(connection.isConnected).toBe(true);
    expect(launchpadCore.generateProgrammerModeMsg).toHaveBeenCalled();
    expect(mockOutput.send).toHaveBeenCalled();
  });

  it('should throw error when connecting direct without valid inputs', async () => {
    const mockMidiAccess = {
      inputs: new Map(),
      outputs: new Map()
    };
    
    await connection.setMidiAccess(mockMidiAccess);
    
    await expect(connection.connect('direct', 'invalid', 'invalid')).rejects.toThrow('MIDI Input/Output not found');
    expect(connection.isConnected).toBe(false);
  });
});
