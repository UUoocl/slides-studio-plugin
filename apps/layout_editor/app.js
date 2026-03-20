/**
 * @fileoverview Main application logic for the Custom CSS Layout Editor.
 */

import '../../slide-studio-app/lib/sc-connection.js';

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const controls = {
    layoutName: document.getElementById('layout-name'),
    parentWidth: document.getElementById('parent-width'),
    parentHeight: document.getElementById('parent-height'),
    top: document.getElementById('top'),
    left: document.getElementById('left'),
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    zIndex: document.getElementById('z-index'),
    aspectRatio: document.getElementById('aspect-ratio'),
    objectFit: document.getElementById('object-fit'),
    opacity: document.getElementById('opacity'),
    borderRadius: document.getElementById('border-radius'),
    boxShadow: document.getElementById('box-shadow'),
    mixBlendMode: document.getElementById('mix-blend-mode'),
    scale: document.getElementById('scale'),
    rotate: document.getElementById('rotate'),
    skewX: document.getElementById('skewX'),
    skewY: document.getElementById('skewY'),
  };

  const valueDisplays = {
    opacity: document.getElementById('opacity-val'),
    scale: document.getElementById('scale-val'),
    rotate: document.getElementById('rotate-val'),
    skewX: document.getElementById('skewX-val'),
    skewY: document.getElementById('skewY-val'),
  };

  const preview = {
    main: document.getElementById('preview'),
    parent: document.getElementById('parent-preview'),
    iframe: document.getElementById('iframe-preview'),
  };

  const saveBtn = document.getElementById('save-layout');
  const statusMsg = document.getElementById('status-message');
  const layoutList = document.getElementById('layout-list');

  // Constants
  const LAYOUT_FILE = 'apps/slide-studio-app/layouts.json';

  // State
  let isDragging = false;
  let isResizing = false;
  let startX;
  let startY;
  let startLeft;
  let startTop;
  let startWidth;
  let startHeight;
  let allLayouts = {};

  /**
   * Initializes the application.
   */
  async function init() {
    updateParentPreview();
    updateIframePreview();
    setupEventListeners();

    // Wait for socket to connect before loading
    if (window.scSocket.state === 'open') {
      loadLayouts();
    } else {
      for await (const event of window.scSocket.listener('connect')) {
        loadLayouts();
        break;
      }
    }
  }

  /**
   * Sets up all UI event listeners.
   */
  function setupEventListeners() {
    // Input changes
    Object.keys(controls).forEach((key) => {
      controls[key].addEventListener('input', () => {
        if (valueDisplays[key]) {
          valueDisplays[key].textContent = controls[key].value;
        }

        if (key === 'parentWidth' || key === 'parentHeight') {
          updateParentPreview();
        } else {
          updateIframePreview();
        }
      });
    });

    // Window resize
    window.addEventListener('resize', updateParentPreview);

    // Dragging
    preview.iframe.addEventListener('mousedown', startDrag);

    // Resizing
    const resizer = document.getElementById('resizer-se');
    resizer.addEventListener('mousedown', startResize);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopActions);

    // Save
    saveBtn.addEventListener('click', saveLayout);
  }

  /**
   * Updates the parent preview container based on controlled dimensions.
   */
  function updateParentPreview() {
    const w = parseInt(controls.parentWidth.value) || 1920;
    const h = parseInt(controls.parentHeight.value) || 1080;

    // Scale to fit the 'main#preview' element
    // Subtract some padding (e.g. 40px) to prevent it from touching edges
    const maxW = preview.main.clientWidth - 40;
    const maxH = preview.main.clientHeight - 40;
    const scale = Math.min(maxW / w, maxH / h);

    preview.parent.style.width = `${w}px`;
    preview.parent.style.height = `${h}px`;
    preview.parent.style.transform = `scale(${scale})`;
  }

  /**
   * Updates the iframe preview styles.
   */
  function updateIframePreview() {
    const styles = getStylesFromControls();
    Object.assign(preview.iframe.style, styles);
  }

  /**
   * Collects CSS styles from UI controls.
   * @return {Object} CSS styles object.
   */
  function getStylesFromControls() {
    const transform = `scale(${controls.scale.value}) ` +
        `rotate(${controls.rotate.value}deg) ` +
        `skew(${controls.skewX.value}deg, ${controls.skewY.value}deg)`;

    return {
      top: formatValue(controls.top.value),
      left: formatValue(controls.left.value),
      width: formatValue(controls.width.value),
      height: formatValue(controls.height.value),
      zIndex: controls.zIndex.value,
      aspectRatio: controls.aspectRatio.value,
      objectFit: controls.objectFit.value,
      opacity: controls.opacity.value,
      borderRadius: formatValue(controls.borderRadius.value),
      boxShadow: controls.boxShadow.value,
      mixBlendMode: controls.mixBlendMode.value,
      transform: transform,
    };
  }

  /**
   * Formats a raw value into a CSS compatible string.
   * @param {string|number} val Raw value.
   * @return {string} Formatted CSS value.
   */
  function formatValue(val) {
    if (!val && val !== 0) return '0';
    const sVal = String(val);
    const units = ['%', 'px', 'em', 'rem'];
    if (units.some((u) => sVal.endsWith(u)) || sVal === 'auto') {
      return sVal;
    }
    return isNaN(Number(sVal)) ? sVal : `${sVal}px`;
  }

  /**
   * Parses a CSS value back to a numeric string.
   * @param {string} val CSS value string.
   * @return {string} Numeric string.
   */
  function parseValue(val) {
    if (!val) return '0';
    const sVal = String(val);
    return sVal.replace('px', '');
  }

  /**
   * Handles start of drag interaction.
   * @param {MouseEvent} e Mouse event.
   */
  function startDrag(e) {
    if (e.target.classList.contains('resizer')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(preview.iframe.offsetLeft);
    startTop = parseInt(preview.iframe.offsetTop);
    e.preventDefault();
  }

  /**
   * Handles start of resize interaction.
   * @param {MouseEvent} e Mouse event.
   */
  function startResize(e) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(preview.iframe.offsetWidth);
    startHeight = parseInt(preview.iframe.offsetHeight);
    e.stopPropagation();
    e.preventDefault();
  }

  /**
   * Handles mouse move for both dragging and resizing.
   * @param {MouseEvent} e Mouse event.
   */
  function handleMove(e) {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Adjust for preview scaling
      const rect = preview.parent.getBoundingClientRect();
      const scale = rect.width / parseInt(preview.parent.style.width);

      const newLeft = startLeft + (dx / scale);
      const newTop = startTop + (dy / scale);

      controls.left.value = Math.round(newLeft);
      controls.top.value = Math.round(newTop);
      updateIframePreview();
    } else if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const rect = preview.parent.getBoundingClientRect();
      const scale = rect.width / parseInt(preview.parent.style.width);

      const newWidth = startWidth + (dx / scale);
      const newHeight = startHeight + (dy / scale);

      controls.width.value = Math.round(newWidth);
      controls.height.value = Math.round(newHeight);
      updateIframePreview();
    }
  }

  /**
   * Stops any ongoing actions.
   */
  function stopActions() {
    isDragging = false;
    isResizing = false;
  }

  /**
   * Loads saved layouts from the vault.
   */
  async function loadLayouts() {
    try {
      // Using SocketCluster invoke to read file via plugin
      const result = await window.scSocket.invoke('readFile', {
        path: LAYOUT_FILE,
      });
      if (result && result.content) {
        allLayouts = JSON.parse(result.content);
        updateLayoutList();
      }
    } catch (e) {
      console.log('No existing layouts found or error loading:', e);
      allLayouts = {};
    }
  }

  /**
   * Updates the layout list UI.
   */
  function updateLayoutList() {
    layoutList.innerHTML = '';
    Object.keys(allLayouts).forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.addEventListener('click', () => applyLayout(name));
      layoutList.appendChild(li);
    });
  }

  /**
   * Applies a specific layout to the editor.
   * @param {string} name Layout name.
   */
  function applyLayout(name) {
    const layout = allLayouts[name];
    if (!layout) return;

    controls.layoutName.value = name;
    controls.parentWidth.value = layout.parent.width;
    controls.parentHeight.value = layout.parent.height;

    const s = layout.styles;
    controls.top.value = parseValue(s.top);
    controls.left.value = parseValue(s.left);
    controls.width.value = parseValue(s.width);
    controls.height.value = parseValue(s.height);
    controls.zIndex.value = s.zIndex;
    controls.aspectRatio.value = s.aspectRatio;
    controls.objectFit.value = s.objectFit;
    controls.opacity.value = s.opacity;
    controls.borderRadius.value = parseValue(s.borderRadius);
    controls.boxShadow.value = s.boxShadow;
    controls.mixBlendMode.value = s.mixBlendMode;

    // Parse transform: scale(1) rotate(0deg) skew(0deg, 0deg)
    const transform = s.transform || '';
    const scaleMatch = transform.match(/scale\((.*?)\)/);
    const rotateMatch = transform.match(/rotate\((.*?)deg\)/);
    const skewMatch = transform.match(/skew\((.*?)deg,\s*(.*?)deg\)/);

    if (scaleMatch) controls.scale.value = scaleMatch[1];
    if (rotateMatch) controls.rotate.value = rotateMatch[1];
    if (skewMatch) {
      controls.skewX.value = skewMatch[1];
      controls.skewY.value = skewMatch[2];
    }

    // Update value displays
    Object.keys(valueDisplays).forEach((key) => {
      valueDisplays[key].textContent = controls[key].value;
    });

    updateParentPreview();
    updateIframePreview();
    showStatus(`Layout "${name}" loaded`, 'success');
  }

  /**
   * Saves the current layout to the vault.
   */
  async function saveLayout() {
    const layoutName = controls.layoutName.value.trim();
    if (!layoutName) {
      showStatus('Please enter a layout name', 'error');
      return;
    }

    const layoutData = {
      parent: {
        width: controls.parentWidth.value,
        height: controls.parentHeight.value,
      },
      styles: getStylesFromControls(),
    };

    allLayouts[layoutName] = layoutData;

    try {
      await window.scSocket.invoke('writeFile', {
        path: LAYOUT_FILE,
        content: JSON.stringify(allLayouts, null, 2),
      });
      showStatus(`Layout "${layoutName}" saved successfully!`, 'success');
      updateLayoutList();
    } catch (e) {
      console.error('Save failed:', e);
      showStatus(`Save failed: ${e.message}`, 'error');
    }
  }

  /**
   * Shows a status message in the UI.
   * @param {string} msg Message to show.
   * @param {string} type 'success' or 'error'.
   */
  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = type;
    setTimeout(() => {
      statusMsg.className = '';
    }, 3000);
  }

  init();
});
