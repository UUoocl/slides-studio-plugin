# AKAI Professional APC mini mk2 Demo App

A standalone HTML application demonstrating bidirectional MIDI synchronization and hardware control for the AKAI Professional APC mini mk2.

## Features
- **Virtual Device UI**: Real-time visualization of pads, buttons, and physical faders.
- **Bidirectional Sync**: UI updates from hardware inputs; Hardware LEDs update from UI clicks.
- **Dual Connectivity**:
  - **Direct WebMIDI**: Low-latency browser-to-hardware communication.
  - **SocketCluster Bridge**: Remote control via the Slides Studio messaging server.
- **Multi-Behavior LED Control**: Support for Solid, Pulse, and Blink pad behaviors.
- **24-bit Custom RGB**: Demonstration of the device's specific SysEx protocol for high-resolution color control.
- **Multi-Mode Support**: Handles Session View, Drum Mode, and Note Mode mappings.

## Technical Implementation

### MIDI Mapping (Session View / Port 0)
| Component | MIDI Type | Note/CC # | Payload |
| :--- | :--- | :--- | :--- |
| 8x8 Pad Matrix | Note-On/Off | 0x00 - 0x3F | Velocity determines color (palette 0-127) |
| Track Buttons 1-8 | Note-On/Off | 0x64 - 0x6B | 0x00 (Off), 0x01 (On), 0x02 (Blink) |
| Scene Buttons 1-8 | Note-On/Off | 0x70 - 0x77 | 0x00 (Off), 0x01 (On), 0x02 (Blink) |
| Shift Button | Note-On/Off | 0x7A | Input only (no LED) |
| Faders 1-8 | CC | 0x30 - 0x37 | Absolute position (0-127) |
| Master Fader | CC | 0x38 | Absolute position (0-127) |

### Advanced SysEx Commands
- **Introduction Message (Initialization)**: Sent on connection to trigger the device to report absolute fader positions.
  - `F0 47 7F 4F 60 00 04 00 <VerH> <VerL> <Bug> F7`
- **Custom RGB LED Control**: Sets precise 24-bit colors for a range of pads.
  - `F0 47 7F 4F 24 <Length> <Start> <End> <Red M/L> <Green M/L> <Blue M/L> F7`

## Developer Overview
- `app.js`: Main UI orchestration and MIDI event handling.
- `apcMiniCore.js`: Core message encoding logic (Modular ESM).
- `apcMiniCore.test.js`: Vitest unit tests for message encoding.
