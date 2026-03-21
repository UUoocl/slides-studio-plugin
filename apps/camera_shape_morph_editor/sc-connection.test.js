import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a trigger for the async iterator
let triggerConnect;

const mockSocket = {
  listener: vi.fn().mockImplementation((event) => {
    return {
      [Symbol.asyncIterator]: async function* () {
        if (event === 'connect') {
          await new Promise(resolve => { triggerConnect = resolve; });
          yield { id: 'test-id' };
        } else {
           // Return an iterator that never yields for error
           await new Promise(() => {});
        }
      }
    };
  }),
  invoke: vi.fn().mockResolvedValue({}),
  state: 'open'
};

vi.mock('../lib/socketcluster-client.min.js', () => ({
  create: vi.fn().mockReturnValue(mockSocket)
}));

// Mock window and location
const mockWindow = {
  location: {
    hostname: 'localhost',
    port: '8080',
    protocol: 'http:'
  },
  console: {
    error: vi.fn()
  }
};

vi.stubGlobal('window', mockWindow);
vi.stubGlobal('location', mockWindow.location);

describe('SocketCluster Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should initialize socket with correct parameters', async () => {
    await import('./sc-connection.js');
    
    const { create } = await import('../lib/socketcluster-client.min.js');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      hostname: 'localhost',
      port: '8080',
      path: '/socketcluster/',
      authToken: { name: 'Camera-Shape-Morph-Editor' }
    }));
  });

  it('should call setInfo on connect', async () => {
    await import('./sc-connection.js');
    
    // Trigger the connect event
    if (triggerConnect) triggerConnect();
    
    // Wait for the async IIFE to process
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockSocket.invoke).toHaveBeenCalledWith('setInfo', { name: 'Camera-Shape-Morph-Editor' });
  });
});
