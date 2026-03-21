# Implementation Plan: Camera Shape Morph Editor

## Phase 1: Foundation & Setup
- [x] Task: Create application directory and basic assets (50dd467)
    - [x] Create `apps/camera_shape_morph_editor/` directory
    - [x] Create `index.html` (Editor) and `render.html` (Render) placeholders
    - [x] Create `styles.css` for basic layout
    - [x] Ensure GSAP and MorphSVG plugins are available in `apps/lib/` or equivalent
- [x] Task: Initialize SocketCluster connection (4908c95)
    - [x] Implement `sc-connection.js` integration in both pages
    - [x] Verify connection to the local Slides Studio server
- [ ] Task: Conductor - User Manual Verification 'Foundation & Setup' (Protocol in workflow.md)

## Phase 2: SVG Editor - Data Management & Basic UI
- [ ] Task: TDD - SVG Input & Parsing Logic
    - [ ] Write tests for SVG text parsing and path extraction
    - [ ] Implement `loadSvg` and `pasteSvg` functions to pass tests
- [ ] Task: TDD - Persistence Layer
    - [ ] Write tests for saving/loading shapes to `apps/slide-studio-app/camera_shapes.json` via SocketCluster `readFile`/`writeFile` invokes
    - [ ] Implement `saveShapes` and `loadShapes` functions to pass tests
- [ ] Task: Implement Editor UI - Canvas & Basic Controls
    - [ ] Build UI for setting canvas dimensions
    - [ ] Implement SVG preview area with basic styling
    - [ ] Add controls for loading/pasting and saving
- [ ] Task: Conductor - User Manual Verification 'SVG Editor - Data & UI' (Protocol in workflow.md)

## Phase 3: SVG Editor - Path Manipulation & Morph Config
- [ ] Task: TDD - Path Editing Interface
    - [ ] Write tests for path point selection and modification logic
    - [ ] Implement native SVG point manipulation (WYSIWYG)
- [ ] Task: Implement MorphSVG Configuration UI
    - [ ] Add fields for `shapeIndex`, duration, and easing
    - [ ] Update persistence logic to include these configurations
- [ ] Task: Conductor - User Manual Verification 'SVG Editor - Path & Config' (Protocol in workflow.md)

## Phase 4: Render Page - Morphing & Sync
- [ ] Task: TDD - SocketCluster Synchronization
    - [ ] Write tests for handling `slide-changed` events on the `slide-state` channel
    - [ ] Implement listener in `render.html` to identify `cameraShape` changes
- [ ] Task: TDD - Morphing Execution
    - [ ] Write tests for triggering GSAP MorphSVG with the correct parameters
    - [ ] Implement the morph transition logic in `render.html`
- [ ] Task: Conductor - User Manual Verification 'Render Page - Morphing & Sync' (Protocol in workflow.md)

## Phase 5: Studio Integration & Final Polish
- [ ] Task: TDD - Studio Shape Discovery
    - [ ] Write tests for merging OBS-provided shapes with JSON-stored shapes
    - [ ] Update `slide-studio-app/studio.html` (or its helper scripts) to fetch and merge shapes
- [ ] Task: Final UI Polish & Bug Fixes
    - [ ] Refine styles for the Editor and Render pages
    - [ ] Ensure smooth performance and handle edge cases (e.g., malformed SVG)
- [ ] Task: Conductor - User Manual Verification 'Studio Integration' (Protocol in workflow.md)
