export function renderDiagonalWave(canvas, step) {
  // Launchpad palette has common colors: 5 (Red), 9 (Orange), 13 (Yellow), 21 (Green), 45 (Blue), 53 (Purple)
  const colors = [5, 9, 13, 21, 45, 53, 57, 61];
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // Diagonal wave is based on x + y
      const colorIndex = (x + y + step) % colors.length;
      canvas.setPixel(x, y, colors[colorIndex]);
    }
  }
}

export function renderCenterExpansion(canvas, step) {
  canvas.clear();
  const colors = [5, 9, 13, 21, 45, 53];
  const maxRadius = 12;
  const currentRadius = step % maxRadius;
  
  const cx = 7.5; // center of 16x16 is between 7 and 8
  const cy = 7.5;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      if (Math.abs(dist - currentRadius) < 1.5) {
        canvas.setPixel(x, y, colors[currentRadius % colors.length]);
      }
    }
  }
}

export function renderGlobalSparkle(canvas, step) {
  // We want to persist some sparkles or just randomize each frame
  // Sparkle: Random pixels lit up with random colors
  canvas.clear();
  const numSparkles = 15;
  for (let i = 0; i < numSparkles; i++) {
    const rx = Math.floor(Math.random() * 16);
    const ry = Math.floor(Math.random() * 16);
    const rcolor = Math.floor(Math.random() * 127) + 1; // 1-127
    canvas.setPixel(rx, ry, rcolor);
  }
}

// Minimal 3x5 font for HELLO
const font = {
  'H': [
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,0,1]
  ],
  'E': [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [1,0,0],
    [1,1,1]
  ],
  'L': [
    [1,0,0],
    [1,0,0],
    [1,0,0],
    [1,0,0],
    [1,1,1]
  ],
  'O': [
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1]
  ],
  ' ': [
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0]
  ]
};

export function renderScrollingText(canvas, step) {
  canvas.clear();
  const text = "HELLO ";
  const color = 21; // Green
  const charWidth = 4; // 3 + 1 spacing
  
  // step is essentially the scroll offset (moving left)
  const offset = step % (text.length * charWidth + 16);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const bitmap = font[char] || font[' '];
    
    // Starting X for this character
    const startX = 16 + (i * charWidth) - offset;
    
    // Draw character
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bitmap[row][col] === 1) {
          const px = startX + col;
          const py = 5 + row; // Center vertically
          if (px >= 0 && px < 16) {
            canvas.setPixel(px, py, color);
          }
        }
      }
    }
  }
}
