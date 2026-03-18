# Implementation Plan: Photo Sphere Viewer UVC Sync

## Phase 1: Project Setup and Asset Preparation [checkpoint: 4051e6d]
- [x] Task: Create the application directory at `apps/photo_sphere_uvc_sync/`. 6011f37
- [x] Task: Research and download required `photo-sphere-viewer` and `three.js` ESM files into `apps/lib/`. 88589de
- [x] Task: Add a sample equirectangular image to `apps/assets/`. cca12ff
- [x] Task: Conductor - User Manual Verification 'Phase 1: Project Setup and Asset Preparation' (Protocol in workflow.md) 4051e6d

## Phase 2: Core Viewer and SocketCluster Integration
- [ ] Task: Create base `index.html` and `styles.css` with the standard Slides Studio technical aesthetic.
- [ ] Task: Write failing tests for SocketCluster connection and message handling in `apps/photo_sphere_uvc_sync/app.test.js`.
- [ ] Task: Implement `app.js` to initialize the `PhotoSphereViewer` and establish a SocketCluster connection.
- [ ] Task: Verify that the viewer renders the sample image correctly and reports its connection status.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Viewer and SocketCluster Integration' (Protocol in workflow.md)

## Phase 3: UVC Mapping and Animation Logic
- [ ] Task: Define the data structure for UVC PTZ messages and the mapping ranges (min/max).
- [ ] Task: Write failing tests for PTZ mapping functions (input values -> viewer orientation/FOV).
- [ ] Task: Implement the `uvcResponse` channel subscription and the mapping logic in `app.js`.
- [ ] Task: Implement a smoothing/interpolation layer (e.g., using Three.js `lerp`) to handle incoming data stream updates.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UVC Mapping and Animation Logic' (Protocol in workflow.md)

## Phase 4: Control Panel and Image Management
- [ ] Task: Build the side control panel UI using standard Obsidian-inspired CSS variables.
- [ ] Task: Implement UI controls for mapping sensitivity and image selection.
- [ ] Task: Integrate mapping parameters into the active synchronization loop.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Control Panel and Image Management' (Protocol in workflow.md)
