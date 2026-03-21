import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Path Editor Class', () => {
    let mockSvg, mockPath, mockHandleGroup;

    beforeEach(() => {
        vi.clearAllMocks();

        mockHandleGroup = {
            innerHTML: '',
            appendChild: vi.fn(),
            setAttribute: vi.fn()
        };

        mockPath = {
            getAttribute: vi.fn().mockReturnValue('M10 20 L30 40'),
            setAttribute: vi.fn()
        };

        mockSvg = {
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            createSVGPoint: vi.fn().mockReturnValue({
                x: 0, y: 0,
                matrixTransform: vi.fn().mockReturnValue({ x: 15, y: 25 })
            }),
            getScreenCTM: vi.fn().mockReturnValue({
                inverse: vi.fn()
            })
        };

        vi.stubGlobal('document', {
            createElementNS: vi.fn().mockImplementation((ns, tag) => {
                if (tag === 'g') return mockHandleGroup;
                return {
                    setAttribute: vi.fn(),
                    addEventListener: vi.fn(),
                    style: {}
                };
            })
        });
    });

    it('should initialize and create handle group', async () => {
        const { PathEditor } = await import('./path-editor.js');
        new PathEditor(mockSvg, mockPath);

        expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
        expect(mockSvg.appendChild).toHaveBeenCalledWith(mockHandleGroup);
    });

    it('should render handles on refresh', async () => {
        const { PathEditor } = await import('./path-editor.js');
        const editor = new PathEditor(mockSvg, mockPath);
        
        editor.refresh();

        // 2 points in path = 2 handles created
        // 1 for group + 2 for circles = 3 calls
        const circles = document.createElementNS.mock.results.filter(r => r.value !== mockHandleGroup);
        expect(circles.length).toBe(2);
        expect(mockHandleGroup.appendChild).toHaveBeenCalledTimes(2);
    });
});
