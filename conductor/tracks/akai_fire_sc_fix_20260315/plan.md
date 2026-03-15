# Implementation Plan: AKAI Fire SocketCluster Bug Fix & UI Sync

## Phase 1: UI Alignment & CSS Synchronization [checkpoint: fa81966]
Goal: Replicate the connectivity UI and styling from the APC Mini mk2 app.

- [x] Task: Synchronize CSS styles
    - [x] Copy relevant connectivity and status bar styles from `apps/apc_mini_mk2_demo/styles.css` to `apps/akai_fire_demo/index.html` (within `<style>` tag).
- [x] Task: Update HTML structure
    - [x] Replace the existing "System" control group in `apps/akai_fire_demo/index.html` with the "Connectivity" structure from `apps/apc_mini_mk2_demo/index.html`.
    - [x] Ensure all IDs (`comm-mode`, `sc-select-container`, `midi-select-container`, `btn-scan`, `btn-connect`, etc.) match those used in the APC app.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) fa81966

## Phase 2: Logic Refactoring & TDD Setup
Goal: Move connection logic into `app.js` and set up failing tests for the new structure.

...
    - [ ] Create `apps/akai_fire_demo/app.test.js`.
    - [ ] Write tests for UI state updates (e.g., `updateCommModeDisplay`).
    - [ ] Write tests for MIDI message handling (mocking `socket` and `midiAccess`).
- [ ] Task: Flatten connection logic into `app.js`
    - [ ] Migrate logic from `FireConnectionManager.js` into the `FireApp` class in `apps/akai_fire_demo/app.js`.
    - [ ] Implement `updateCommModeDisplay`, `requestMidiAccess`, `scanDevices`, and `updateStatus` methods.
    - [ ] Ensure the "Scan" button is wired up to `scanDevices`.
- [ ] Task: Update OLED and MIDI handling
    - [ ] Integrate existing `oledLogic.js` and `midiLogic.js` with the new flattened `FireApp` class.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: SocketCluster Connection Fix & Final Verification
Goal: Implement the dynamic connection parameters and verify the fix.

- [ ] Task: Implement dynamic SocketCluster connection
    - [ ] Update `connectSocket` in `app.js` to use `window.location.hostname`, `window.location.port`, and `path: '/socketcluster/'`.
    - [ ] Update connection listeners to handle the `{socket}` object correctly.
- [ ] Task: Verify TDD tests pass
    - [ ] Run `npm test apps/akai_fire_demo/app.test.js` and ensure all tests pass (Green phase).
- [ ] Task: Final Cleanup
    - [ ] Remove `apps/akai_fire_demo/connectionManager.js` if it's no longer used.
    - [ ] Ensure all files pass linting.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
