/**
 * Shared SocketCluster Connection Helper for Slide Studio App
 */
window.scSocket = socketClusterClient.create({
    hostname: window.location.hostname,
    port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
    path: '/socketcluster/'
});

(async () => {
    for await (let {error} of window.scSocket.listener('error')) {
        console.error('SocketCluster Error:', error);
    }
})();

(async () => {
    for await (let event of window.scSocket.listener('connect')) {
        console.warn('SocketCluster connected');
    }
})();
