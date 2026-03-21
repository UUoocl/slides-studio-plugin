import { extractPathData } from './svg-parser.js';
import { loadShapes, saveShapes } from './persistence.js';
import { PathEditor } from './path-editor.js';

/**
 * Main application class for the Camera Shape Morph Editor.
 * Handles UI interactions, SVG parsing, shape persistence, and canvas management.
 */
class CameraShapeEditor {
  /**
   * Initializes the application and sets up DOM elements.
   */
  constructor() {
    this.shapes = {};
    this.currentShape = null;
    this.pathEditor = null;

    // DOM Elements
    this.elements = {
      shapeName: document.getElementById('shape-name'),
      canvasWidth: document.getElementById('canvas-width'),
      canvasHeight: document.getElementById('canvas-height'),
      svgInput: document.getElementById('svg-input'),
      fileInput: document.getElementById('file-input'),
      savedShapesList: document.getElementById('saved-shapes-list'),
      previewSvg: document.getElementById('preview-svg'),
      previewPath: document.getElementById('preview-path'),
      canvasContainer: document.getElementById('canvas-container'),
      statusMessage: document.getElementById('status-message'),
      morphDuration: document.getElementById('morph-duration'),
      morphEase: document.getElementById('morph-ease'),
      morphShapeIndex: document.getElementById('morph-shape-index'),

      // Buttons
      btnUpdateCanvas: document.getElementById('btn-update-canvas'),
      btnParseSvg: document.getElementById('btn-parse-svg'),
      btnSaveShape: document.getElementById('btn-save-shape'),
      btnLoadShape: document.getElementById('btn-load-shape'),
      btnDeleteShape: document.getElementById('btn-delete-shape'),
      btnClearCanvas: document.getElementById('btn-clear-canvas')
    };

    this.init();
  }

  /**
   * Asynchronous initialization of the application.
   * Sets up event listeners, initializes the path editor, and loads saved shapes.
   * @returns {Promise<void>}
   */
  async init() {
    this.setupEventListeners();

    // Initialize Path Editor
    this.pathEditor = new PathEditor(this.elements.previewSvg, this.elements.previewPath, (newPath) => {
      // Optional: update something when points move (e.g. textarea if we want)
    });

    await this.loadSavedShapes();
    this.updateCanvasSize();
    this.setStatus('Ready');
  }

