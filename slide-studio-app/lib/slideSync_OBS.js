/**
 * @fileoverview OBS slide synchronization logic for Slide Studio.
 */

import {SyncService} from './sync-service.js';

let slideState = '';

// Subscribe to SyncService for unified synchronization
SyncService.subscribeSync((data) => {
  const {
    url,
    slideState: newStateStr,
    indexh,
    indexv,
    indexf,
    scene,
    slidePosition,
    cameraShape,
  } = data;

  // Handle URL change
  if (url) {
    const iframe = document.getElementById('revealIframe');
    if (iframe && iframe.src !== url && url !== 'about:blank') {
      updateIframeUrl(url);
    }
  }

  // Handle slide navigation
  if (typeof indexh !== 'undefined') {
    const slidesState = [indexh, indexv, indexf || 0];
    const iframe = document.getElementById('revealIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        method: 'slide',
        args: slidesState,
      }), '*');
    }
  } else if (newStateStr) {
    const slidesState = newStateStr.split(',').map((v) => Number(v));
    const iframe = document.getElementById('revealIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        method: 'slide',
        args: slidesState,
      }), '*');
    }
  }

  // Handle CSS layout change (scene-driven or explicit)
  if (!data.customLayoutActive) {
    let slidePosClass = slidePosition || null;
    if (!slidePosClass && scene) {
      const lowerScene = scene.toLowerCase();
      if (lowerScene.includes('slides ')) {
        const parts = scene.split(/slides /i);
        if (parts.length > 1) {
          slidePosClass = parts[1].trim().split(' ')[0];
        }
      }
    }

    if (slidePosClass) {
      setSlidePositionCSS(slidePosClass);
    }
  }

  // Handle Camera Shape (Local Sync via BroadcastChannel)
  if (cameraShape) {
    const bc = new BroadcastChannel('cameraShapes_channel');
    bc.postMessage(cameraShape);
    bc.close();
  }

  // Legacy support: Dispatch CustomEvents for internal listeners
  window.dispatchEvent(new CustomEvent('slide-changed', {
    detail: {webSocketMessage: JSON.stringify(data)},
  }));
});

/**
 * Sets the CSS class for slide positioning.
 * @param {string} className The CSS class name.
 */
function setSlidePositionCSS(className) {
  const iframe = document.getElementById('revealIframe');
  if (iframe) {
    // Clear inline styles (which may have been set by a custom layout)
    // so that CSS classes in iframe_positions.css can take effect.
    iframe.style = '';
    iframe.className = 'slide-position ' + className;
  }
}

/**
 * Broadcasts an event via SocketCluster.
 * @param {string} eventName The event name.
 * @param {Object} eventData The event data payload.
 */
async function broadcastSC(eventName, eventData) {
  if (window.scSocket && window.scSocket.state === 'open') {
    window.scSocket.transmitPublish('slides_navigation', {
      eventName,
      msgParam: eventData,
    });
  }
}

/**
 * Updates the iframe URL.
 * @param {string} url The new URL.
 */
function updateIframeUrl(url) {
  const oldIframe = document.getElementById('revealIframe');
  if (oldIframe) {
    const parent = oldIframe.parentNode;
    const newIframe = document.createElement('iframe');
    newIframe.id = 'revealIframe';
    const currentClass = oldIframe.className.includes('full-screen') ?
        'full-screen' : (oldIframe.className.includes('side-by-side') ?
        'side-by-side' : 'over-the-shoulder');
    newIframe.className = 'slide-position ' + currentClass;
    newIframe.setAttribute('allow', 'autoplay; fullscreen');
    newIframe.style.width = '100%';
    newIframe.style.height = '100%';
    newIframe.src = url;
    parent.replaceChild(newIframe, oldIframe);
  }
}

// Message from Reveal Slides iFrame API
window.addEventListener('message', async (event) => {
  try {
    const data = JSON.parse(event.data);

    if (data.namespace === 'reveal' && data.state) {
      const newState = JSON.stringify(data.state);
      if (newState !== slideState) {
        slideState = newState;
        // OBS views report their state back to Studio too
        if (window.scSocket && window.scSocket.state === 'open') {
          window.scSocket.transmitPublish('currentSlide_to_studio', {
            eventName: 'reveal-event',
            msgParam: data,
          });
        }
      }
    }
  } catch (e) { }
});
