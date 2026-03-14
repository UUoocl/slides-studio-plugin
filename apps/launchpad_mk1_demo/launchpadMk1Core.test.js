import { describe, it, expect } from 'vitest';
import { LaunchpadMk1Core } from './launchpadMk1Core.js';

describe('LaunchpadMk1Core', () => {
  describe('calculateColorVelocity', () => {
    it('should calculate Red (Full) correctly', () => {
      // Red: 3, Green: 0, Flags: 12 (0x0C)
      // (16 * 0) + 3 + 12 = 15
      expect(LaunchpadMk1Core.calculateColorVelocity(3, 0)).toBe(15);
    });

    it('should calculate Green (Full) correctly', () => {
      // Red: 0, Green: 3, Flags: 12 (0x0C)
      // (16 * 3) + 0 + 12 = 60
      expect(LaunchpadMk1Core.calculateColorVelocity(0, 3)).toBe(60);
    });

    it('should calculate Amber (Full) correctly', () => {
      // Red: 3, Green: 3, Flags: 12 (0x0C)
      // (16 * 3) + 3 + 12 = 63
      expect(LaunchpadMk1Core.calculateColorVelocity(3, 3)).toBe(63);
    });

    it('should handle flashing flags', () => {
      // Red: 3, Green: 0, Flags: 8 (0x08)
      // (16 * 0) + 3 + 8 = 11
      expect(LaunchpadMk1Core.calculateColorVelocity(3, 0, { flashing: true })).toBe(11);
    });
  });

  describe('xyToNote', () => {
    it('should map (0,0) to Note 0', () => {
      expect(LaunchpadMk1Core.xyToNote(0, 0)).toBe(0);
    });

    it('should map (0,8) to Note 8 (Scene button)', () => {
      expect(LaunchpadMk1Core.xyToNote(0, 8)).toBe(8);
    });

    it('should map (7,7) to Note 119', () => {
      // (16 * 7) + 7 = 112 + 7 = 119
      expect(LaunchpadMk1Core.xyToNote(7, 7)).toBe(119);
    });
  });

  describe('getTopRowCC', () => {
    it('should return 104 for Column 0', () => {
      expect(LaunchpadMk1Core.getTopRowCC(0)).toBe(104);
    });

    it('should return 111 for Column 7', () => {
      expect(LaunchpadMk1Core.getTopRowCC(7)).toBe(111);
    });
  });

  describe('parseMessage', () => {
    it('should parse a pad press message correctly', () => {
      const msg = new Uint8Array([0x90, 0, 127]);
      const result = LaunchpadMk1Core.parseMessage(msg);
      expect(result).toEqual({
        type: 'pad',
        row: 0,
        col: 0,
        isPress: true,
        isTopRow: false,
        note: 0
      });
    });

    it('should parse a top row CC press message correctly', () => {
      const msg = new Uint8Array([0xB0, 104, 127]);
      const result = LaunchpadMk1Core.parseMessage(msg);
      expect(result).toEqual({
        type: 'pad',
        row: -1,
        col: 0,
        isPress: true,
        isTopRow: true,
        note: 104
      });
    });
  });
});
