class FireMidiLogic {
  static getButtonCC(name) {
    const mapping = {
      'solo-1': 0x24,
      'solo-2': 0x25,
      'solo-3': 0x26,
      'solo-4': 0x27,
      'pattern-up': 0x1F,
      'pattern-down': 0x20,
      'browser': 0x21,
      'grid-left': 0x22,
      'grid-right': 0x23,
    };
    return mapping[name];
  }

  static getPadNote(row, col) {
    const baseNotes = [0x36, 0x46, 0x56, 0x66];
    return baseNotes[row] + col;
  }

  static getPadFromNote(note) {
    const baseNotes = [0x36, 0x46, 0x56, 0x66];
    for (let r = 0; r < 4; r++) {
      if (note >= baseNotes[r] && note < baseNotes[r] + 16) {
        return { row: r, col: note - baseNotes[r] };
      }
    }
    return null;
  }

  static getKnobFromCC(cc) {
    const mapping = {
      0x10: 'vol',
      0x11: 'pan',
      0x12: 'filter',
      0x13: 'res',
      0x76: 'select'
    };
    return mapping[cc];
  }

  static createButtonMessage(cc, colorValue) {
    return new Uint8Array([0xB0, cc, colorValue]);
  }

  static createRGBMessage(index, r, g, b) {
    return new Uint8Array([
      0xF0, 0x47, 0x7F, 0x43, 0x65,
      0x00, 0x04,
      index, r, g, b,
      0xF7
    ]);
  }

  static parseInput(data) {
    if (data.length < 3) return null;
    const status = data[0];
    const note = data[1];
    const velocity = data[2];

    if (status === 0x90 || status === 0x80) {
      const isPress = status === 0x90 && velocity > 0;
      return { type: 'note', note, velocity, isPress };
    } else if (status === 0xB0) {
      return { type: 'cc', cc: note, value: velocity };
    }
    return null;
  }
}

// Global attachment for browser, export for Vitest
if (typeof window !== 'undefined') window.FireMidiLogic = FireMidiLogic;
if (typeof export !== 'undefined') {
  // This might still trigger errors in browser if reached
}
// Using simple export for vitest compatibility
export { FireMidiLogic };
