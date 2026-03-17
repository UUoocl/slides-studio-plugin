/**
 * UVC PTZ Monitor
 * Standalone tool for controlling USB PTZ cameras via MediaStreamTrack.applyConstraints()
 */

export class UVCPTZMonitor {
    constructor() {
        this.stream = null;
        this.track = null;
        this.devices = [];
        
        this.elements = {
            video: document.getElementById('preview'),
            cameraSelect: document.getElementById('camera-select'),
            refreshBtn: document.getElementById('refresh-devices'),
            status: document.getElementById('status'),
            controlsContainer: document.getElementById('controls-container'),
            videoOverlay: document.getElementById('video-overlay')
        };

        this.init();
    }

    async init() {
        this.updateStatus('Ready');
        this.setupEventListeners();
        await this.listDevices();
    }

    setupEventListeners() {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.listDevices());
        }

        if (this.elements.cameraSelect) {
            this.elements.cameraSelect.addEventListener('change', (e) => {
                const deviceId = e.target.value;
                if (deviceId) {
                    this.connectCamera(deviceId);
                } else {
                    this.stopStream();
                }
            });
        }
    }

    async connectCamera(deviceId) {
        try {
            this.stopStream();
            this.updateStatus('Connecting...');

            const constraints = {
                video: { deviceId: { exact: deviceId } }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.track = this.stream.getVideoTracks()[0];

            if (this.elements.video) {
                this.elements.video.srcObject = this.stream;
            }

            if (this.elements.videoOverlay) {
                this.elements.videoOverlay.style.display = 'none';
            }

            this.updateStatus('Connected');
            
            this.renderPTZControls();
        } catch (err) {
            console.error('Error connecting to camera:', err);
            this.updateStatus(`Error: ${err.name}`, true);
        }
    }

    getPTZCapabilities() {
        if (!this.track || typeof this.track.getCapabilities !== 'function') {
            return {};
        }
        return this.track.getCapabilities();
    }

    renderPTZControls() {
        if (!this.elements.controlsContainer) return;

        const capabilities = this.getPTZCapabilities();
        const settings = this.track ? this.track.getSettings() : {};
        
        const ptzProps = ['pan', 'tilt', 'zoom'];
        const supportedProps = ptzProps.filter(prop => prop in capabilities);

        if (supportedProps.length === 0) {
            this.elements.controlsContainer.innerHTML = '<p class="placeholder-text">This camera does not support Pan, Tilt, or Zoom controls via the browser API.</p>';
            return;
        }

        this.elements.controlsContainer.innerHTML = '';
        supportedProps.forEach(prop => {
            const cap = capabilities[prop];
            const currentVal = settings[prop] !== undefined ? settings[prop] : cap.min;
            
            const controlDiv = document.createElement('div');
            controlDiv.className = 'ptz-control';
            controlDiv.innerHTML = `
                <div class="ptz-header">
                    <span class="ptz-label">${prop.toUpperCase()}</span>
                    <span id="val-${prop}" class="ptz-value">${currentVal}</span>
                </div>
                <input type="range" 
                    id="slider-${prop}" 
                    class="ptz-slider" 
                    min="${cap.min}" 
                    max="${cap.max}" 
                    step="${cap.step || 1}" 
                    value="${currentVal}">
            `;
            this.elements.controlsContainer.appendChild(controlDiv);
            
            // Add listener for real-time updates (Phase 3 Task 3)
            const slider = controlDiv.querySelector('input');
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById(`val-${prop}`).textContent = val;
                this.applyPTZConstraint(prop, val);
            });
        });
    }

    async applyPTZConstraint(prop, value) {
        if (!this.track) return;
        try {
            const constraints = {
                advanced: [{ [prop]: value }]
            };
            await this.track.applyConstraints(constraints);
        } catch (err) {
            console.error(`Error applying ${prop} constraint:`, err);
        }
    }

    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.elements.video) {
            this.elements.video.srcObject = null;
        }

        if (this.elements.videoOverlay) {
            this.elements.videoOverlay.style.display = 'block';
        }

        this.updateStatus('Ready');
    }

    async listDevices() {
        try {
            let allDevices = await navigator.mediaDevices.enumerateDevices();
            let videoDevices = allDevices.filter(device => device.kind === 'videoinput');

            // If labels are missing, trigger a permission prompt
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                this.updateStatus('Requesting permissions...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Stop the temporary stream
                stream.getTracks().forEach(track => track.stop());
                
                // Re-enumerate to get labels
                allDevices = await navigator.mediaDevices.enumerateDevices();
                videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            }

            this.devices = videoDevices;
            this.populateDeviceDropdown();
            this.updateStatus('Ready');
        } catch (err) {
            console.error('Error listing devices:', err);
            this.updateStatus(`Error: ${err.name}`, true);
        }
    }

    populateDeviceDropdown() {
        if (!this.elements.cameraSelect) return;

        this.elements.cameraSelect.innerHTML = '<option value="">-- Select Camera --</option>';
        this.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera (${device.deviceId.substring(0, 8)})`;
            this.elements.cameraSelect.appendChild(option);
        });
    }

    updateStatus(text, isError = false) {
        if (this.elements.status) {
            this.elements.status.textContent = text;
            this.elements.status.className = 'status-indicator' + (isError ? ' error' : ' connected');
        }
    }
}

// Initialize the app when the DOM is loaded
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new UVCPTZMonitor();
    });
}