  /**
   * Sets up all event listeners for the UI elements.
   */
  setupEventListeners() {
    this.elements.btnUpdateCanvas.addEventListener('click', () => this.updateCanvasSize());
    this.elements.btnParseSvg.addEventListener('click', () => this.handleSvgPaste());
    this.elements.btnSaveShape.addEventListener('click', () => this.handleSaveShape());
    this.elements.btnLoadShape.addEventListener('click', () => this.handleLoadSelected());
    this.elements.btnDeleteShape.addEventListener('click', () => this.handleDeleteSelected());
    this.elements.btnClearCanvas.addEventListener('click', () => this.handleClearCanvas());

    this.elements.fileInput.addEventListener('change', (e) => this.handleFileLoad(e));

    // Quick update on enter for name
    this.elements.shapeName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSaveShape();
    });
  }

  /**
   * Updates the status message displayed in the UI.
   * @param {string} msg - The message to display.
   * @param {boolean} [isError=false] - Whether the message indicates an error.
   */
  setStatus(msg, isError = false) {
    this.elements.statusMessage.textContent = msg;
    this.elements.statusMessage.style.color = isError ? 'var(--danger-color)' : 'var(--text-color)';
  }

  /**
   * Updates the canvas size and viewBox based on user input.
   */
  updateCanvasSize() {
    const w = parseInt(this.elements.canvasWidth.value) || 1920;
    const h = parseInt(this.elements.canvasHeight.value) || 1080;

    this.elements.canvasContainer.style.width = `${w}px`;
    this.elements.canvasContainer.style.height = `${h}px`;

    // Maintain aspect ratio in preview container via CSS, but set viewBox
    this.elements.previewSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    this.setStatus(`Canvas updated to ${w}x${h}`);
  }

  /**
   * Loads saved shapes from persistence.
   * @returns {Promise<void>}
   */
  async loadSavedShapes() {
    this.shapes = await loadShapes();
    this.updateShapesList();
  }

  /**
   * Updates the dropdown list of saved shapes.
   */
  updateShapesList() {
    this.elements.savedShapesList.innerHTML = '';
    Object.keys(this.shapes).sort().forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      this.elements.savedShapesList.appendChild(option);
    });
  }

  /**
   * Handles SVG code pasted into the text input.
   */
  handleSvgPaste() {
    const svgCode = this.elements.svgInput.value;
    const pathData = extractPathData(svgCode);

    if (pathData) {
      this.updatePreview(pathData);
      this.setStatus('SVG parsed successfully');
    } else {
      this.updatePreview('');
      this.setStatus('Error: No <path> found in SVG', true);
    }
  }

  /**
   * Clears the current preview and inputs.
   */
  handleClearCanvas() {
    this.updatePreview('');
    this.elements.svgInput.value = '';
    this.elements.shapeName.value = '';
    this.setStatus('Canvas cleared');
  }

  /**
   * Handles loading an SVG file through the file input.
   * @param {Event} event - The file input change event.
   */
  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      this.elements.svgInput.value = content;
      this.handleSvgPaste();
    };
    reader.readAsText(file);
  }

  /**
   * Updates the preview path and refreshes the path editor.
   * @param {string} pathData - The SVG path data string.
   */
  updatePreview(pathData) {
    this.elements.previewPath.setAttribute('d', pathData);
    if (this.pathEditor) {
      this.pathEditor.refresh();
    }
  }

  /**
   * Saves the current shape configuration to persistence.
   * @returns {Promise<void>}
   */
  async handleSaveShape() {
    const name = this.elements.shapeName.value.trim();
    const pathData = this.elements.previewPath.getAttribute('d');

    if (!name) {
      this.setStatus('Error: Shape name required', true);
      return;
    }

    if (!pathData) {
      this.setStatus('Error: No path data to save', true);
      return;
    }

    const shapeConfig = {
      name: name,
      path: pathData,
      width: parseInt(this.elements.canvasWidth.value),
      height: parseInt(this.elements.canvasHeight.value),
      duration: parseFloat(this.elements.morphDuration.value) || 1,
      ease: this.elements.morphEase.value,
      shapeIndex: this.elements.morphShapeIndex.value
    };

    this.shapes[name] = shapeConfig;
    const success = await saveShapes(this.shapes);

    if (success) {
      this.updateShapesList();
      this.setStatus(`Shape '${name}' saved successfully`);
    } else {
      this.setStatus('Error: Failed to save to server', true);
    }
  }

  /**
   * Loads a selected shape from the saved shapes list into the editor.
   */
  handleLoadSelected() {
    const name = this.elements.savedShapesList.value;
    if (!name || !this.shapes[name]) return;

    const shape = this.shapes[name];
    this.elements.shapeName.value = shape.name;
    this.elements.canvasWidth.value = shape.width || 1920;
    this.elements.canvasHeight.value = shape.height || 1080;
    this.elements.morphDuration.value = shape.duration || 1;
    this.elements.morphEase.value = shape.ease || 'power2.inOut';
    this.elements.morphShapeIndex.value = shape.shapeIndex || 'auto';
    this.elements.svgInput.value = ''; // Clear input for clarity

    this.updateCanvasSize();
    this.updatePreview(shape.path);
    this.setStatus(`Loaded '${name}'`);
  }

  /**
   * Deletes the currently selected shape from persistence.
   * @returns {Promise<void>}
   */
  async handleDeleteSelected() {
    const name = this.elements.savedShapesList.value;
    if (!name || !this.shapes[name]) return;

    if (!confirm(`Are you sure you want to delete '${name}'?`)) return;

    delete this.shapes[name];
    const success = await saveShapes(this.shapes);

    if (success) {
      this.updateShapesList();
      this.setStatus(`Deleted '${name}'`);
    } else {
      this.setStatus('Error: Failed to delete on server', true);
    }
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CameraShapeEditor();
});
