import { DEVICE_CONFIG } from './constants.js';

export class CoordinateTransformer {
  /**
   * Transforms global (x,y) [where 0,0 is top-left, 15,15 is bottom-right]
   * into { deviceId, note }
   * @param {number} x Global X coordinate (0-15)
   * @param {number} y Global Y coordinate (0-15)
   * @returns {{ deviceId: string, note: number } | null}
   */
  static globalToLocal(x, y) {
    if (x < 0 || x > 15 || y < 0 || y > 15) return null;

    // Determine device
    const deviceX = Math.floor(x / 8);
    const deviceY = Math.floor(y / 8);
    const deviceId = `${deviceY},${deviceX}`; // format used in DEVICE_CONFIG: row,col
    
    // Check if deviceId matches our format "y,x", yes: "0,0", "0,1" -> row 0, cols 0 and 1.
    // Wait, DEVICE_CONFIG keys are "0,0" (TL), "0,1" (TR), "1,0" (BL), "1,1" (BR).

    const config = DEVICE_CONFIG[deviceId];
    if (!config) return null;

    // Local coordinates (0-7), where 0,0 is the top-left of this device's section
    let localX = x % 8;
    let localY = y % 8;

    // Apply rotation inversely because we are going from Global to Local.
    // The device physically rotated by `config.rotation`.
    // E.g., if device is rotated -90 degrees, its physical top-left is actually the bottom-left of the standard orientation.
    // Let's standardise the rotation mapping.
    // localX, localY is 0-7, top-left origin.
    // We need to map to physical device grid (0-7, top-left origin) taking rotation into account.
    
    // Center of an 8x8 grid is 3.5, 3.5.
    // Let's use standard rotation matrices on coordinates centered at 0,0.
    const cx = localX - 3.5;
    const cy = localY - 3.5;
    
    // Degrees to radians, inverted rotation (since we are mapping to the device's view)
    const rad = (-config.rotation * Math.PI) / 180;
    
    const rx = cx * Math.cos(rad) - cy * Math.sin(rad);
    const ry = cx * Math.sin(rad) + cy * Math.cos(rad);
    
    const finalX = Math.round(rx + 3.5);
    const finalY = Math.round(ry + 3.5);
    
    if (finalX < 0 || finalX > 7 || finalY < 0 || finalY > 7) return null;

    // Convert (finalX, finalY) to Launchpad note index
    // In Launchpad MK3:
    // Top row (finalY=0) is notes 81-88
    // Bottom row (finalY=7) is notes 11-18
    // Note formula: (8 - finalY) * 10 + (finalX + 1)
    
    const note = (8 - finalY) * 10 + (finalX + 1);

    return { deviceId, note };
  }
}
