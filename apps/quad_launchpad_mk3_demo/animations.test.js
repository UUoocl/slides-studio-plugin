import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  renderDiagonalWave, 
  renderCenterExpansion, 
  renderGlobalSparkle, 
  renderScrollingText 
} from './animations';

describe('animations', () => {
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = {
      width: 16,
      height: 16,
      setPixel: vi.fn(),
      clear: vi.fn()
    };
  });

  it('should render diagonal wave correctly', () => {
    renderDiagonalWave(mockCanvas, 0);
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(0, 0, 5);
  });

  it('should render center expansion correctly', () => {
    renderCenterExpansion(mockCanvas, 0);
    expect(mockCanvas.clear).toHaveBeenCalled();
    // Center is 7.5, 7.5. At step 0, radius is 0. 
    // Distance from (7,7) to (7.5,7.5) is sqrt(0.5) ~ 0.707. Since < 1.5, it should be set.
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(7, 7, 5);
  });

  it('should render global sparkle correctly', () => {
    renderGlobalSparkle(mockCanvas, 0);
    expect(mockCanvas.clear).toHaveBeenCalled();
    // Should call setPixel 15 times
    expect(mockCanvas.setPixel).toHaveBeenCalledTimes(15);
  });

  it('should render scrolling text correctly', () => {
    renderScrollingText(mockCanvas, 0);
    expect(mockCanvas.clear).toHaveBeenCalled();
    // Start X is 16. It should try to draw, but px >= 16 will be skipped.
    // Let's do step 16, where offset = 16, so startX = 0
    renderScrollingText(mockCanvas, 16);
    // H has a pixel at 0,0 of its local grid. py is 5+row.
    expect(mockCanvas.setPixel).toHaveBeenCalledWith(0, 5, 21);
  });
});
