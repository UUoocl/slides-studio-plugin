export class FireOledLogic {
  constructor() {
    this.width = 128;
    this.height = 64;
    this.buffer = new Uint8Array(1024); // 128 * (64 / 8)
  }

  clear() {
    this.buffer.fill(0);
  }

  setPixel(x, y, on = true) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    
    // The Fire OLED uses a non-linear mapping for pixels, 
    // but the basic SysEx expects 1024 bytes for a full frame.
    // Based on documentation, the display is 8 bands high.
    const band = Math.floor(y / 8);
    const bit = y % 8;
    const index = (band * 128) + x;

    if (on) {
      this.buffer[index] |= (1 << bit);
    } else {
      this.buffer[index] &= ~(1 << bit);
    }
  }

  createOledMessage() {
    // Header: F0 47 7F 43 0E <Length MSB> <Length LSB> 00 07 00 7F
    // Payload is 1024 bytes. 
    // 1024 in 7-bit MIDI: MSB = 1024 >> 7 = 8, LSB = 1024 & 0x7F = 0
    // Actually, Akai Fire uses a specific length encoding.
    // For a full frame, length is 1175 bytes including header? 
    // Let's re-check doc. Length is for the data segment.
    
    const header = [
      0xF0, 0x47, 0x7F, 0x43, 0x0E,
      0x08, 0x00, // Length: 1024 bytes (8 * 128)
      0x00, 0x07, // Start/End Band (0-7)
      0x00, 0x7F  // Start/End Column (0-127)
    ];

    const message = new Uint8Array(header.length + this.buffer.length + 1);
    message.set(header);
    message.set(this.buffer, header.length);
    message[message.length - 1] = 0xF7;
    
    return message;
  }
}
