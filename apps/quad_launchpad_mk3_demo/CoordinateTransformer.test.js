import { describe, it, expect } from 'vitest';
import { CoordinateTransformer } from './CoordinateTransformer';

// DEVICE_CONFIG:
// "0,0": { x: 0, y: 0, rotation: -90 }, // Top-Left
// "0,1": { x: 1, y: 0, rotation: 0 },   // Top-Right
// "1,0": { x: 0, y: 1, rotation: 180 }, // Bottom-Left
// "1,1": { x: 1, y: 1, rotation: 90 },  // Bottom-Right

describe('CoordinateTransformer', () => {
  it('should map top-left device (0,0) rotated -90', () => {
    // Global (0,0)
    // Rotation -90 -> local (0,0) becomes physical bottom-left (x=0, y=7)
    // Formula check: cy=-3.5, cx=-3.5. rad = 90 deg (since inverted).
    // rx = -3.5*0 - (-3.5)*1 = 3.5
    // ry = -3.5*1 + (-3.5)*0 = -3.5
    // finalX = 7, finalY = 0 -> Note: (8-0)*10 + 7+1 = 88.
    // Wait, if device is rotated -90 (counter-clockwise), its physical top edge is facing left.
    // So global (0,0) hits the top-left of the overall grid, which is the physical top-right pad (88) of the rotated device.
    const res1 = CoordinateTransformer.globalToLocal(0, 0);
    expect(res1.deviceId).toBe('0,0');
    expect(res1.note).toBe(88); // 88 is physical top-right
  });

  it('should map top-right device (0,1) rotated 0', () => {
    // Global (8,0) -> local (0,0) in top-right device
    // Rotation 0 -> physical top-left (81)
    const res = CoordinateTransformer.globalToLocal(8, 0);
    expect(res.deviceId).toBe('0,1');
    expect(res.note).toBe(81);
  });

  it('should map bottom-left device (1,0) rotated 180', () => {
    // Global (0,8) -> local (0,0) in bottom-left device
    // Rotation 180 -> physical bottom-right (18)
    const res = CoordinateTransformer.globalToLocal(0, 8);
    expect(res.deviceId).toBe('1,0');
    expect(res.note).toBe(18);
  });

  it('should map bottom-right device (1,1) rotated 90', () => {
    // Global (8,8) -> local (0,0) in bottom-right device
    // Rotation 90 -> physical bottom-left (11)
    // Let's verify mathematically: cx=-3.5, cy=-3.5. rad = -90 deg.
    // rx = -3.5*0 - (-3.5)*(-1) = -3.5
    // ry = -3.5*(-1) + (-3.5)*0 = 3.5
    // finalX = 0, finalY = 7 -> Note: (8-7)*10 + 0+1 = 11.
    const res = CoordinateTransformer.globalToLocal(8, 8);
    expect(res.deviceId).toBe('1,1');
    expect(res.note).toBe(11);
  });

  it('should return null for out of bounds coordinates', () => {
    expect(CoordinateTransformer.globalToLocal(-1, 0)).toBeNull();
    expect(CoordinateTransformer.globalToLocal(16, 16)).toBeNull();
  });
});
