# Implementation Plan: Camera Shape Morph Editor

## Phase 1: Foundation & Setup [checkpoint: c7eec44]
- [x] Task: Create application directory and basic assets (50dd467)
    - [x] Create `apps/camera_shape_morph_editor/` directory
    - [x] Create `index.html` (Editor) and `render.html` (Render) placeholders
    - [x] Create `styles.css` for basic layout
    - [x] Ensure GSAP and MorphSVG plugins are available in `apps/lib/` or equivalent
- [x] Task: Initialize SocketCluster connection (4908c95)
    - [x] Implement `sc-connection.js` integration in both pages
    - [x] Verify connection to the local Slides Studio server
- [x] Task: Conductor - User Manual Verification 'Foundation & Setup' (Protocol in workflow.md)

## Phase 2: SVG Editor - Data Management & Basic UI [checkpoint: 702d0ae]
- [x] Task: TDD - SVG Input & Parsing Logic (7f240cf)
    - [x] Write tests for SVG text parsing and path extraction
    - [x] Implement `loadSvg` and `pasteSvg` functions to pass tests
- [x] Task: TDD - Persistence Layer (a22325b)
    - [x] Write tests for saving/loading shapes to `apps/slide-studio-app/camera_shapes.json` via SocketCluster `readFile`/`writeFile` invokes
    - [x] Implement `saveShapes` and `loadShapes` functions to pass tests
- [x] Task: Implement Editor UI - Canvas & Basic Controls (b651a0a)
    - [x] Build UI for setting canvas dimensions
    - [x] Implement SVG preview area with basic styling
    - [x] Add controls for loading/pasting and saving
- [x] Task: Conductor - User Manual Verification 'SVG Editor - Data & UI' (Protocol in workflow.md)

## Phase 3: SVG Editor - Path Manipulation & Morph Config [checkpoint: 842f31d]
- [x] Task: TDD - Path Editing Interface (a8d7c09)
    - [x] Write tests for path point selection and modification logic
    - [x] Implement native SVG point manipulation (WYSIWYG)
- [x] Task: Implement MorphSVG Configuration UI (a61d546)
    - [x] Add fields for `shapeIndex`, duration, and easing
    - [x] Update persistence logic to include these configurations
- [x] Task: Conductor - User Manual Verification 'SVG Editor - Path & Config' (Protocol in workflow.md)

## Phase 4: Render Page - Morphing & Sync [checkpoint: 9fb1994]
- [x] Task: TDD - SocketCluster Synchronization (a581e76)
    - [x] Write tests for handling `slide-changed` events on the `slide-state` channel
    - [x] Implement listener in `render.html` to identify `cameraShape` changes
- [x] Task: TDD - Morphing Execution (a47dc74)
    - [x] Write tests for triggering GSAP MorphSVG with the correct parameters
    - [x] Implement the morph transition logic in `render.html`
- [x] Task: Conductor - User Manual Verification 'Render Page - Morphing & Sync' (Protocol in workflow.md)

## Phase 5: Studio Integration & Final Polish
- [x] Task: TDD - Studio Shape Discovery (c3ad5ba)
    - [x] Write tests for merging OBS-provided shapes with JSON-stored shapes
    - [x] Update `slide-studio-app/studio.html` (or its helper scripts) to fetch and merge shapes
- [x] Task: Final UI Polish & Bug Fixes (6e4223d)
    - [x] Refine styles for the Editor and Render pages
    - [x] Ensure smooth performance and handle edge cases (e.g., malformed SVG)
- [~] Task: Conductor - User Manual Verification 'Studio Integration' (Protocol in workflow.md)
