# Implementation Plan: Novation Launchpad mk1 LED Controller Demo

## Phase 1: Setup and UI Structure [checkpoint: 7273e9d]
- [x] Task: Create directory and core files for the application.
    - [x] Create `apps/launchpad_mk1_demo/` directory.
    - [x] Create `index.html`, `app.js`, and `launchpadMk1Core.js`.
- [x] Task: Develop the HTML/CSS layout representing the physical Launchpad mk1 grid.
    - [x] Create the CSS styles for the 8x8 main grid.
    - [x] Create the CSS styles for the 8 top row (Automap/Live) buttons.
    - [x] Create the CSS styles for the 8 right column (Scene) buttons.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and UI Structure' (Protocol in workflow.md) [checkpoint: 7273e9d]

## Phase 2: Core MIDI Logic (TDD) [checkpoint: 90cecfd]
- [x] Task: Write failing unit tests for the `LaunchpadMk1Core` color and message calculations.
    - [x] Create test file for `launchpadMk1Core.js` (e.g., using project's testing framework).
    - [x] Test the velocity calculation formula: `(16 * Green) + Red + Flags`.
    - [x] Test X-Y coordinate to MIDI Note conversion.
- [x] Task: Implement the `LaunchpadMk1Core` class to pass tests.
    - [x] Implement `calculateColorVelocity(red, green, flags)`.
    - [x] Implement mapping for grid pads (Note On, `0x90`).
    - [x] Implement mapping for top row pads (CC, `0xB0`).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Core MIDI Logic (TDD)' (Protocol in workflow.md) [checkpoint: 90cecfd]

## Phase 3: Hardware Integration & Animations [checkpoint: 93a1a30]
- [x] Task: Implement WebMIDI connection and Device-to-Web synchronization.
    - [x] Implement logic to detect and connect to the Novation Launchpad mk1 MIDI inputs/outputs.
    - [x] Listen for incoming MIDI messages (Note On/Off, CC) and update the corresponding HTML UI pads visually.
- [x] Task: Implement Web-to-Device synchronization.
    - [x] Add click event listeners to the HTML UI pads.
    - [x] On click, send the appropriate MIDI Note On/CC message to the physical Launchpad using `LaunchpadMk1Core`.
- [x] Task: Implement basic LED animations and demonstrations.
    - [x] Add "Clear All LEDs" functionality.
    - [x] Implement a "Solid Fill" animation.
    - [x] Implement a basic color wave or pattern demonstration to show programmatic control.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Hardware Integration & Animations' (Protocol in workflow.md) [checkpoint: 93a1a30]

## Phase 4: SocketCluster Messaging Enhancement [checkpoint: 10fd56b]
- [x] Task: Update UI to support communication mode selection.
    - [x] Add a dropdown or radio buttons to `index.html` to choose between "Direct MIDI" and "SocketCluster Bridge".
    - [x] Add SocketCluster client library to `index.html`.
- [x] Task: Implement SocketCluster communication logic.
    - [x] Initialize SocketCluster client in `app.js`.
    - [x] Implement `sendMidiViaSocket(payload)` to publish to the correct channel.
    - [x] Implement `subscribeToDeviceEvents(deviceName)` to listen for hardware events via the server.
- [x] Task: Integrate dual-mode switching in `app.js`.
    - [x] Refactor `handlePadClick` and `handleMidiMessage` to use the selected communication mode.
- [x] Task: Conductor - User Manual Verification 'Phase 4: SocketCluster Messaging Enhancement' (Protocol in workflow.md) [checkpoint: 10fd56b]