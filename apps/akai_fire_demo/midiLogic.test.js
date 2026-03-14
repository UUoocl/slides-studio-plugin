import { describe, it, expect } from 'vitest';
import { FireMidiLogic } from './midiLogic.js';

describe('FireMidiLogic', () => {
  describe('getPadNote', () => {
    it('should map Row 0 Col 0 to Note 0x36 (54)', () => {
      expect(FireMidiLogic.getPadNote(0, 0)).toBe(0x36);
    });

    it('should map Row 3 Col 15 to Note 0x75 (117)', () => {
      expect(FireMidiLogic.getPadNote(3, 15)).toBe(0x75);
    });
  });

  describe('getButtonCC', () => {
    it('should return 0x24 (36) for solo-1', () => {
      expect(FireMidiLogic.getButtonCC('solo-1')).toBe(0x24);
    });

    it('should return 0x1F (31) for pattern-up', () => {
      expect(FireMidiLogic.getButtonCC('pattern-up')).toBe(0x1F);
    });
  });

  describe('createButtonMessage', () => {
    it('should create a valid CC message for solo-1 High Green', () => {
      const cc = FireMidiLogic.getButtonCC('solo-1');
      const msg = FireMidiLogic.createButtonMessage(cc, 0x02);
      expect(msg).toEqual(new Uint8Array([0xB0, 0x24, 0x02]));
    });
  });

  describe('parseInput', () => {
    it('should parse a pad press (Row 0, Col 0)', () => {
      const data = new Uint8Array([0x90, 0x36, 127]);
      const result = FireMidiLogic.parseInput(data);
      expect(result).toEqual({
        type: 'note',
        note: 0x36,
        velocity: 127,
        isPress: true
      });
    });

    it('should parse a knob turn', () => {
      const data = new Uint8Array([0xB0, 0x10, 0x01]);
      const result = FireMidiLogic.parseInput(data);
      expect(result).toEqual({
        type: 'cc',
        cc: 0x10,
        value: 1
      });
    });
  });

  describe('createRGBMessage', () => {
    it('should create a valid SysEx message for Pad 4 Row 2 Full Blue', () => {
      // Row 2, Col 4 = index 36 (0x24)
      // SysEx: F0 47 7F 43 65 00 04 24 00 00 7F F7
      const msg = FireMidiLogic.createRGBMessage(36, 0, 0, 127);
      expect(msg).toEqual(new Uint8Array([
        0xF0, 0x47, 0x7F, 0x43, 0x65, 0x00, 0x04, 0x24, 0x00, 0x00, 0x7F, 0xF7
      ]));
    });
  });
});
