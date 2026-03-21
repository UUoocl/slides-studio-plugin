import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll mock the DOM for SVG parsing since we are in a node environment
const mockDOMParser = {
    parseFromString: vi.fn()
};

// Use a class for the mock because our code calls 'new DOMParser()'
class MockDOMParser {
    constructor() {
        return mockDOMParser;
    }
}

vi.stubGlobal('DOMParser', MockDOMParser);

describe('SVG Parser', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
    });

    it('should extract path data from SVG string', async () => {
        const { extractPathData } = await import('./svg-parser.js');
        
        const mockSvgDoc = {
            querySelector: vi.fn().mockReturnValue({
                getAttribute: vi.fn().mockReturnValue('M10 10 L20 20')
            })
        };
        mockDOMParser.parseFromString.mockReturnValue(mockSvgDoc);

        const svgString = '<svg><path d="M10 10 L20 20"></path></svg>';
        const pathData = extractPathData(svgString);

        expect(mockDOMParser.parseFromString).toHaveBeenCalledWith(svgString, 'image/svg+xml');
        expect(pathData).toBe('M10 10 L20 20');
    });

    it('should extract the first path if multiple are present', async () => {
        const { extractPathData } = await import('./svg-parser.js');
        
        const mockSvgDoc = {
            querySelector: vi.fn().mockReturnValue({
                getAttribute: vi.fn().mockReturnValue('M1 1 L2 2')
            })
        };
        mockDOMParser.parseFromString.mockReturnValue(mockSvgDoc);

        const svgString = '<svg><path d="M1 1 L2 2"></path><path d="M3 3 L4 4"></path></svg>';
        const pathData = extractPathData(svgString);

        expect(pathData).toBe('M1 1 L2 2');
    });

    it('should return null if no path is found', async () => {
        const { extractPathData } = await import('./svg-parser.js');
        
        const mockSvgDoc = {
            querySelector: vi.fn().mockReturnValue(null)
        };
        mockDOMParser.parseFromString.mockReturnValue(mockSvgDoc);

        const svgString = '<svg></svg>';
        const pathData = extractPathData(svgString);

        expect(pathData).toBeNull();
    });
});
