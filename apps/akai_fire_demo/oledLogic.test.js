import { describe, it, expect } from 'vitest';
import { FireOledLogic } from './oledLogic.js';

describe('FireOledLogic - Corrected Bit Packing', () => {
  it('should initialize with a 1171-byte buffer', () => {
    const oled = new FireOledLogic();
    expect(oled.buffer.length).toBe(1171);
    expect(oled.buffer.every(b => b === 0)).toBe(true);
  });

  it('should set pixels in MIDI-safe bytes (all < 128)', () => {
    const oled = new FireOledLogic();
    // Set a bunch of pixels to ensure various bits are set
    for (let x = 0; x < 128; x++) {
      for (let y = 0; y < 64; y += 7) {
        oled.setPixel(x, y);
      }
    }
    expect(oled.buffer.every(b => b < 128)).toBe(true);
  });

  it('should generate a 1183-byte SysEx message', () => {
    const oled = new FireOledLogic();
    const msg = oled.createOledMessage();
    // 11 header bytes + 1171 data bytes + 1 F7 byte = 1183
    expect(msg.length).toBe(1183);
    expect(msg[5]).toBe(0x09); // Length MSB
    expect(msg[6]).toBe(0x17); // Length LSB
  });
});
