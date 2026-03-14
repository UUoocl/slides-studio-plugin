class FireAppLogic {
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

  startSequencer() {
    this.isSequencing = true;
    this.currentStep = 0;
  }

  stopSequencer() {
    this.isSequencing = false;
  }

  tick() {
    if (!this.isSequencing) return null;
    const prevStep = (this.currentStep + 15) % 16;
    const activeStep = this.currentStep;
    this.currentStep = (this.currentStep + 1) % 16;
    return {
      clearIndices: [0, 1, 2, 3].map(row => row * 16 + prevStep),
      highlightIndices: [0, 1, 2, 3].map(row => row * 16 + activeStep)
    };
  }
}

if (typeof window !== 'undefined') window.FireAppLogic = FireAppLogic;
export { FireAppLogic };
