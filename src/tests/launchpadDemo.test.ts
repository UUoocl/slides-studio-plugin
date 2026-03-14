import {describe, it, expect} from 'vitest';
import {
  generateNoteOn,
  generateCC,
  generateSysExHeader,
  generateProgrammerModeMsg,
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
