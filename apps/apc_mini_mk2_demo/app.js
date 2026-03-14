/**
 * AKAI APC mini mk2 Demo App
 * Main Orchestrator
 */

class APCMiniApp {
  constructor() {
    this.padMatrix = document.getElementById('pad-matrix');
    this.sceneButtons = document.getElementById('scene-buttons');
    this.trackButtons = document.getElementById('track-buttons');
    this.faderContainer = document.getElementById('fader-container');
    
    this.init();
  }

  init() {
    this.generatePads();
    this.generateSceneButtons();
    this.generateTrackButtons();
    this.generateFaders();
    this.setupEventListeners();
  }

  generatePads() {
    // 8x8 grid (Notes 0-63)
    for (let i = 0; i < 64; i++) {
      const pad = document.createElement('div');
      pad.className = 'pad';
      pad.id = `pad-${i}`;
      pad.dataset.note = i;
      this.padMatrix.appendChild(pad);
    }
  }

  generateSceneButtons() {
    // 8 Scene buttons (Notes 112-119 / 0x70-0x77)
    for (let i = 0; i < 8; i++) {
      const note = 0x70 + i;
      const btn = document.createElement('div');
      btn.className = 'btn-scene';
      btn.id = `scene-${i}`;
      btn.dataset.note = note;
      btn.innerText = `S${i+1}`;
      this.sceneButtons.appendChild(btn);
    }
  }

  generateTrackButtons() {
    // 8 Track buttons (Notes 100-107 / 0x64-0x6B)
    for (let i = 0; i < 8; i++) {
      const note = 0x64 + i;
      const btn = document.createElement('div');
      btn.className = 'btn-track';
      btn.id = `track-${i}`;
      btn.dataset.note = note;
      btn.innerText = `T${i+1}`;
      this.trackButtons.appendChild(btn);
    }
  }

  generateFaders() {
    // 9 Faders (CC 0x30-0x38)
    for (let i = 0; i < 9; i++) {
      const cc = 0x30 + i;
      const faderUnit = document.createElement('div');
      faderUnit.className = 'fader-unit';
      
      const label = i === 8 ? 'MASTER' : `${i+1}`;
      
      faderUnit.innerHTML = `
        <div class="fader-track" id="fader-track-${i}">
          <div class="fader-fill" id="fader-fill-${i}" style="height: 0%"></div>
          <div class="fader-cap" id="fader-cap-${i}" style="bottom: 0%"></div>
        </div>
        <div class="fader-label">${label}</div>
      `;
      this.faderContainer.appendChild(faderUnit);
    }
  }

  setupEventListeners() {
    // Basic UI feedback for pads
    this.padMatrix.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('pad')) {
        console.log(`Pad pressed: ${e.target.dataset.note}`);
      }
    });

    document.getElementById('btn-connect').addEventListener('click', () => {
      console.log('Connect clicked');
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new APCMiniApp();
});
