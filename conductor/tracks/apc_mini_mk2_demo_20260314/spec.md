# Specification: AKAI Professional APC mini mk2 Demo App

## Overview
Develop a standalone HTML application to demonstrate the hardware capabilities of the AKAI APC mini mk2. The app will feature a virtual, interactive representation of the device, providing real-time bidirectional synchronization for the pad matrix, peripheral buttons, and physical faders. It will support both direct browser-to-hardware communication (WebMIDI) and remote communication via the Slides Studio SocketCluster bridge.

## Functional Requirements

### 1. Hardware Interaction & Visualization
- **Pad Matrix (8x8):**
  - **Bidirectional Sync:** Clicking a virtual pad sends MIDI to the device; pressing a physical pad highlights the UI.
  - **Multi-Behavior Support:** UI controls to trigger Solid (various brightness), Pulsing (various speeds), and Blinking (various speeds) behaviors.
  - **Color Palette:** Support the standard 128-velocity palette.
  - **Custom RGB (SysEx):** A demonstration mode to send 24-bit RGB values using the device's specific SysEx protocol.
- **Peripheral Buttons (Track 1-8 & Scene 1-8):**
  - Visualize physical presses.
  - Outbound LED control (Off, Solid, Blink).
- **Faders (1-9):**
  - **Animated Visualization:** The UI must feature 9 vertical bars that move in real-time as physical faders are adjusted (MIDI CC 0x30-0x38).
  - **Initialization:** On connection, send the "Introduction Message" (SysEx ID 0x60) to trigger the hardware to report current fader positions.

### 2. Device Modes
- **Mode Switching:** The app must handle messages for all three hardware modes:
  - **Session View:** Standard operation (Port 0).
  - **Drum Mode:** Channel 09 mapping.
  - **Note Mode:** Port 1 mapping.

### 3. Connectivity
- **Direct WebMIDI:** Low-latency browser-to-hardware communication.
- **SocketCluster Bridge:** Seamless routing through the Slides Studio server for remote monitoring or control.
- **Status Reporting:** Clear UI indication of connection status and active MIDI port/channel.

## Technical Standards
- **Modular ESM:** Code should be structured similarly to the `launchpad_mk1_demo`, separating core MIDI logic from UI orchestration.
- **TDD Approach:** Core message encoding/decoding must be verified with unit tests.

## Out of Scope
- Full DAW integration (Ableton Live emulation).
- Persistence of custom pad layouts (Session saving).
