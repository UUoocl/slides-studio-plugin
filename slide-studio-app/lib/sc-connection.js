import { create } from './socketcluster-client.min.js';

/**
 * Shared SocketCluster Connection Helper for Slide Studio App
 */
window.scSocket = create({
    hostname: window.location.hostname,
    port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
    path: '/socketcluster/',
    authToken: { name: 'Slide-Studio-App' }
});

(async () => {
    for await (let {error} of window.scSocket.listener('error')) {
        console.error('SocketCluster Error:', error);
    }
})();

(async () => {
    for await (let event of window.scSocket.listener('connect')) {
        // Connection log removed for cleaner console
        // Explicitly update name just in case authToken wasn't used in handshake
        try {
            await window.scSocket.invoke('setInfo', { name: 'Slide-Studio-App' });
        } catch (e) {}
    }
})();
