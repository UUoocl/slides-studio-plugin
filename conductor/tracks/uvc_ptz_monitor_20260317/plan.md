# Implementation Plan: UVC PTZ Monitor App

## Phase 1: Setup and Project Infrastructure [checkpoint: 55afaf5]
- [x] Task: Create the directory structure for the new app at `apps/uvc_ptz_monitor/`. e9ca99f
- [x] Task: Create the base `index.html` file with the necessary HTML5 boilerplate. 55afaf5
- [x] Task: Create `styles.css` and define the "Standard Slides Studio" theme (dark mode, technical aesthetic). e9ca99f
- [x] Task: Create a placeholder `app.js` to ensure script loading. e9ca99f
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and Project Infrastructure' (Protocol in workflow.md) 55afaf5

## Phase 2: Device Discovery and Video Feed [checkpoint: 8e35554]
- [x] Task: Implement `enumerateDevices()` in `app.js` to populate a camera selection dropdown. 1f75af5
- [x] Task: Implement `getUserMedia()` logic to request access to the selected video input. decf80d
- [x] Task: Render the live video stream in a dedicated `<video>` element on the page. decf80d
- [x] Task: Add basic error handling for camera permission denials or connection failures. 595bb0b
- [x] Task: Conductor - User Manual Verification 'Phase 2: Device Discovery and Video Feed' (Protocol in workflow.md) 8e35554

## Phase 3: PTZ Capability Detection and UI Implementation [checkpoint: b64a781]
- [x] Task: Extract the `MediaStreamTrack` from the active stream and query its capabilities using `track.getCapabilities()`. 551ba80
- [x] Task: Dynamically render sliders for `pan`, `tilt`, and `zoom` only if the hardware reports support for them. 551ba80
- [x] Task: Implement the UI event listeners to update camera constraints in real-time using `track.applyConstraints()`. 551ba80
- [x] Task: Display the current numeric values of PTZ settings next to the sliders. 551ba80
- [x] Task: Conductor - User Manual Verification 'Phase 3: PTZ Capability Detection and UI Implementation' (Protocol in workflow.md) b64a781

## Phase 4: Final Polishing and Technical Styling [checkpoint: 7a78a6d]
- [x] Task: Refine the CSS to ensure a professional, layout-responsive UI that fits the Slides Studio ecosystem. 7a78a6d
- [x] Task: Ensure all UI components are correctly labeled and follow consistent naming conventions. 7a78a6d
- [x] Task: Add a "Status" indicator to show connection state and PTZ support status. 7a78a6d
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Polishing and Technical Styling' (Protocol in workflow.md)
