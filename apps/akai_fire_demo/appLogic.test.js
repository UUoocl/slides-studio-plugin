import { describe, it, expect } from 'vitest';
import { FireAppLogic } from './appLogic.js';

describe('FireAppLogic - Paint Mode', () => {
  it('should initialize with an empty grid and default red selected color', () => {
    const logic = new FireAppLogic();
    expect(logic.getPadColor(0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(logic.selectedColor).toEqual({ r: 127, g: 0, b: 0 });
  });

  it('should update the selected color', () => {
    const logic = new FireAppLogic();
    logic.setSelectedColor(0, 127, 0); // Green
    expect(logic.selectedColor).toEqual({ r: 0, g: 127, b: 0 });
  });

  it('should paint a pad with the selected color', () => {
    const logic = new FireAppLogic();
    logic.setSelectedColor(0, 0, 127); // Blue
    const result = logic.paintPad(10);
    
    expect(result).toEqual({ index: 10, r: 0, g: 0, b: 127 });
    expect(logic.getPadColor(10)).toEqual({ r: 0, g: 0, b: 127 });
  });
});
