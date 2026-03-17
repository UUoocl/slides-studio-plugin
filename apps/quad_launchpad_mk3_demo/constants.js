/**
 * Device layout and rotation configurations.
 * 0,0 is Top-Left
 * 0,1 is Top-Right
 * 1,0 is Bottom-Left
 * 1,1 is Bottom-Right
 */
export const DEVICE_CONFIG = {
  "0,0": { x: 0, y: 0, rotation: -90 }, // Top-Left
  "0,1": { x: 1, y: 0, rotation: 0 },   // Top-Right
  "1,0": { x: 0, y: 1, rotation: 180 }, // Bottom-Left
  "1,1": { x: 1, y: 1, rotation: 90 },  // Bottom-Right
};

/**
 * Global canvas dimensions
 * Each device provides an 8x8 grid (excluding top/side control buttons)
 * The 2x2 layout gives a 16x16 logical surface.
 */
export const GLOBAL_WIDTH = 16;
export const GLOBAL_HEIGHT = 16;
