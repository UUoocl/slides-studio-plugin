import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalCanvas } from './GlobalCanvas';
import { CoordinateTransformer } from './CoordinateTransformer';
import * as launchpadCore from '../launchpad_mk3_demo/launchpadCore.js';

vi.mock('./CoordinateTransformer', () => ({
  CoordinateTransformer: {
    globalToLocal: vi.fn((x, y) => {
      // Mock simple mapping for test
      if (x < 8 && y < 8) return { deviceId: '0,0', note: 11 };
      return null;
    })
  }
}));

vi.mock('../launchpad_mk3_demo/launchpadCore.js', () => ({
  generateBulkLEDMsg: vi.fn(() => [0xF0, 0x03, 0xF7])
}));

describe('GlobalCanvas', () => {
  let canvas;
  let mockManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockManager = {
      sendToDevice: vi.fn()
    };
    canvas = new GlobalCanvas(mockManager);
  });

  it('should initialize with 16x16 empty pixels', () => {
    expect(canvas.pixels.length).toBe(256);
    expect(canvas.pixels.every(p => p === 0)).toBe(true);
  });

  it('should set and get pixels', () => {
    canvas.setPixel(5, 5, 13);
    expect(canvas.getPixel(5, 5)).toBe(13);
    expect(canvas.getPixel(0, 0)).toBe(0); // unaltered
  });

  it('should clear pixels', () => {
    canvas.setPixel(5, 5, 13);
    canvas.clear();
    expect(canvas.getPixel(5, 5)).toBe(0);
  });

  it('should render and dispatch bulk messages', () => {
    canvas.setPixel(0, 0, 5); // Hits mock '0,0' device mapping
    canvas.render();
    
    expect(CoordinateTransformer.globalToLocal).toHaveBeenCalled();
    expect(launchpadCore.generateBulkLEDMsg).toHaveBeenCalled();
    expect(mockManager.sendToDevice).toHaveBeenCalledWith('0,0', {
      type: 'sysex',
      data: [0xF0, 0x03, 0xF7]
    });
  });
});
