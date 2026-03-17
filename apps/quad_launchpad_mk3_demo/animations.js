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
