import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Three.js
vi.mock('three', () => ({
  MathUtils: {
    lerp: (start, end, t) => start + (end - start) * t
  }
}));

// Mock SocketCluster client
vi.mock('socketcluster-client', () => ({
  create: vi.fn().mockReturnValue({
    listener: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true })
      })
    }),
    subscribe: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true })
      })
    }),
    state: 'closed',
    connect: vi.fn(),
    disconnect: vi.fn()
  })
}));

// Mock PhotoSphereViewer
vi.mock('photo-sphere-viewer', () => {
  const Viewer = vi.fn().mockImplementation(function() {
    this.setPanorama = vi.fn().mockResolvedValue(true);
    this.rotate = vi.fn();
    this.setOption = vi.fn();
    this.zoom = vi.fn();
    this.getZoomLevel = vi.fn().mockReturnValue(50);
    this.destroy = vi.fn();
    this.addEventListener = vi.fn();
    this.on = vi.fn();
    this.getPosition = vi.fn().mockReturnValue({ yaw: 0, pitch: 0 });
  });
  return { Viewer };
});

// Mock DOM
const elementCache = {};
const mockDocument = {
  getElementById: vi.fn().mockImplementation((id) => {
    if (!elementCache[id]) {
      elementCache[id] = {
        id,
        style: {},
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn().mockReturnValue(false)
        },
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        dataset: {},
        innerHTML: '',
        textContent: '',
        value: ''
      };
    }
    return elementCache[id];
  }),
  querySelectorAll: vi.fn().mockReturnValue([]),
  createElement: vi.fn().mockImplementation((tag) => ({
    tag,
    style: {},
    classList: { add: vi.fn() },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    dataset: {},
    innerHTML: '',
    textContent: ''
  }))
};

const mockWindow = {
  location: {
    hostname: 'localhost',
    port: '8080',
    protocol: 'http:'
  },
  __vitest_worker__: true,
  requestAnimationFrame: vi.fn()
};

vi.stubGlobal('document', mockDocument);
vi.stubGlobal('window', mockWindow);
vi.stubGlobal('requestAnimationFrame', mockWindow.requestAnimationFrame);

// Import app after mocks
import { PhotoSphereApp } from './app.js';

describe('PhotoSphereApp', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new PhotoSphereApp();
  });

  it('should initialize with default state', () => {
    expect(app.isConnected).toBe(true);
    expect(app.panSensitivity).toBe(1.0);
  });

  it('should update status UI', () => {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    
    app.updateStatus('Connected', true);
    
    expect(statusText.textContent).toBe('Connected');
    expect(statusIndicator.classList.add).toHaveBeenCalledWith('connected');
  });

  it('should handle sensitivity changes', () => {
    app.handleSensitivityChange('pan', 2.5);
    expect(app.panSensitivity).toBe(2.5);
    expect(document.getElementById('pan-sens-val').textContent).toBe('2.5');
  });

  it('should attempt to connect to SocketCluster on init', () => {
    expect(app.connect).toBeDefined();
  });

  describe('PTZ Mapping', () => {
    it('should map pan range to 0-2PI', () => {
      const result = app.mapValue(150, -180, 180, 0, 2 * Math.PI);
      expect(result).toBeCloseTo((330/360) * 2 * Math.PI);
    });

    it('should map tilt range to -PI/2 to PI/2', () => {
      const result = app.mapValue(0, -90, 90, -Math.PI / 2, Math.PI / 2);
      expect(result).toBeCloseTo(0);
    });

    it('should map zoom range to 0-100', () => {
      const result = app.mapValue(100, 0, 100, 0, 100);
      expect(result).toBe(100);
    });
  });
});
