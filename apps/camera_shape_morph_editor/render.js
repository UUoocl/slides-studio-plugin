import { loadShapes } from './persistence.js';
import { SyncService } from '../../slide-studio-app/lib/sync-service.js';

class CameraShapeRender {
    constructor() {
        this.shapes = {};
        this.currentShapeName = null;
        
        this.elements = {
            svg: document.getElementById('svg-mask'),
            path: document.getElementById('mask-path')
        };

        this.init();
    }

    async init() {
        await this.loadShapes();
        this.setupSync();
        console.log('Camera Shape Render Initialized');
    }

    async loadShapes() {
        this.shapes = await loadShapes();
    }

    setupSync() {
        SyncService.subscribeSync((data) => {
            if (data.cameraShape && data.cameraShape !== this.currentShapeName) {
                this.transitionToShape(data.cameraShape);
            }
        });
    }

    /**
     * Transitions the SVG path to a new shape using GSAP MorphSVG.
     * @param {string} shapeName - The name of the shape to morph to.
     */
    transitionToShape(shapeName) {
        const shape = this.shapes[shapeName];
        if (!shape) {
            console.warn(`Shape '${shapeName}' not found in configuration.`);
            return;
        }

        console.log(`Transitioning to shape: ${shapeName}`);
        
        // Ensure MorphSVG is registered
        if (typeof gsap !== 'undefined' && typeof MorphSVGPlugin !== 'undefined') {
            gsap.registerPlugin(MorphSVGPlugin);
            
            gsap.to(this.elements.path, {
                duration: shape.duration || 1,
                morphSVG: {
                    shape: shape.path,
                    shapeIndex: shape.shapeIndex || 'auto'
                },
                ease: shape.ease || 'power2.inOut',
                overwrite: true
            });
        } else {
            // Fallback if GSAP is not loaded (e.g. in some test environments or if scripts fail)
            this.elements.path.setAttribute('d', shape.path);
        }

        this.currentShapeName = shapeName;
    }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.renderApp = new CameraShapeRender();
});
