/**
 * Generates a MIDI Note On message.
 * @param {number} note MIDI note number (0-127).
 * @param {number} velocity MIDI velocity (0-127).
 * @param {number} channel MIDI channel (0-15, default 0).
 * @returns {number[]} MIDI message bytes.
 */
export function generateNoteOn(note, velocity, channel = 0) {
  return [0x90 + (channel & 0x0F), note & 0x7F, velocity & 0x7F];
}

/**
 * Generates a MIDI Control Change message.
 * @param {number} cc MIDI CC number (0-127).
 * @param {number} value MIDI CC value (0-127).
 * @param {number} channel MIDI channel (0-15, default 0).
 * @returns {number[]} MIDI message bytes.
 */
export function generateCC(cc, value, channel = 0) {
  return [0xB0 + (channel & 0x0F), cc & 0x7F, value & 0x7F];
}

/**
 * Returns the Launchpad Mini [MK3] SysEx header.
 * @returns {number[]} SysEx header bytes.
 */
export function generateSysExHeader() {
  return [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D];
}

/**
 * Generates the SysEx message to switch the Launchpad to Programmer Mode.
 * @returns {number[]} SysEx message bytes.
 */
export function generateProgrammerModeMsg() {
  const header = generateSysExHeader();
  return [...header, 0x0E, 0x01, 0xF7];
}
