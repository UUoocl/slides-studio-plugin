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
}
