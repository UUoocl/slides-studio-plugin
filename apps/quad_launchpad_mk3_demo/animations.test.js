import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderDiagonalWave } from './animations';

describe('animations', () => {
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = {
      width: 16,
      height: 16,
      setPixel: vi.fn()
    };
  });

  it('should render diagonal wave correctly', () => {
    renderDiagonalWave(mockCanvas, 0);
    // x=0, y=0, step=0 => index 0 => color 5
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(0, 0, 5);
    // x=1, y=0, step=0 => index 1 => color 9
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(1, 0, 9);
    // x=0, y=1, step=0 => index 1 => color 9
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(0, 1, 9);

    vi.clearAllMocks();

    renderDiagonalWave(mockCanvas, 1);
    // x=0, y=0, step=1 => index 1 => color 9
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(0, 0, 9);
  });
});
