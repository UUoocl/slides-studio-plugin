/**
 * Path Editor Logic for Camera Shape Morph Editor
 */

/**
 * Parses SVG path data string into an array of point objects.
 * Handles M, L, and C (cubic bezier) commands.
 * @param {string} pathData - The 'd' attribute of an SVG path.
 * @returns {Array} An array of point objects {x, y, type, isControl}.
 */
export function parsePathPoints(pathData) {
  if (!pathData) return [];

  const points = [];
  const commands = pathData.match(/[a-df-z][^a-df-z]*/ig);

  if (!commands) return [];

  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

    if (type === 'M' || type === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        points.push({ x: args[i], y: args[i+1], type: type });
      }
    } else if (type === 'C') {
      // C x1 y1, x2 y2, x y
      for (let i = 0; i < args.length; i += 6) {
        points.push({ x: args[i], y: args[i+1], type: 'C', isControl: true });
        points.push({ x: args[i+2], y: args[i+3], type: 'C', isControl: true });
        points.push({ x: args[i+4], y: args[i+5], type: 'C', isControl: false });
      }
    }
    // Add more command types as needed
  });

  return points;
}

/**
 * Converts an array of point objects back into an SVG path data string.
 * @param {Array} points - Array of point objects.
 * @returns {string} The formatted path data string.
 */
export function stringifyPathPoints(points) {
  let pathData = '';
  let i = 0;

  while (i < points.length) {
    const point = points[i];
    if (point.type === 'M' || point.type === 'L') {
      pathData += `${point.type}${point.x} ${point.y} `;
      i++;
    } else if (point.type === 'C') {
      const p1 = points[i];
      const p2 = points[i+1];
      const p3 = points[i+2];
      pathData += `C${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y} `;
      i += 3;
    } else {
      i++;
    }
  }

  return pathData.trim();
}

/**
 * Handles the visual editing of SVG path points using draggable handles.
 */
export class PathEditor {
  /**
   * @param {SVGElement} svgElement - The SVG element containing the path.
   * @param {SVGPathElement} pathElement - The path element to edit.
   * @param {Function} onChange - Callback triggered when a point is moved.
   */
  constructor(svgElement, pathElement, onChange) {
    this.svg = svgElement;
    this.path = pathElement;
    this.onChange = onChange;
    this.points = [];
    this.handles = [];
    this.handleGroup = null;
    this.selectedHandle = null;

    this.init();
  }

  init() {
    // Create a group for handles if it doesn't exist
    this.handleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.handleGroup.setAttribute('id', 'path-handles');
    this.svg.appendChild(this.handleGroup);

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.svg.addEventListener('mouseup', () => this.handleMouseUp());
    this.svg.addEventListener('mouseleave', () => this.handleMouseUp());
  }

  /**
   * Clears existing handles and creates new ones from path data.
   */
  refresh() {
    this.clearHandles();
    const pathData = this.path.getAttribute('d');
    if (!pathData) return;

    this.points = parsePathPoints(pathData);
    this.renderHandles();
  }

  clearHandles() {
    if (this.handleGroup) {
      this.handleGroup.innerHTML = '';
    }
    this.handles = [];
  }

  renderHandles() {
    this.points.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', point.isControl ? '4' : '6');
      circle.setAttribute('fill', point.isControl ? '#ff9800' : '#007acc');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '1');
      circle.style.cursor = 'move';
      
      circle.addEventListener('mousedown', (e) => this.handleMouseDown(e, index));
      
      this.handleGroup.appendChild(circle);
      this.handles.push(circle);
    });
  }

  handleMouseDown(e, index) {
    e.preventDefault();
    e.stopPropagation();
    this.selectedHandle = { index, element: this.handles[index] };
  }

  handleMouseMove(e) {
    if (!this.selectedHandle) return;

    const point = this.getSVGCoordinates(e);
    const index = this.selectedHandle.index;
    
    // Update our point data
    this.points[index].x = Math.round(point.x);
    this.points[index].y = Math.round(point.y);

    // Update handle visual
    this.selectedHandle.element.setAttribute('cx', this.points[index].x);
    this.selectedHandle.element.setAttribute('cy', this.points[index].y);

    // Update path data
    const newPathData = stringifyPathPoints(this.points);
    this.path.setAttribute('d', newPathData);

    if (this.onChange) {
      this.onChange(newPathData);
    }
  }

  handleMouseUp() {
    this.selectedHandle = null;
  }

  getSVGCoordinates(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    return { x: svgP.x, y: svgP.y };
  }
}
