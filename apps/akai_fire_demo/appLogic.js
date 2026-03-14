export class FireAppLogic {
  constructor() {
    this.grid = new Array(64).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
    this.selectedColor = { r: 127, g: 0, b: 0 }; // Default Red
  }

  setSelectedColor(r, g, b) {
    this.selectedColor = { r, g, b };
  }

  setPadColor(index, r, g, b) {
    this.grid[index] = { r, g, b };
  }

  getPadColor(index) {
    return this.grid[index];
  }

  paintPad(index) {
    const { r, g, b } = this.selectedColor;
    this.setPadColor(index, r, g, b);
    return { index, r, g, b };
  }
}
