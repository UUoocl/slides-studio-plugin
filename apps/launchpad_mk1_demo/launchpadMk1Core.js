/**
 * LaunchpadMk1Core
 * Core logic for Novation Launchpad (Original/mk1) MIDI communication.
 */
export class LaunchpadMk1Core {
  /**
   * Calculates the velocity byte for an LED color.
   * Formula: Velocity = (16 * Green) + Red + Flags
   * 
   * Brightness levels: 0 (Off), 1 (Low), 2 (Medium), 3 (Full)
   * 
   * @param {number} red - Red brightness (0-3)
   * @param {number} green - Green brightness (0-3)
   * @param {Object} options - Optional flags
   * @param {boolean} options.flashing - Whether the LED should flash
   * @param {boolean} options.doubleBuffer - Whether to use double buffering flags
   * @returns {number} The velocity byte (0-127)
   */
  static calculateColorVelocity(red, green, options = {}) {
    const r = Math.min(3, Math.max(0, Math.floor(red)));
    const g = Math.min(3, Math.max(0, Math.floor(green)));
    
    let flags = 12; // Normal flags (0x0C)
    
    if (options.flashing) {
      flags = 8; // Flashing flags (0x08)
    } else if (options.doubleBuffer) {
      flags = 0; // Double-buffering flags
    }
    
    return (16 * g) + r + flags;
  }

  /**
   * Converts X-Y coordinates to a MIDI note for the grid and scene buttons.
   * Uses the X-Y Layout formula: Key = (16 * Row) + Column
   * 
   * @param {number} row - Row index (0-7 for grid)
   * @param {number} col - Column index (0-7 for grid, 8 for scene buttons)
   * @returns {number} The MIDI note/key number
   */
  static xyToNote(row, col) {
    return (16 * row) + col;
  }

  /**
   * Converts a MIDI note back to X-Y coordinates.
   * @param {number} note - The MIDI note number
   * @returns {Object} {row, col}
   */
  static noteToXy(note) {
    const row = Math.floor(note / 16);
    const col = note % 16;
    return { row, col };
  }

  /**
   * Gets the Controller Number (CC) for a top-row button.
   * @param {number} col - Column index (0-7)
   * @returns {number} The CC number (104-111)
   */
  static getTopRowCC(col) {
    return 104 + col;
  }

  /**
   * Identifies if a MIDI message represents a pad press/release.
   * @param {Uint8Array} data - MIDI message data [status, note, velocity]
   * @returns {Object|null} Parsed message info or null
   */
  static parseMessage(data) {
    if (!data || data.length < 3) return null;

    const [status, note, velocity] = data;
    const isPress = velocity > 0;
    
    // Grid or Scene Launch (Note On on Channel 1)
    if (status === 0x90) {
      const { row, col } = this.noteToXy(note);
      return {
        type: 'pad',
        row,
        col,
        isPress,
        isTopRow: false,
        note
      };
    }
    
    // Top Row (CC on Channel 1)
    if (status === 0xB0) {
      const col = note - 104;
      if (col >= 0 && col <= 7) {
        return {
          type: 'pad',
          row: -1, // Special row index for top
          col,
          isPress,
          isTopRow: true,
          note
        };
      }
    }

    return null;
  }
}
