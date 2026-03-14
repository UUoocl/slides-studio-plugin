# Implementation Plan: AKAI Professional APC mini mk2 Demo App

## Phase 1: Project Setup & UI Skeleton [checkpoint: f484016]
- [x] Task: Create directory structure in `apps/apc_mini_mk2_demo/`. [da095eb]
- [x] Task: Implement HTML/CSS for the virtual APC mini mk2 (8x8 grid, 9 faders, 17 buttons). [8ddff8a]
- [x] Task: Setup connectivity UI (Communication mode selector and connection status indicator). [546146a]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Project Setup & UI Skeleton' (Protocol in workflow.md) [f484016]

## Phase 2: Core MIDI Logic (TDD)
- [x] Task: Write TDD tests for standard LED behavior messages (Solid, Pulse, Blink). [a91f1b3]
- [x] Task: Implement `apcMiniCore.js` for standard LED message encoding. [57bd45a]
- [x] Task: Write TDD tests for "Introduction Message" and "Version Enquiry" SysEx. [3afbeb6]
- [x] Task: Implement SysEx initialization logic in `apcMiniCore.js`. [7a9b547]
- [x] Task: Write TDD tests for 24-bit Custom RGB SysEx encoding. [876f8e1]
- [ ] Task: Implement Custom RGB encoding in `apcMiniCore.js`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core MIDI Logic (TDD)' (Protocol in workflow.md)

## Phase 3: Hardware Interaction & Sync
- [ ] Task: Implement WebMIDI and SocketCluster connection lifecycle management.
- [ ] Task: Map physical fader CC (0x30-0x38) to UI animated bars.
- [ ] Task: Implement bidirectional pad matrix synchronization (Click-to-Device / Press-to-UI).
- [ ] Task: Implement peripheral button sync (Track 1-8 / Scene 1-8).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Hardware Interaction & Sync' (Protocol in workflow.md)

## Phase 4: Mode Handling & Advanced Features
- [ ] Task: Implement multi-mode support (Session View, Drum Mode, Note Mode).
- [ ] Task: Implement the "Intro Message" trigger on connection to fetch initial hardware fader states.
- [ ] Task: Implement a "Custom RGB Mode" UI toggle to demonstrate 24-bit SysEx control.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Mode Handling & Advanced Features' (Protocol in workflow.md)

## Phase 5: Refinement & Documentation
- [ ] Task: Final UI polish, responsiveness check, and mobile-friendly touch targets.
- [ ] Task: Create `README.md` with technical implementation details and MIDI mapping tables.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Refinement & Verification' (Protocol in workflow.md)
