import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock scSocket
const mockSocket = {
  invoke: vi.fn()
};

vi.stubGlobal('window', {
  scSocket: mockSocket
});

describe('Persistence Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load shapes from JSON file', async () => {
    const { loadShapes } = await import('./persistence.js');
    
    const mockShapes = {
      'circle': { path: 'M...', width: 100, height: 100 }
    };
    mockSocket.invoke.mockResolvedValue({ 
      content: JSON.stringify(mockShapes) 
    });

    const shapes = await loadShapes();

    expect(mockSocket.invoke).toHaveBeenCalledWith('readFile', { 
      path: 'apps/slide-studio-app/camera_shapes.json' 
    });
    expect(shapes).toEqual(mockShapes);
  });

  it('should return empty object if file not found or empty', async () => {
    const { loadShapes } = await import('./persistence.js');
    
    mockSocket.invoke.mockRejectedValue(new Error('File not found'));

    const shapes = await loadShapes();

    expect(shapes).toEqual({});
  });

  it('should save shapes to JSON file', async () => {
    const { saveShapes } = await import('./persistence.js');
    
    const mockShapes = {
      'rect': { path: 'M0 0 L10 0 L10 10 L0 10 Z', width: 100, height: 100 }
    };
    mockSocket.invoke.mockResolvedValue({ success: true });

    await saveShapes(mockShapes);

    expect(mockSocket.invoke).toHaveBeenCalledWith('writeFile', { 
      path: 'apps/slide-studio-app/camera_shapes.json',
      content: JSON.stringify(mockShapes, null, 2)
    });
  });
});
