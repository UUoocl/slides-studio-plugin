/**
 * Launchpad Mini [MK3] Programmer Mode Pad Indices
 */
export const GRID_PADS = [
  81, 82, 83, 84, 85, 86, 87, 88,
  71, 72, 73, 74, 75, 76, 77, 78,
  61, 62, 63, 64, 65, 66, 67, 68,
  51, 52, 53, 54, 55, 56, 57, 58,
  41, 42, 43, 44, 45, 46, 47, 48,
  31, 32, 33, 34, 35, 36, 37, 38,
  21, 22, 23, 24, 25, 26, 27, 28,
  11, 12, 13, 14, 15, 16, 17, 18,
];

export const TOP_BUTTONS = [91, 92, 93, 94, 95, 96, 97, 98];
export const RIGHT_BUTTONS = [89, 79, 69, 59, 49, 39, 29, 19];
export const LOGO_BUTTON = 99;

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

/**
 * Generates a bulk SysEx message to set multiple LEDs.
 * @param {Array<{type: number, index: number, data: number[]}>} specs LED specs.
 * @returns {number[]} SysEx message bytes.
 */
export function generateBulkLEDMsg(specs) {
  const header = generateSysExHeader();
  const payload = [];
  for (const spec of specs) {
    payload.push(spec.type, spec.index, ...spec.data);
  }
  return [...header, 0x03, ...payload, 0xF7];
}

/**
 * Generates a bulk SysEx message to fill all grid pads with a single color.
 * @param {number} colorIndex Palette index (0-127).
 * @returns {number[]} SysEx message bytes.
 */
export function generateSolidFill(colorIndex) {
  const specs = GRID_PADS.map(index => ({
    type: 0x00, // Static
    index: index,
    data: [colorIndex & 0x7F],
  }));
  return generateBulkLEDMsg(specs);
}

/**
 * Generates a bulk SysEx message for a rainbow wave step.
 * @param {number} step Animation step.
 * @returns {number[]} SysEx message bytes.
 */
export function generateRainbowWave(step) {
  // Simple rainbow wave logic: row-based color shifting
  const specs = GRID_PADS.map((index, i) => {
    const row = Math.floor(i / 8);
    // Rough rainbow mapping using palette indices
    // Launchpad palette has common colors: 5 (Red), 9 (Orange), 13 (Yellow), 21 (Green), 45 (Blue), 53 (Purple)
    const colors = [5, 9, 13, 21, 45, 53, 57, 61];
    const color = colors[(row + step) % colors.length];
    return {
      type: 0x00,
      index: index,
      data: [color],
    };
  });
  return generateBulkLEDMsg(specs);
}

/**
 * Generates a bulk SysEx message with random colors for a few pads.
 * @param {number} count Number of pads to light up.
 * @returns {number[]} SysEx message bytes.
 */
export function generateRandomSparkle(count) {
  const specs = [];
  const shuffled = [...GRID_PADS].sort(() => 0.5 - Math.random());
  for (let i = 0; i < count; i++) {
    specs.push({
      type: 0x00,
      index: shuffled[i],
      data: [Math.floor(Math.random() * 127) + 1],
    });
  }
  return generateBulkLEDMsg(specs);
}

/**
 * Generates a text scroll SysEx message.
 * @param {string} text ASCII text to scroll.
 * @param {number} colorIndex Palette index (0-127).
 * @param {boolean} loop Whether to loop the text.
 * @param {number} speed Scrolling speed.
 * @returns {number[]} SysEx message bytes.
 */
export function generateTextScroll(text, colorIndex, loop = false, speed = 4) {
  const header = generateSysExHeader();
  const textBytes = Array.from(text).map(c => c.charCodeAt(0));
  return [
    ...header,
    0x07,
    loop ? 0x01 : 0x00,
    speed & 0x7F,
    0x00, // Color spec type (Palette)
    colorIndex & 0x7F,
    ...textBytes,
    0xF7,
  ];
}
