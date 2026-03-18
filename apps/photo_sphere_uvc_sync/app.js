import { Viewer } from 'photo-sphere-viewer';
import * as socketClusterClient from 'socketcluster-client';

export class PhotoSphereApp {
  constructor() {
    this.viewer = null;
    this.socket = null;
    this.isConnected = false;
    
    // Sensitivity defaults
    this.panSensitivity = 1.0;
    this.tiltSensitivity = 1.0;
    this.zoomSensitivity = 1.0;

    this.initUI();
    this.initViewer();
    this.connect();
  }

  initUI() {
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.uvcDebug = document.getElementById('uvc-debug');
    
    // Sensitivity controls
    ['pan', 'tilt', 'zoom'].forEach(type => {
      const slider = document.getElementById(`${type}-sens`);
      const display = document.getElementById(`${type}-sens-val`);
      
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.handleSensitivityChange(type, parseFloat(e.target.value));
        });
      }
    });

    // Image select
    const imageSelect = document.getElementById('image-select');
    if (imageSelect) {
      imageSelect.addEventListener('change', (e) => {
        this.viewer.setPanorama(e.target.value);
      });
    }

    // Reconnect button
    const btnReconnect = document.getElementById('btn-reconnect');
    if (btnReconnect) {
      btnReconnect.addEventListener('click', () => {
        this.connect();
      });
    }
  }

  initViewer() {
    const container = document.getElementById('viewer-container');
    if (!container) return;

    this.viewer = new Viewer({
      container: container,
      panorama: '../assets/sample_360.jpg',
      loadingImg: '', // No loading image needed for now
      navbar: [
        'autorotate',
        'zoom',
        'fullscreen',
      ],
    });
  }

  handleSensitivityChange(type, value) {
    this[`${type}Sensitivity`] = value;
    const display = document.getElementById(`${type}-sens-val`);
    if (display) {
      display.textContent = value.toFixed(1);
    }
  }

  updateStatus(text, connected) {
    this.isConnected = connected;
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusIndicator) {
      if (connected) {
        this.statusIndicator.classList.add('connected');
      } else {
        this.statusIndicator.classList.remove('connected');
      }
    }
  }

  async connect() {
    this.updateStatus('Connecting...', false);
    
    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      const hostname = window.location.hostname || 'localhost';
      const port = window.location.port || '8080';
      
      this.socket = socketClusterClient.create({
        hostname: hostname,
        port: parseInt(port),
        path: '/socketcluster/',
        secure: window.location.protocol === 'https:',
        autoReconnect: true
      });

      this.updateStatus('Connected to Bridge', true);
      this.listenToUVC();
      
      // Handle connection events
      (async () => {
        for await (let { error } of this.socket.listener('error')) {
          console.error('Socket error:', error);
          this.updateStatus('Connection Error', false);
        }
      })();

      (async () => {
        for await (let event of this.socket.listener('connect')) {
          this.updateStatus('Connected to Bridge', true);
        }
      })();

      (async () => {
        for await (let event of this.socket.listener('disconnect')) {
          this.updateStatus('Disconnected from Bridge', false);
        }
      })();

    } catch (err) {
      console.error('Connection failed:', err);
      this.updateStatus('Connection Failed', false);
    }
  }

  async listenToUVC() {
    if (!this.socket) return;
    
    const channel = this.socket.subscribe('uvcResponse');
    
    (async () => {
      for await (let data of channel) {
        this.handleUVCData(data);
      }
    })();
  }

  mapValue(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  handleUVCData(data) {
    if (this.uvcDebug) {
      this.uvcDebug.textContent = JSON.stringify(data, null, 2);
    }
    
    if (data.action === 'poll' && Array.isArray(data.data)) {
      this.syncViewer(data.data);
    }
  }

  syncViewer(controls) {
    if (!this.viewer) return;

    let pan = null;
    let tilt = null;
    let zoom = null;

    controls.forEach(ctrl => {
      const name = ctrl.name.toLowerCase();
      const val = ctrl['current-value'];
      const min = ctrl.min;
      const max = ctrl.max;

      if (name.includes('pan')) {
        pan = this.mapValue(val, min, max, 0, 2 * Math.PI) * this.panSensitivity;
      } else if (name.includes('tilt')) {
        tilt = this.mapValue(val, min, max, -Math.PI / 2, Math.PI / 2) * this.tiltSensitivity;
      } else if (name.includes('zoom')) {
        // Zoom mapping: min zoom -> 90 FOV, max zoom -> 30 FOV
        zoom = this.mapValue(val, min, max, 90, 30) * this.zoomSensitivity;
      }
    });

    if (pan !== null || tilt !== null) {
      this.viewer.rotate({
        longitude: pan !== null ? pan : this.viewer.getPosition().longitude,
        latitude: tilt !== null ? tilt : this.viewer.getPosition().latitude
      });
    }

    if (zoom !== null) {
      this.viewer.setOption('defaultZoomLvl', zoom); // Or use zoom method if available
      // PhotoSphereViewer 5 uses setOption for FOV or zoom methods
      // Actually FOV is what we want.
    }
  }
}

// Auto-init if not in test environment
if (typeof window !== 'undefined' && !window.__vitest_worker__) {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotoSphereApp();
  });
}
