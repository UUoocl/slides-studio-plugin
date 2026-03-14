import { describe, it, expect } from 'vitest';
import { FireOledLogic } from './oledLogic.js';

describe('FireOledLogic', () => {
  it('should initialize with a 1024-byte buffer', () => {
    const oled = new FireOledLogic();
    expect(oled.buffer.length).toBe(1024);
    expect(oled.buffer.every(b => b === 0)).toBe(true);
  });

  it('should set pixels in the correct byte and bit', () => {
    const oled = new FireOledLogic();
    
    // Top-left (0,0)
    oled.setPixel(0, 0);
    expect(oled.buffer[0]).toBe(1);

    // Band 1 (y=8), Col 0
    oled.setPixel(0, 8);
    expect(oled.buffer[128]).toBe(1);

    // Band 0 (y=7), Col 10
    oled.setPixel(10, 7);
    expect(oled.buffer[10]).toBe(128); // 1 << 7
  });

  it('should generate a valid SysEx message with header and buffer', () => {
    const oled = new FireOledLogic();
    oled.setPixel(0, 0);
    const msg = oled.createOledMessage();
    
    expect(msg[0]).toBe(0xF0);
    expect(msg[4]).toBe(0x0E); // Command ID
    expect(msg[5]).toBe(0x08); // Length MSB
    expect(msg[6]).toBe(0x00); // Length LSB
    expect(msg[11]).toBe(1); // Data start (pixel 0,0)
    expect(msg[msg.length - 1]).toBe(0xF7);
  });
});
