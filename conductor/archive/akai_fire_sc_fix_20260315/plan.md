# Implementation Plan: AKAI Fire SocketCluster Bug Fix & UI Sync

## Phase 1: UI Alignment & CSS Synchronization [checkpoint: fa81966]
Goal: Replicate the connectivity UI and styling from the APC Mini mk2 app.

- [x] Task: Synchronize CSS styles
    - [x] Copy relevant connectivity and status bar styles from `apps/apc_mini_mk2_demo/styles.css` to `apps/akai_fire_demo/index.html` (within `<style>` tag).
- [x] Task: Update HTML structure
    - [x] Replace the existing "System" control group in `apps/akai_fire_demo/index.html` with the "Connectivity" structure from `apps/apc_mini_mk2_demo/index.html`.
    - [x] Ensure all IDs (`comm-mode`, `sc-select-container`, `midi-select-container`, `btn-scan`, `btn-connect`, etc.) match those used in the APC app.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) fa81966

## Phase 2: Logic Refactoring & TDD Setup [checkpoint: c74478b]
Goal: Move connection logic into `app.js` and set up failing tests for the new structure.

- [x] Task: Create initial test suite for `app.js`
    - [x] Create `apps/akai_fire_demo/app.test.js`.
    - [x] Write tests for UI state updates (e.g., `updateCommModeDisplay`).
    - [x] Write tests for MIDI message handling (mocking `socket` and `midiAccess`).
- [x] Task: Flatten connection logic into `app.js`
    - [x] Migrate logic from `FireConnectionManager.js` into the `FireApp` class in `apps/akai_fire_demo/app.js`.
    - [x] Implement `updateCommModeDisplay`, `requestMidiAccess`, `scanDevices`, and `updateStatus` methods.
    - [x] Ensure the "Scan" button is wired up to `scanDevices`.
- [x] Task: Update OLED and MIDI handling
    - [x] Integrate existing `oledLogic.js` and `midiLogic.js` with the new flattened `FireApp` class.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) c74478b

## Phase 3: SocketCluster Connection Fix & Final Verification [checkpoint: 3378bb0]
Goal: Implement the dynamic connection parameters and verify the fix.

- [x] Task: Implement dynamic SocketCluster connection
    - [x] Update `connectSocket` in `app.js` to use `window.location.hostname`, `window.location.port`, and `path: '/socketcluster/'`.
    - [x] Update connection listeners to handle the `{socket}` object correctly.
- [x] Task: Verify TDD tests pass
    - [x] Run `npm test apps/akai_fire_demo/app.test.js` and ensure all tests pass (Green phase).
- [x] Task: Final Cleanup
    - [x] Remove `apps/akai_fire_demo/connectionManager.js` if it's no longer used.
    - [x] Ensure all files pass linting.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 3378bb0

