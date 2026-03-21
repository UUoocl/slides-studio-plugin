import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Camera Shape Morph Editor - Foundation', () => {
  const appDir = path.resolve(__dirname, './');
  const requiredFiles = [
  'index.html',
  'render.html',
  'styles.css'
  ];

  it('should have all required files', () => {
  requiredFiles.forEach(file => {
    const filePath = path.join(appDir, file);
    expect(fs.existsSync(filePath)).toBe(true);
  });
  });
});
