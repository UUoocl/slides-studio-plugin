import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock SocketCluster client
vi.mock('../lib/socketcluster-client.min.js', () => ({
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
vi.mock('../lib/photo-sphere-viewer.module.js', () => ({
  Viewer: vi.fn().mockImplementation(() => ({
    setPanorama: vi.fn().mockResolvedValue(true),
    rotate: vi.fn(),
    setOption: vi.fn(),
    destroy: vi.fn(),
    addEventListener: vi.fn(),
    on: vi.fn()
  }))
}));

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
    port: '8080'
  },
  __vitest_worker__: true
};

vi.stubGlobal('document', mockDocument);
vi.stubGlobal('window', mockWindow);

// Import app after mocks
// We expect PhotoSphereApp to be exported from app.js
import { PhotoSphereApp } from './app.js';

describe('PhotoSphereApp', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new PhotoSphereApp();
  });

  it('should initialize with default state', () => {
    expect(app.isConnected).toBe(false);
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
    // This will depend on how we implement init
    // For now just checking if the property exists
    expect(app.connect).toBeDefined();
  });
});
