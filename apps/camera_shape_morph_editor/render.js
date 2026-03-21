import { loadShapes } from './persistence.js';
import { SyncService } from '../../slide-studio-app/lib/sync-service.js';

/**
 * Handles the rendering and morphing of camera shapes.
 * Subscribes to sync events to trigger transitions between saved shapes.
 */
class CameraShapeRender {
  /**
   * Initializes the renderer and sets up DOM elements.
   */
  constructor() {
    this.shapes = {};
    this.currentShapeName = null;

    this.elements = {
      svg: document.getElementById('svg-mask'),
      path: document.getElementById('mask-path')
    };

    this.init();
  }

  /**
   * Asynchronous initialization. Loads shapes and sets up synchronization.
   * @returns {Promise<void>}
   */
  async init() {
    await this.loadShapes();
    this.setupSync();
    console.log('Camera Shape Render Initialized');
  }

  /**
   * Loads saved shapes from persistence.
   * @returns {Promise<void>}
   */
  async loadShapes() {
    this.shapes = await loadShapes();
  }

  /**
   * Sets up synchronization using SyncService to listen for shape change events.
   */
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

    // Update viewBox to match the saved shape dimensions
    const w = shape.width || 1920;
    const h = shape.height || 1080;
    this.elements.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const currentPath = this.elements.path.getAttribute('d');

    // Ensure MorphSVG is registered
    if (typeof gsap !== 'undefined' && typeof MorphSVGPlugin !== 'undefined') {
      gsap.registerPlugin(MorphSVGPlugin);

      if (!currentPath || currentPath.trim() === "") {
        // If no current path, set it directly so we have a starting point for future morphs
        this.elements.path.setAttribute('d', shape.path);
      } else {
        gsap.to(this.elements.path, {
          duration: shape.duration || 1,
          morphSVG: {
            shape: shape.path,
            shapeIndex: shape.shapeIndex || 'auto'
          },
          ease: shape.ease || 'power2.inOut',
          overwrite: true
        });
      }
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
