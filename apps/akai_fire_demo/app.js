const padMatrix = document.getElementById('pad-matrix');

function renderMatrix() {
  for (let row = 0; row < 4; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'matrix-row';
    for (let col = 0; col < 16; col++) {
      const pad = document.createElement('div');
      pad.className = 'pad';
      pad.id = `pad-${row}-${col}`;
      pad.dataset.row = row;
      pad.dataset.col = col;
      rowEl.appendChild(pad);
    }
    padMatrix.appendChild(rowEl);
  }
}

renderMatrix();
console.log('AKAI Fire Virtual UI Rendered');
