import {
    GRID_PADS,
    TOP_BUTTONS,
    RIGHT_BUTTONS,
    LOGO_BUTTON
} from './launchpadCore.js';

const gridContainer = document.getElementById('virtual-launchpad');

/**
 * Generates the 9x9 virtual Launchpad grid.
 */
function generateGrid() {
    gridContainer.innerHTML = '';

    // Create 9x9 grid (81 cells)
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const pad = document.createElement('div');
            pad.className = 'pad';
            
            let id = null;
            let label = '';

            if (row === 0) {
                // Top row (CC 91-98 + 99)
                if (col < 8) {
                    id = TOP_BUTTONS[col];
                    pad.classList.add('top-row', 'round');
                    label = `CC ${id}`;
                } else {
                    id = LOGO_BUTTON;
                    pad.classList.add('logo');
                    label = 'LP';
                }
            } else {
                // Main grid (Note 11-88) and Right column (CC 19-89)
                if (col < 8) {
                    const gridIndex = (row - 1) * 8 + col;
                    id = GRID_PADS[gridIndex];
                    label = id;
                } else {
                    id = RIGHT_BUTTONS[row - 1];
                    pad.classList.add('right-col', 'round');
                    label = `CC ${id}`;
                }
            }

            pad.id = `pad-${id}`;
            pad.textContent = label;
            pad.dataset.id = id;
            
            gridContainer.appendChild(pad);
        }
    }
}

// Initialize grid on load
document.addEventListener('DOMContentLoaded', () => {
    generateGrid();
});
