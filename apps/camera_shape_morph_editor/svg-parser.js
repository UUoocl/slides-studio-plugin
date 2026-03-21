/**
 * SVG Parser for Camera Shape Morph Editor
 */

/**
 * Extracts path data (the 'd' attribute) from an SVG string.
 * @param {string} svgString - The raw SVG string.
 * @returns {string|null} The path data, or null if no path is found.
 */
export function extractPathData(svgString) {
    if (!svgString) return null;
    
    try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        const path = svgDoc.querySelector('path');
        
        if (path) {
            return path.getAttribute('d');
        }
    } catch (error) {
        console.error('Error parsing SVG:', error);
    }
    
    return null;
}
