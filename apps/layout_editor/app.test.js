import { describe, it, expect } from 'vitest';

// Simulating the style gathering logic from app.js
function serializeLayout(name, parent, controls) {
    if (!name) throw new Error('Layout name is required');
    
    const transform = `scale(${controls.scale}) rotate(${controls.rotate}deg) skew(${controls.skewX}deg, ${controls.skewY}deg)`;
    
    return {
        name,
        parent: {
            width: String(parent.width),
            height: String(parent.height)
        },
        styles: {
            top: formatValue(controls.top),
            left: formatValue(controls.left),
            width: formatValue(controls.width),
            height: formatValue(controls.height),
            zIndex: String(controls.zIndex),
            aspectRatio: controls.aspectRatio,
            objectFit: controls.objectFit,
            opacity: String(controls.opacity),
            borderRadius: formatValue(controls.borderRadius),
            boxShadow: controls.boxShadow,
            mixBlendMode: controls.mixBlendMode,
            transform: transform
        }
    };
}

function formatValue(val) {
    if (!val && val !== 0) return '0';
    const sVal = String(val);
    if (sVal.endsWith('%') || sVal.endsWith('px') || sVal.endsWith('em') || sVal.endsWith('rem') || sVal === 'auto') {
        return sVal;
    }
    return isNaN(Number(sVal)) ? sVal : `${sVal}px`;
}

describe('Layout Serialization', () => {
    it('should correctly serialize a complete layout object', () => {
        const name = 'Test Layout';
        const parent = { width: 1920, height: 1080 };
        const controls = {
            top: 10,
            left: '20%',
            width: 100,
            height: '50%',
            zIndex: 5,
            aspectRatio: '16/9',
            objectFit: 'cover',
            opacity: 0.8,
            borderRadius: 5,
            boxShadow: '0 4px 8px black',
            mixBlendMode: 'multiply',
            scale: 1.2,
            rotate: 45,
            skewX: 10,
            skewY: 0
        };

        const result = serializeLayout(name, parent, controls);

        expect(result.name).toBe('Test Layout');
        expect(result.parent.width).toBe('1920');
        expect(result.styles.top).toBe('10px');
        expect(result.styles.left).toBe('20%');
        expect(result.styles.width).toBe('100px');
        expect(result.styles.height).toBe('50%');
        expect(result.styles.zIndex).toBe('5');
        expect(result.styles.opacity).toBe('0.8');
        expect(result.styles.transform).toBe('scale(1.2) rotate(45deg) skew(10deg, 0deg)');
    });

    it('should throw error if name is missing', () => {
        expect(() => serializeLayout('', {}, {})).toThrow('Layout name is required');
    });

    it('should handle numeric and unit values in formatValue', () => {
        expect(formatValue(100)).toBe('100px');
        expect(formatValue('100')).toBe('100px');
        expect(formatValue('50%')).toBe('50%');
        expect(formatValue('auto')).toBe('auto');
        expect(formatValue(0)).toBe('0px');
        expect(formatValue('')).toBe('0');
    });
});
