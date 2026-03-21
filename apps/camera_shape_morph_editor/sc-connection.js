import { create } from '../lib/socketcluster-client.min.js';

/**
 * Shared SocketCluster Connection Helper for Camera Shape Morph Editor
 */
window.scSocket = create({
  hostname: window.location.hostname,
  port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
  path: '/socketcluster/',
  authToken: { name: 'Camera-Shape-Morph-Editor' }
});

(async () => {
  for await (let {error} of window.scSocket.listener('error')) {
    console.error('SocketCluster Error:', error);
  }
})();

(async () => {
  for await (let event of window.scSocket.listener('connect')) {
    try {
      await window.scSocket.invoke('setInfo', { name: 'Camera-Shape-Morph-Editor' });
    } catch (e) {}
  }
})();
