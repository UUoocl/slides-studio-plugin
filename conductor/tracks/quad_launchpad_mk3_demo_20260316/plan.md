# Implementation Plan: Quad Launchpad MK3 Demo App

## Phase 1: Setup & Scaffolding [checkpoint: c24c3a8]
- [x] Task: Create new directory `apps/quad_launchpad_mk3_demo` and copy shared assets (e.g., `lib/`). 986e094
- [x] Task: Create basic `index.html` with a 2x2 layout container for 4 virtual grids. 0201961
- [x] Task: Create `styles.css` for the 2x2 grid layout and device rotations. e582983
- [x] Task: Create `constants.js` to store device orientations and global canvas dimensions (16x16). d4d9a07
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup & Scaffolding' (Protocol in workflow.md) c24c3a8

## Phase 2: Connectivity & Device Management [checkpoint: 07fa16d]
- [x] Task: Implement `LaunchpadConnection` class to handle individual device state (WebMIDI/SocketCluster). d8fa4f2
- [x] Task: Implement `QuadLaunchpadManager` to orchestrate 4 connections and their lifecycle. eb49467
- [x] Task: Add UI controls for connecting 4 devices independently (MIDI port selectors and SC aliases). 7ff3595
- [x] Task: Verify programmer mode handshake works for all 4 devices simultaneously. 4cc3ae0
- [x] Task: Conductor - User Manual Verification 'Phase 2: Connectivity & Device Management' (Protocol in workflow.md) 07fa16d

## Phase 3: Coordinate Transformation & Global Canvas [checkpoint: aaaa6a3]
- [x] Task: Implement a `CoordinateTransformer` utility to map global (x, y) coordinates to (device_id, local_x, local_y). 4fb3d65
- [x] Task: Implement rotation logic within the transformer (0, 90, 180, 270 degrees). 4fb3d65
- [x] Task: Create a `GlobalCanvas` class that uses the transformer to dispatch LED commands to the correct devices. 07c1160
- [x] Task: Write unit tests for coordinate transformations and rotations. 4fb3d65
- [x] Task: Conductor - User Manual Verification 'Phase 3: Coordinate Transformation & Global Canvas' (Protocol in workflow.md) aaaa6a3

## Phase 4: Animations
- [x] Task: Implement "Diagonal Wave (16x16)" animation using the `GlobalCanvas`. fbdd6fd
- [x] Task: Implement "Center-out Expansion" animation using the `GlobalCanvas`. 70f4bb3
- [x] Task: Implement "16x16 Scrolling Text" animation using the `GlobalCanvas`. 70f4bb3
- [x] Task: Implement "Global Sparkle (16x16)" animation using the `GlobalCanvas`. 70f4bb3
- [~] Task: Conductor - User Manual Verification 'Phase 4: Animations' (Protocol in workflow.md)

## Phase 5: Input Handling & UI Feedback
- [ ] Task: Implement input routing from physical devices to their respective virtual UI grids.
- [ ] Task: Add "Local Input Feedback" toggle to allow/disallow hardware-side feedback.
- [ ] Task: Final UI polish (connection status indicators, animation speed controls).
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Input Handling & UI Feedback' (Protocol in workflow.md)
