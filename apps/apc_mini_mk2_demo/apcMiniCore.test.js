import { describe, it, expect } from 'vitest';
import { APCMiniCore } from './apcMiniCore.js';

describe('APCMiniCore - Standard LED Behaviors', () => {
  describe('encodePadMessage', () => {
    it('should encode a Solid Red (100%) message for Pad 0', () => {
      // Channel 0x96 (Solid 100%), Note 0x00, Color 0x05 (Red)
      const result = APCMiniCore.encodePadMessage(0, 5, 'solid', 100);
      expect(result).toEqual(new Uint8Array([0x96, 0x00, 0x05]));
    });

    it('should encode a Pulsing Green (1/16) message for Pad 10', () => {
      // Channel 0x97 (Pulse 1/16), Note 0x0A, Color 0x15 (Green)
      const result = APCMiniCore.encodePadMessage(10, 21, 'pulse', '1/16');
      expect(result).toEqual(new Uint8Array([0x97, 0x0A, 0x15]));
    });

    it('should encode a Blinking Blue (1/2) message for Pad 63', () => {
      // Channel 0x9F (Blink 1/2), Note 0x3F, Color 45 (Blue)
      const result = APCMiniCore.encodePadMessage(63, 45, 'blink', '1/2');
      expect(result).toEqual(new Uint8Array([0x9F, 0x3F, 45]));
    });
  });

  describe('encodeButtonMessage', () => {
    it('should encode a Solid On message for Track Button 1', () => {
      // Channel 0x90, Note 0x64, Velocity 0x01
      const result = APCMiniCore.encodeButtonMessage(0x64, 'on');
      expect(result).toEqual(new Uint8Array([0x90, 0x64, 0x01]));
    });

    it('should encode a Blinking message for Scene Button 1', () => {
      // Channel 0x90, Note 0x70, Velocity 0x02
      const result = APCMiniCore.encodeButtonMessage(0x70, 'blink');
      expect(result).toEqual(new Uint8Array([0x90, 0x70, 0x02]));
    });
  });

  describe('SysEx Messages', () => {
    it('should encode the Introduction Message (ID 0x60)', () => {
      // F0 47 7F 4F 60 00 04 00 <VerH> <VerL> <Bug> F7
      const result = APCMiniCore.encodeIntroMessage(1, 0, 0);
      expect(result).toEqual(new Uint8Array([
        0xF0, 0x47, 0x7F, 0x4F, 0x60, 0x00, 0x04, 0x00, 0x01, 0x00, 0x00, 0xF7
      ]));
    });

    it('should encode the Device Enquiry Message', () => {
      // F0 7E 00 06 01 F7
      const result = APCMiniCore.encodeEnquiryMessage();
      expect(result).toEqual(new Uint8Array([
        0xF0, 0x7E, 0x00, 0x06, 0x01, 0xF7
      ]));
    });

    it('should encode Custom RGB SysEx for Pad 0-0 Blue (0,0,255)', () => {
      // F0 47 7F 4F 24 <lenH> <lenL> <start> <end> <rM> <rL> <gM> <gL> <bM> <bL> F7
      // Blue 255: MSB=1 (0x01), LSB=127 (0x7F) -> 1*128 + 127 = 255
      const result = APCMiniCore.encodeCustomRGB(0, 0, 0, 0, 255);
      expect(result).toEqual(new Uint8Array([
        0xF0, 0x47, 0x7F, 0x4F, 0x24, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x7F, 0xF7
      ]));
    });
  });
});
