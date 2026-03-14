import {describe, it, expect} from 'vitest';
import {
  generateNoteOn,
  generateCC,
  generateSysExHeader,
  generateProgrammerModeMsg,
  generateSolidFill,
  generateRainbowWave,
  generateRandomSparkle,
  generateTextScroll,
} from '../../apps/midi_controller_demo/launchpadCore.js';

describe('Launchpad MIDI Message Helpers', () => {
  describe('generateNoteOn', () => {
    it('should generate a standard Note On message on channel 0', () => {
      // Channel 0: 0x90 = 144
      expect(generateNoteOn(60, 127)).toEqual([144, 60, 127]);
    });

    it('should generate a Note On message on other channels', () => {
      // Channel 1: 0x91 = 145
      expect(generateNoteOn(60, 127, 1)).toEqual([145, 60, 127]);
    });
  });

  describe('generateCC', () => {
    it('should generate a standard CC message on channel 0', () => {
      // Channel 0: 0xB0 = 176
      expect(generateCC(19, 127)).toEqual([176, 19, 127]);
    });

    it('should generate a CC message on other channels', () => {
      // Channel 1: 0xB1 = 177
      expect(generateCC(19, 127, 1)).toEqual([177, 19, 127]);
    });
  });

  describe('generateSysExHeader', () => {
    it('should return the correct Launchpad Mini [MK3] SysEx header', () => {
      // Header: F0h 00h 20h 29h 02h 0Dh
      expect(generateSysExHeader()).toEqual([0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D]);
    });
  });

  describe('generateProgrammerModeMsg', () => {
    it('should return the SysEx message to enter Programmer Mode', () => {
      // [Header] 0Eh 01h F7h
      const expected = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x0E, 0x01, 0xF7];
      expect(generateProgrammerModeMsg()).toEqual(expected);
    });
  });
});

describe('Launchpad Pattern Generation Logic', () => {
  describe('generateSolidFill', () => {
    it('should generate a bulk SysEx message to fill all pads with a single color index', () => {
      const msg = generateSolidFill(45); // 45 is some palette index
      expect(msg[0]).toBe(0xF0);
      expect(msg[6]).toBe(0x03); // Bulk LED command
      // Check if it contains multiple 0x00, pad_index, 45 sequences
      // For a solid fill, we expect 64 pads to be set.
      // Launchpad Mini MK3 programmer mode pads are 11-18, 21-28, ..., 81-88.
    });
  });

  describe('generateRainbowWave', () => {
    it('should generate a bulk SysEx message for a rainbow wave step', () => {
      const msg = generateRainbowWave(0);
      expect(msg[0]).toBe(0xF0);
      expect(msg[6]).toBe(0x03);
    });
  });

  describe('generateRandomSparkle', () => {
    it('should generate a bulk SysEx message with random colors', () => {
      const msg = generateRandomSparkle(5); // 5 random pads
      expect(msg[0]).toBe(0xF0);
      expect(msg[6]).toBe(0x03);
    });
  });

  describe('generateTextScroll', () => {
    it('should generate a text scroll SysEx message', () => {
      const msg = generateTextScroll('Hello', 5); // Text 'Hello', palette index 5
      expect(msg[0]).toBe(0xF0);
      expect(msg[6]).toBe(0x07); // Text scroll command
      expect(msg[msg.length - 1]).toBe(0xF7);
      // 'Hello' is 5 bytes: 0x48, 0x65, 0x6C, 0x6C, 0x6F
      expect(msg).toContain(0x48);
      expect(msg).toContain(0x6F);
      expect(msg[7]).toBe(0x00); // loop false
    });

    it('should support looping', () => {
      const msg = generateTextScroll('Hi', 5, true);
      expect(msg[7]).toBe(0x01); // loop true
    });
  });
});
