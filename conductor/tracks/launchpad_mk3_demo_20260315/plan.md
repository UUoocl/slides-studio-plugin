# Implementation Plan: Novation Launchpad MK3 Connectivity Enhancement

## Phase 1: UI & Structure Refactoring [checkpoint: a2f3a69]
- [x] Task: Refactor `apps/launchpad_mk3_demo/app.js` into a class-based structure (`LaunchpadApp`) for better state management. [8fc4e7d]
- [x] Task: Implement the "Connectivity" HTML/CSS in `index.html` (mirrored from APC mini). [a903d17]
- [x] Task: Implement the connectivity UI toggle logic (Direct vs Socket display) in `app.js`. [75358ae]
- [x] Task: Conductor - User Manual Verification 'Phase 1: UI & Structure Refactoring' (Protocol in workflow.md) [a2f3a69]

## Phase 2: WebMIDI Integration (TDD) [checkpoint: bf73682]
- [x] Task: Write TDD tests for WebMIDI lifecycle (scanning, connecting, and message parsing). [88d078e]
- [x] Task: Implement `requestMidiAccess` and `scanDevices` in `LaunchpadApp`. [46835b0]
- [x] Task: Implement `connectDirect` for hardware communication. [aa257cb]
- [x] Task: Implement the Programmer Mode SysEx handshake on successful direct connection. [c156e93]
- [x] Task: Conductor - User Manual Verification 'Phase 2: WebMIDI Integration (TDD)' (Protocol in workflow.md) [bf73682]


## Phase 3: Bidirectional Synchronization
- [x] Task: Map physical pad/button MIDI messages (NoteOn/CC) to virtual UI highlights. [882ddfd]
- [x] Task: Map virtual UI pad/button clicks to outgoing MIDI messages (Direct or Socket). [ec04ad3]
- [x] Task: Implement unified `sendMidi` and `handleMidiMessage` methods that respect the active communication mode. [9ddbe58]
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Bidirectional Synchronization' (Protocol in workflow.md)


## Phase 4: Refinement & Polish
- [ ] Task: Update the "Patterns" (Rainbow, Sparkle) to work seamlessly with the new connectivity layer.
- [ ] Task: Final UI polish for consistency with the APC mini demo.
- [ ] Task: Update the `apps/launchpad_mk3_demo/README.md` with technical details.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Refinement & Polish' (Protocol in workflow.md)
