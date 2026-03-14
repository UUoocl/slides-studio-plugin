# Implementation Plan: AKAI Fire MIDI Demo App

## Phase 1: Project Setup & Basic UI
- [ ] Task: Create directory structure in `apps/akai_fire_demo/` and initialize `index.html`.
- [ ] Task: Implement the HTML/CSS skeleton for the virtual AKAI Fire device (4x16 grid, knobs, and buttons).
- [ ] Task: Implement basic connectivity manager for switching between WebMIDI and SocketCluster.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Project Setup & Basic UI' (Protocol in workflow.md)

## Phase 2: MIDI Core & RGB/CC Implementation
- [ ] Task: Write TDD tests for MIDI message generation (CC for buttons, Note-On for pads).
- [ ] Task: Implement core MIDI output logic for standard buttons using CC messages.
- [ ] Task: Write TDD tests for Akai Fire RGB SysEx encoding.
- [ ] Task: Implement `sendRGBPad(index, r, g, b)` using the specific Fire SysEx protocol.
- [ ] Task: Implement input listener to reflect physical hardware state in the UI (Detailed Visuals).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: MIDI Core & RGB/CC Implementation' (Protocol in workflow.md)

## Phase 3: Interactive Features (Paint & Sequencer)
- [ ] Task: Write TDD tests for 'Paint Mode' state management.
- [ ] Task: Implement 'Paint Mode' (UI color picker -> Pad RGB update).
- [ ] Task: Write TDD tests for 16-step sequencer logic (timing and pad highlighting).
- [ ] Task: Implement 'Sequencer Demo' with basic animations.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Interactive Features (Paint & Sequencer)' (Protocol in workflow.md)

## Phase 4: OLED Integration
- [ ] Task: Write TDD tests for OLED bitmap encoding (monochrome 128x64).
- [ ] Task: Implement OLED text rendering logic (font to bitmap).
- [ ] Task: Implement `sendOLEDData()` SysEx transmission.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: OLED Integration' (Protocol in workflow.md)

## Phase 5: Refinement & Verification
- [ ] Task: Final UI polish and responsive adjustments for the virtual device.
- [ ] Task: Verify seamless switching between Direct WebMIDI and SocketCluster modes.
- [ ] Task: Document the MIDI/SysEx implementation in a `README.md` within the app folder.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Refinement & Verification' (Protocol in workflow.md)
