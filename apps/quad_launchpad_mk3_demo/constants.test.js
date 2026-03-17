import { describe, it, expect } from 'vitest';
import { DEVICE_CONFIG, GLOBAL_WIDTH, GLOBAL_HEIGHT } from './constants';

describe('Constants', () => {
  it('should define DEVICE_CONFIG for 4 devices', () => {
    expect(DEVICE_CONFIG['0,0']).toBeDefined();
    expect(DEVICE_CONFIG['0,1']).toBeDefined();
    expect(DEVICE_CONFIG['1,0']).toBeDefined();
    expect(DEVICE_CONFIG['1,1']).toBeDefined();
  });

  it('should define global dimensions as 16x16', () => {
    expect(GLOBAL_WIDTH).toBe(16);
    expect(GLOBAL_HEIGHT).toBe(16);
  });
});
