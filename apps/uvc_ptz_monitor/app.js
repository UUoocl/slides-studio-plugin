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
    }

    async listDevices() {
        try {
            // First, ensure we have permission to see labels
            // (Often enumerateDevices only shows labels after a getUserMedia call)
            // But for now we just try enumeration
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            this.devices = allDevices.filter(device => device.kind === 'videoinput');
            
            this.populateDeviceDropdown();
        } catch (err) {
            console.error('Error listing devices:', err);
            this.updateStatus('Error listing devices', true);
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
