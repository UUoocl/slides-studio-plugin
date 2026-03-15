# Specification: AKAI Fire SocketCluster Bug Fix & UI Sync

## Overview
This track addresses a SocketCluster connection bug in `@apps/akai_fire_demo` and synchronizes its connectivity UI and logic with `@apps/apc_mini_mk2_demo`. The goal is to ensure a consistent user experience and reliable real-time communication across hardware demonstration apps.

## Functional Requirements
- **SocketCluster Connection Fix**: 
  - Update connection parameters to use `window.location.hostname` and `window.location.port || 8080`.
  - Ensure the `path: '/socketcluster/'` is explicitly defined.
  - Update connection listeners to handle the `{socket}` object returned by SC v14+.
- **Connectivity UI Synchronization**:
  - Replicate the "Connectivity" section from `@apps/apc_mini_mk2_demo/index.html` in `@apps/akai_fire_demo/index.html`.
  - Include "Communication Mode" (Direct/Socket) selection.
  - Include "Plugin MIDI Alias" input for Socket mode.
  - Include "Local MIDI Device" selection and a "Scan" button for Direct mode.
  - Apply the same CSS styling to the connectivity section for visual consistency.
- **Logic Refactoring**:
  - Move connection and MIDI management logic from `FireConnectionManager.js` directly into `apps/akai_fire_demo/app.js` to match the structure of the APC app.
  - Ensure MIDI message handling and OLED updates are correctly integrated into the new structure.

## Non-Functional Requirements
- **Consistency**: The look and feel of the connectivity controls must be identical to the APC Mini mk2 app.
- **Reliability**: SocketCluster connection should automatically use the current host and port, improving portability.

## Acceptance Criteria
- [ ] AKAI Fire app connects successfully to the SocketCluster server without the "WebSocket connection failed" error.
- [ ] The connectivity UI in the Fire app is visually and functionally identical to the APC app.
- [ ] The "Scan" button correctly populates the local MIDI device list.
- [ ] Switching between Direct WebMIDI and SocketCluster Bridge modes works as expected.
- [ ] Sending messages (Pads, Knobs, OLED) works correctly in both modes.

## Out of Scope
- Major changes to the AKAI Fire virtual controller layout or styling beyond the connectivity section.
- Implementation of new hardware-specific features for the AKAI Fire.
