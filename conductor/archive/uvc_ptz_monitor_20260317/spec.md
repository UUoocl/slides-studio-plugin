# Specification: UVC PTZ Monitor App

## Overview
A standalone HTML application within the `apps/` directory that provides a user interface for monitoring and controlling USB cameras with Pan, Tilt, and Zoom (PTZ) capabilities. The app leverages the modern `MediaStreamTrack.applyConstraints()` API available in Chromium-based browsers to offer real-time control without external dependencies.

## Functional Requirements
- **Camera Selection**: 
  - Provide a dropdown menu populated with all available video input devices.
  - Allow the user to manually switch between different cameras.
- **PTZ Control**:
  - Dynamically detect if the selected camera track supports `pan`, `tilt`, and `zoom` capabilities.
  - Provide interactive UI controls (sliders or directional pads) for each supported property.
  - Real-time application of PTZ constraints to the active video stream.
- **UI Design**:
  - Implement a "Standard Slides Studio" aesthetic, matching the dark and technical look of other tools in the repository.
  - Display a live preview of the camera stream alongside the controls.

## Non-Functional Requirements
- **Browser Compatibility**: Optimized for Chrome/Chromium to ensure support for advanced `MediaStreamTrack` constraints.
- **Performance**: High-responsiveness for PTZ adjustments to minimize latency during live production.
- **Maintainability**: Clean, modular JavaScript within the HTML file or a linked `app.js`.

## Acceptance Criteria
- [ ] User can successfully select a connected USB camera from a dropdown.
- [ ] PTZ controls appear only when the camera reports support for those features.
- [ ] Moving a UI slider for Pan, Tilt, or Zoom immediately affects the camera's physical or digital position.
- [ ] The application is self-contained within the `apps/uvc_ptz_monitor/` directory.

## Out of Scope
- **SocketCluster Integration**: This version will not communicate with the Slides Studio server.
- **Recording/Streaming**: The app is for monitoring and control only, not for recording video to disk.
- **Advanced UVC-util**: Will not use low-level system drivers or the `uvc-util` library.
