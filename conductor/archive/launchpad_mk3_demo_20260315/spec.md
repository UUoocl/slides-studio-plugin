# Specification: Novation Launchpad MK3 Connectivity Enhancement

## Overview
Enhance the existing `apps/launchpad_mk3_demo` app to support bidirectional communication with the physical Novation Launchpad MK3 device. This includes adding a "Connectivity" menu (mirrored from the APC mini mk2 demo) that allows users to choose between Direct WebMIDI and SocketCluster Bridge communication modes.

## Functional Requirements
- **Connectivity UI:**
  - Implement a "Connectivity" control group at the top of the controls area.
  - Support "Direct WebMIDI" mode with device scanning and selection.
  - Support "SocketCluster Bridge" mode with a configurable device alias (default: "Launchpad MK3").
  - Unified "Connect/Disconnect" button with status indicator.
- **Hardware Communication (Direct MIDI):**
  - Implement WebMIDI lifecycle management (scan, connect, message handling).
  - **Programmer Mode Support:** Implement the SysEx handshake to switch the Launchpad MK3 into Programmer Mode on connection.
  - **Bidirectional Sync:**
    - UI -> Device: Pad clicks in the virtual grid send MIDI Note/CC messages to the hardware.
    - Device -> UI: Physical pad presses send MIDI Note/CC messages to update the virtual UI state.
- **Hardware Communication (SocketCluster):**
  - Subscribe to `midi_in_<alias>` and `midi_out_<alias>` channels.
  - Publish outgoing MIDI messages to `midi_out_<alias>`.
- **SysEx Implementation:**
  - Standard Launchpad MK3 Programmer Mode SysEx: `F0 00 20 29 02 0D 0E 01 F7` (Switch to Programmer Mode).
  - (Optional) Fetch current state or send heartbeat if required by the device.

## Non-Functional Requirements
- **Consistency:** The UI and connection logic must match the `apc_mini_mk2_demo` for a unified user experience across hardware demos.
- **Performance:** Maintain low-latency synchronization ( < 20ms) for pad interactions.

## Acceptance Criteria
- [ ] User can select "Direct WebMIDI" and see their Launchpad MK3 in the list.
- [ ] Clicking "Connect" in Direct mode successfully switches the hardware to Programmer Mode (verified by hardware LED response).
- [ ] Pressing a physical pad highlights the corresponding virtual pad in the web app.
- [ ] Clicking a virtual pad lights up the physical pad on the hardware.
- [ ] User can switch to "SocketCluster Bridge" and messages are correctly routed through the server.
- [ ] The "Connectivity" menu is the first/top menu in the controls area.

## Out of Scope
- Implementation of DAW/Plugin mode specific logic.
- Complex animation sequences (focus is on raw connectivity and sync).
