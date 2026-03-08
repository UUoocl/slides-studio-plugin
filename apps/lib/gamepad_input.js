import { create } from './socketcluster-client.min.js';

/**
 * Initializes a Gamepad Monitor that subscribes to multiple SocketCluster channels.
 * @param {string} containerId - The ID of the element to hold gamepad cards.
 * @param {string} statusId - The ID of the element to show connection status.
 */
export function initGamepadMonitor(containerId, statusId) {
    const urlParams = new URLSearchParams(window.location.search);
    const namesParam = urlParams.get('name');
    
    if (!namesParam) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div style="color: #ff4444; font-weight: bold; padding: 1rem; border: 1px solid #ff4444; border-radius: 8px;">Error: No gamepad "name" provided in query string.<br>Example: ?name=player1,player2</div>';
        }
        return;
    }

    const deviceNames = namesParam.split(',').map(n => n.trim());
    const initializedDevices = new Set();

    const socket = create({
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/socketcluster/'
    });

    (async () => {
        for await (let {error} of socket.listener('error')) {
            console.error('SocketCluster error:', error);
        }
    })();

    (async () => {
        for await (let event of socket.listener('connect')) {
            console.log('Connected to SocketCluster');
            const statusEl = document.getElementById(statusId);
            if (statusEl) statusEl.textContent = 'Status: Connected';
            socket.invoke('setInfo', { name: `Gamepad Monitor: ${namesParam}` });
            
            deviceNames.forEach(name => {
                if (name) subscribeToChannel(name);
            });
        }
    })();

    (async () => {
        for await (let event of socket.listener('disconnect')) {
            console.log('Disconnected from SocketCluster');
            const statusEl = document.getElementById(statusId);
            if (statusEl) statusEl.textContent = 'Status: Disconnected';
        }
    })();

    async function subscribeToChannel(deviceName) {
        const channelName = `gamepad_in_${deviceName}`;
        const channel = socket.subscribe(channelName);
        console.log('Subscribed to:', channelName);
        
        for await (let data of channel) {
            if (!initializedDevices.has(deviceName)) {
                setupUI(deviceName, data);
                initializedDevices.add(deviceName);
            }
            updateUI(deviceName, data);
        }
    }

    function setupUI(deviceName, data) {
        const gpData = document.getElementById(containerId);
        const waitingMsg = document.getElementById('waitingMsg');
        if (waitingMsg) waitingMsg.style.display = 'none';

        const d = document.createElement("div");
        d.className = "card";
        d.id = `controller-${deviceName}`;
        
        const chanInfo = document.createElement("div");
        chanInfo.className = "channel-info";
        chanInfo.textContent = `Channel: gamepad_in_${deviceName}`;
        d.appendChild(chanInfo);

        const t = document.createElement("h3");
        t.textContent = `Gamepad: ${data.id || 'Unknown'} (${deviceName})`;
        d.appendChild(t);

        const b = document.createElement("div");
        b.className = "buttons";
        for (let i = 0; i < data.buttons.length; i++) {
            const s = document.createElement("span");
            s.className = "button";
            s.textContent = i;
            b.appendChild(s);
        }
        d.appendChild(b);

        const a = document.createElement("div");
        a.className = "axes";
        for (let i = 0; i < data.axes.length; i++) {
            const ax = document.createElement("div");
            ax.className = "axis";
            ax.id = `axis-${deviceName}-${i}`;
            ax.textContent = `Axis ${i}: 0.0000`;
            a.appendChild(ax);
        }
        d.appendChild(a);

        gpData.appendChild(d);
    }

    function updateUI(deviceName, data) {
        const card = document.getElementById(`controller-${deviceName}`);
        if (!card) return;

        const buttons = card.getElementsByClassName("button");
        for (let i = 0; i < data.buttons.length; i++) {
            const b = buttons[i];
            if (!b) continue;
            
            const val = data.buttons[i];
            const pressed = typeof val === "object" ? val.pressed : val === 1.0;
            
            if (pressed) b.classList.add("pressed");
            else b.classList.remove("pressed");
        }

        for (let i = 0; i < data.axes.length; i++) {
            const axisVal = data.axes[i];
            const axisEl = document.getElementById(`axis-${deviceName}-${i}`);
            if (axisEl) axisEl.textContent = `Axis ${i}: ${axisVal.toFixed(4)}`;
        }
    }
}
