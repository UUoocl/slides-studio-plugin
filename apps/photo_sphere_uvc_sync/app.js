import { Viewer } from 'photo-sphere-viewer';
import * as socketClusterClient from 'socketcluster-client';
import { MathUtils } from 'three';

export class PhotoSphereApp {
  constructor() {
    this.viewer = null;
    this.socket = null;
    this.isConnected = false;
    
    // Sensitivity defaults
    this.panSensitivity = 1.0;
    this.tiltSensitivity = 1.0;
    this.zoomSensitivity = 1.0;

    // Target state for smoothing
    this.targetPan = 0;
    this.targetTilt = 0;
    this.targetZoom = 90;
    
    // Current state (smoothed)
    this.currentPan = 0;
    this.currentTilt = 0;
    this.currentZoom = 90;

    this.smoothingFactor = 0.1; // 0 to 1
    this.isViewerReady = false;

    this.initUI();
    this.initViewer();
    this.connect();
    this.startAnimationLoop();
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
        if (this.viewer) {
          this.viewer.setPanorama(e.target.value);
        }
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
      loadingImg: '', 
      navbar: [
        'autorotate',
        'zoom',
        'fullscreen',
      ],
    });

    this.viewer.addEventListener('ready', () => {
      console.log('Viewer is ready');
      this.isViewerReady = true;
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

    controls.forEach(ctrl => {
      const name = ctrl.name.toLowerCase();
      const val = ctrl['current-value'];
      const min = ctrl.min;
      const max = ctrl.max;

      if (name.includes('pan')) {
        this.targetPan = this.mapValue(val, min, max, 0, 2 * Math.PI);
      } else if (name.includes('tilt')) {
        this.targetTilt = this.mapValue(val, min, max, -Math.PI / 2, Math.PI / 2);
      } else if (name.includes('zoom')) {
        this.targetZoom = this.mapValue(val, min, max, 90, 30);
      }
    });
  }

  startAnimationLoop() {
    const loop = () => {
      if (this.viewer && this.isViewerReady) {
        // Apply sensitivity and smoothing
        const pan = this.targetPan * this.panSensitivity;
        const tilt = this.targetTilt * this.tiltSensitivity;
        const zoom = this.targetZoom * this.zoomSensitivity;

        this.currentPan = MathUtils.lerp(this.currentPan, pan, this.smoothingFactor);
        this.currentTilt = MathUtils.lerp(this.currentTilt, tilt, this.smoothingFactor);
        this.currentZoom = MathUtils.lerp(this.currentZoom, zoom, this.smoothingFactor);

        this.viewer.rotate({
          longitude: this.currentPan,
          latitude: this.currentTilt
        });
        
        // Update Zoom (FOV)
        if (Math.abs(this.currentZoom - (this.viewer.getOption('defaultZoomLvl') || 0)) > 0.01) {
          this.viewer.setOption('defaultZoomLvl', this.currentZoom);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Auto-init if not in test environment
if (typeof window !== 'undefined' && !window.__vitest_worker__) {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotoSphereApp();
  });
}
