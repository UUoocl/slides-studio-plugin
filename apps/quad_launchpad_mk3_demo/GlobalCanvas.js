import { CoordinateTransformer } from './CoordinateTransformer.js';
import { generateBulkLEDMsg } from '../launchpad_mk3_demo/launchpadCore.js';

export class GlobalCanvas {
  /**
   * @param {QuadLaunchpadManager} manager 
   */
  constructor(manager) {
    this.manager = manager;
    this.width = 16;
    this.height = 16;
    // Store palette colors for 16x16
    this.pixels = new Array(this.width * this.height).fill(0);
  }

  setPixel(x, y, colorIndex) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.pixels[y * this.width + x] = colorIndex;
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.pixels[y * this.width + x];
  }

  clear() {
    this.pixels.fill(0);
  }

  render() {
    // Group updates by deviceId
    const deviceUpdates = {};

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.pixels[y * this.width + x];
        
        // We can optimize by only sending non-zero colors or sending all if we want to overwrite.
        // For animations, we usually want to send the full frame or just changed pixels. 
        // Let's send everything since it's an animation frame, or keep track of dirty pixels.
        // For simplicity and to match the demo's style, we build a bulk update per device.
        
        const mapping = CoordinateTransformer.globalToLocal(x, y);
        if (mapping) {
          if (!deviceUpdates[mapping.deviceId]) {
            deviceUpdates[mapping.deviceId] = [];
          }
          deviceUpdates[mapping.deviceId].push({
            type: 0x00, // Static color
            index: mapping.note,
            data: [color]
          });
        }
      }
    }

    // Dispatch to each device
    for (const [deviceId, specs] of Object.entries(deviceUpdates)) {
      const msg = generateBulkLEDMsg(specs);
      this.manager.sendToDevice(deviceId, { type: 'sysex', data: msg });
    }
  }
}
