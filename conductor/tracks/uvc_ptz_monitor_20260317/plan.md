# Implementation Plan: UVC PTZ Monitor App

## Phase 1: Setup and Project Infrastructure [checkpoint: e9ca99f]
- [x] Task: Create the directory structure for the new app at `apps/uvc_ptz_monitor/`. e9ca99f
- [x] Task: Create the base `index.html` file with the necessary HTML5 boilerplate. e9ca99f
- [x] Task: Create `styles.css` and define the "Standard Slides Studio" theme (dark mode, technical aesthetic). e9ca99f
- [x] Task: Create a placeholder `app.js` to ensure script loading. e9ca99f
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup and Project Infrastructure' (Protocol in workflow.md)

## Phase 2: Device Discovery and Video Feed
- [ ] Task: Implement `enumerateDevices()` in `app.js` to populate a camera selection dropdown.
- [ ] Task: Implement `getUserMedia()` logic to request access to the selected video input.
- [ ] Task: Render the live video stream in a dedicated `<video>` element on the page.
- [ ] Task: Add basic error handling for camera permission denials or connection failures.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Device Discovery and Video Feed' (Protocol in workflow.md)

## Phase 3: PTZ Capability Detection and UI Implementation
- [ ] Task: Extract the `MediaStreamTrack` from the active stream and query its capabilities using `track.getCapabilities()`.
- [ ] Task: Dynamically render sliders for `pan`, `tilt`, and `zoom` only if the hardware reports support for them.
- [ ] Task: Implement the UI event listeners to update camera constraints in real-time using `track.applyConstraints()`.
- [ ] Task: Display the current numeric values of PTZ settings next to the sliders.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: PTZ Capability Detection and UI Implementation' (Protocol in workflow.md)

## Phase 4: Final Polishing and Technical Styling
- [ ] Task: Refine the CSS to ensure a professional, layout-responsive UI that fits the Slides Studio ecosystem.
- [ ] Task: Ensure all UI components are correctly labeled and follow consistent naming conventions.
- [ ] Task: Add a "Status" indicator to show connection state and PTZ support status.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Polishing and Technical Styling' (Protocol in workflow.md)
