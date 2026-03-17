# Implementation Plan: Quad Launchpad MK3 Demo App

## Phase 1: Setup & Scaffolding [checkpoint: c24c3a8]
- [x] Task: Create new directory `apps/quad_launchpad_mk3_demo` and copy shared assets (e.g., `lib/`). 986e094
- [x] Task: Create basic `index.html` with a 2x2 layout container for 4 virtual grids. 0201961
- [x] Task: Create `styles.css` for the 2x2 grid layout and device rotations. e582983
- [x] Task: Create `constants.js` to store device orientations and global canvas dimensions (16x16). d4d9a07
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup & Scaffolding' (Protocol in workflow.md) c24c3a8

## Phase 2: Connectivity & Device Management
- [~] Task: Implement `LaunchpadConnection` class to handle individual device state (WebMIDI/SocketCluster).
- [ ] Task: Implement `QuadLaunchpadManager` to orchestrate 4 connections and their lifecycle.
- [ ] Task: Add UI controls for connecting 4 devices independently (MIDI port selectors and SC aliases).
- [ ] Task: Verify programmer mode handshake works for all 4 devices simultaneously.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Connectivity & Device Management' (Protocol in workflow.md)

## Phase 3: Coordinate Transformation & Global Canvas
- [ ] Task: Implement a `CoordinateTransformer` utility to map global (x, y) coordinates to (device_id, local_x, local_y).
- [ ] Task: Implement rotation logic within the transformer (0, 90, 180, 270 degrees).
- [ ] Task: Create a `GlobalCanvas` class that uses the transformer to dispatch LED commands to the correct devices.
- [ ] Task: Write unit tests for coordinate transformations and rotations.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Coordinate Transformation & Global Canvas' (Protocol in workflow.md)

## Phase 4: Animations
- [ ] Task: Implement "Diagonal Wave (16x16)" animation using the `GlobalCanvas`.
- [ ] Task: Implement "Center-out Expansion" animation using the `GlobalCanvas`.
- [ ] Task: Implement "16x16 Scrolling Text" animation using the `GlobalCanvas`.
- [ ] Task: Implement "Global Sparkle (16x16)" animation using the `GlobalCanvas`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Animations' (Protocol in workflow.md)

## Phase 5: Input Handling & UI Feedback
- [ ] Task: Implement input routing from physical devices to their respective virtual UI grids.
- [ ] Task: Add "Local Input Feedback" toggle to allow/disallow hardware-side feedback.
- [ ] Task: Final UI polish (connection status indicators, animation speed controls).
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Input Handling & UI Feedback' (Protocol in workflow.md)
