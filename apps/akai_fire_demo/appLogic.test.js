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

describe('FireAppLogic - Sequencer', () => {
  it('should start at step 0', () => {
    const logic = new FireAppLogic();
    logic.startSequencer();
    expect(logic.currentStep).toBe(0);
    expect(logic.isSequencing).toBe(true);
  });

  it('should return correct indices on tick', () => {
    const logic = new FireAppLogic();
    logic.startSequencer();
    
    // Step 0 tick
    const tick0 = logic.tick();
    expect(tick0.highlightIndices).toEqual([0, 16, 32, 48]);
    expect(tick0.clearIndices).toEqual([15, 31, 47, 63]);
    expect(logic.currentStep).toBe(1);

    // Step 1 tick
    const tick1 = logic.tick();
    expect(tick1.highlightIndices).toEqual([1, 17, 33, 49]);
    expect(tick1.clearIndices).toEqual([0, 16, 32, 48]);
  });
});
