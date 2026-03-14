# Implementation Plan: Novation Launchpad mk1 LED Controller Demo

## Phase 1: Setup and UI Structure
- [x] Task: Create directory and core files for the application.
    - [x] Create `apps/launchpad_mk1_demo/` directory.
    - [x] Create `index.html`, `app.js`, and `launchpadMk1Core.js`.
- [x] Task: Develop the HTML/CSS layout representing the physical Launchpad mk1 grid.
    - [x] Create the CSS styles for the 8x8 main grid.
    - [x] Create the CSS styles for the 8 top row (Automap/Live) buttons.
    - [x] Create the CSS styles for the 8 right column (Scene) buttons.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and UI Structure' (Protocol in workflow.md) [checkpoint: initial]

## Phase 2: Core MIDI Logic (TDD)
- [ ] Task: Write failing unit tests for the `LaunchpadMk1Core` color and message calculations.
    - [ ] Create test file for `launchpadMk1Core.js` (e.g., using project's testing framework).
    - [ ] Test the velocity calculation formula: `(16 * Green) + Red + Flags`.
    - [ ] Test X-Y coordinate to MIDI Note conversion.
- [ ] Task: Implement the `LaunchpadMk1Core` class to pass tests.
    - [ ] Implement `calculateColorVelocity(red, green, flags)`.
    - [ ] Implement mapping for grid pads (Note On, `0x90`).
    - [ ] Implement mapping for top row pads (CC, `0xB0`).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core MIDI Logic (TDD)' (Protocol in workflow.md)

## Phase 3: Hardware Integration & Animations
- [ ] Task: Implement WebMIDI connection and Device-to-Web synchronization.
    - [ ] Implement logic to detect and connect to the Novation Launchpad mk1 MIDI inputs/outputs.
    - [ ] Listen for incoming MIDI messages (Note On/Off, CC) and update the corresponding HTML UI pads visually.
- [ ] Task: Implement Web-to-Device synchronization.
    - [ ] Add click event listeners to the HTML UI pads.
    - [ ] On click, send the appropriate MIDI Note On/CC message to the physical Launchpad using `LaunchpadMk1Core`.
- [ ] Task: Implement basic LED animations and demonstrations.
    - [ ] Add "Clear All LEDs" functionality.
    - [ ] Implement a "Solid Fill" animation.
    - [ ] Implement a basic color wave or pattern demonstration to show programmatic control.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Hardware Integration & Animations' (Protocol in workflow.md)