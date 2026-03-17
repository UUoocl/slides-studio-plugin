# Specification: Quad Launchpad MK3 Demo App

## Overview
Create a new HTML application `apps/quad_launchpad_mk3_demo` that supports four Novation Launchpad Mini [MK3] MIDI devices arranged in a 2x2 grid. The application will extend the functionality of the existing `launchpad_mk3_demo` to handle multiple devices, custom rotations for each device, and synchronized animations across a unified 16x16 surface.

## Functional Requirements
### 1. Connectivity & Device Management
- **Multi-Device Support**: Independently connect to four Launchpad MK3 devices.
- **Connection Modes**:
    - **WebMIDI**: Allow the user to manually select a MIDI Input and Output port for each of the four device slots (0,0; 0,1; 1,0; 1,1).
    - **SocketCluster**: Allow the user to specify four unique aliases (e.g., `lp_00`, `lp_01`, `lp_10`, `lp_11`) for networked control.
- **Independent State**: Each device slot should maintain its own connection status and programmer mode handshake.

### 2. User Interface (UI)
- **2x2 Grid Layout**: Display four individual 9x9 virtual grids in the UI, arranged in a 2x2 configuration.
- **Rotational Mapping**: The virtual grids must reflect the physical orientation of the devices:
    - **(0,0) [Top-Left]**: Rotated -90 degrees.
    - **(0,1) [Top-Right]**: 0 degrees (Standard orientation).
    - **(1,0) [Bottom-Left]**: Rotated 180 degrees.
    - **(1,1) [Bottom-Right]**: Rotated 90 degrees.
- **Visual Feedback**: Each virtual grid should display real-time LED states and button presses for its respective device.

### 3. Synchronized Animations (Global Canvas)
- **16x16 Canvas**: Implement a coordinate mapping system that treats the four 8x8 grids as a single unified 16x16 surface (ignoring control buttons for core animations).
- **Rotation-Aware Rendering**: LED commands sent to each device must be transformed according to that device's rotation within the 2x2 grid.
- **Example Animations**:
    - **Diagonal Wave (16x16)**: A color wave moving diagonally across the entire 16x16 surface.
    - **Center-out Expansion**: Circles or squares expanding from the center of the 2x2 grid.
    - **16x16 Scrolling Text**: ASCII text scrolling across all four devices as a single display.
    - **Global Sparkle (16x16)**: Randomized "twinkling" effect across the entire surface.

### 4. Input Handling
- **Local Input Feedback**: Physical button presses on a device will trigger visual feedback in the corresponding virtual UI grid and only affect the local device's LEDs (if feedback is enabled).
- **Message Parsing**: Properly route incoming MIDI/SocketCluster messages to the correct device slot based on the source port or alias.

## Non-Functional Requirements
- **Performance**: High-frequency LED updates across 4 devices should remain smooth (targeting ~30-60 FPS for animations).
- **Modularity**: Reuse the core logic from `apps/launchpad_mk3_demo/launchpadCore.js` where possible.
- **Code Consistency**: Follow the class-based structure established in the existing `launchpad_mk3_demo`.

## Acceptance Criteria
- [ ] Successfully connects to 4 physical or virtual Launchpad MK3 devices via WebMIDI or SocketCluster.
- [ ] Virtual UI correctly displays 4 grids with the specified rotations.
- [ ] All 4 example animations correctly span the 16x16 grid and respect device rotations.
- [ ] Button presses on any of the 4 devices are accurately reflected in the corresponding UI grid.
- [ ] The app handles independent disconnection/reconnection of any device.

## Out of Scope
- Mapping control buttons (top/side) into a unified 16x16 logic (they remain local to each device's edge).
- Support for other Launchpad models (S, MK2, Pro).
- Persistent storage of MIDI port selections or aliases (can be added later).
