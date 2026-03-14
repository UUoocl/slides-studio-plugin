/**
 * APCMiniCore
 * Core logic for AKAI Professional APC mini mk2 MIDI communication.
 */
export class APCMiniCore {
  /**
   * Encodes a message for an RGB matrix pad.
   * @param {number} note - Pad note index (0-63)
   * @param {number} color - Color index from 128-color palette (0-127)
   * @param {string} behavior - 'solid', 'pulse', or 'blink'
   * @param {number|string} speed - Brightness % for solid, or frequency for pulse/blink
   * @returns {Uint8Array}
   */
  static encodePadMessage(note, color, behavior = 'solid', speed = 100) {
    let channel = 0x90; // Default Solid 10%

    if (behavior === 'solid') {
      const brightnessMap = { 10: 0x90, 25: 0x91, 50: 0x92, 65: 0x93, 75: 0x94, 90: 0x95, 100: 0x96 };
      channel = brightnessMap[speed] || 0x96;
    } else if (behavior === 'pulse') {
      const pulseMap = { '1/16': 0x97, '1/8': 0x98, '1/4': 0x99, '1/2': 0x9A };
      channel = pulseMap[speed] || 0x97;
    } else if (behavior === 'blink') {
      const blinkMap = { '1/24': 0x9B, '1/16': 0x9C, '1/8': 0x9D, '1/4': 0x9E, '1/2': 0x9F };
      channel = blinkMap[speed] || 0x9C;
    }

    return new Uint8Array([channel, note, color]);
  }

  /**
   * Encodes a message for peripheral single-color buttons.
   * @param {number} note - Button note index (0x64-0x77)
   * @param {string} state - 'off', 'on', or 'blink'
   * @returns {Uint8Array}
   */
  static encodeButtonMessage(note, state = 'on') {
    let velocity = 0x01; // Solid On
    if (state === 'off') velocity = 0x00;
    if (state === 'blink') velocity = 0x02;

    return new Uint8Array([0x90, note, velocity]);
  }

  /**
   * Encodes the Introduction Message (SysEx ID 0x60).
   * @param {number} verH - App Version High
   * @param {number} verL - App Version Low
   * @param {number} bugfix - Bugfix Level
   * @returns {Uint8Array}
   */
  static encodeIntroMessage(verH = 1, verL = 0, bugfix = 0) {
    return new Uint8Array([
      0xF0, 0x47, 0x7F, 0x4F, 0x60, 0x00, 0x04, 0x00, verH, verL, bugfix, 0xF7
    ]);
  }

  /**
   * Encodes the standard Device Enquiry message.
   * @returns {Uint8Array}
   */
  static encodeEnquiryMessage() {
    return new Uint8Array([0xF0, 0x7E, 0x00, 0x06, 0x01, 0xF7]);
  }

  /**
   * Encodes a 24-bit Custom RGB message for a range of pads.
   * @param {number} startPad - Start index (0-63)
   * @param {number} endPad - End index (0-63)
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Uint8Array}
   */
  static encodeCustomRGB(startPad, endPad, r, g, b) {
    // 8 bytes of data per range: start, end, rM, rL, gM, gL, bM, bL
    const dataLen = 8; 
    
    // Split 8-bit values into 7-bit MSB/LSB
    const rM = (r >> 7) & 0x01;
    const rL = r & 0x7F;
    const gM = (g >> 7) & 0x01;
    const gL = g & 0x7F;
    const bM = (b >> 7) & 0x01;
    const bL = b & 0x7F;

    return new Uint8Array([
      0xF0, 0x47, 0x7F, 0x4F, 0x24, 
      0x00, 0x08, // Length (8 bytes)
      startPad, endPad, rM, rL, gM, gL, bM, bL,
      0xF7
    ]);
  }
}
