# Track Specification: AKAI Fire MIDI Demo App

## Overview
Develop a standalone HTML application that demonstrates full control over the AKAI Fire MIDI controller's hardware features (RGB pads, button LEDs, and OLED display). The app will feature a virtual, interactive representation of the device and support dual-mode connectivity (Direct WebMIDI and SocketCluster).

## Functional Requirements

### 1. Hardware Control & LED Modes
- **RGB Pad Matrix (4x16):**
  - **Paint Mode:** Users can select colors and manually light up individual pads via the UI or physical hardware.
  - **Sequencer Demo + Animation:** A visual demonstration of a 16-step sequencer across the 4 rows, including animated transitions and patterns.
  - **SysEx Support:** Implement the specific Akai Fire SysEx protocol for RGB control (`F0 47 7F 43 65 ... F7`).
- **Button LEDs:**
  - Control single/dual-color LEDs for all peripheral buttons (Solo, Mute, Select, etc.) using MIDI CC messages.
- **OLED Display:**
  - Provide a feature to send basic text strings and simple geometric shapes to the 128x64 monochrome OLED using SysEx.

### 2. UI & Interaction
- **Virtual Device Illustration:**
  - Create a high-fidelity visual representation of the AKAI Fire.
  - **Interactivity:** Clicking virtual pads/buttons in the UI sends the corresponding MIDI messages to the hardware.
  - **Detailed Visual Feedback:** The UI must react in real-time to hardware inputs (highlighting pads/buttons, showing rotary encoder values, and touch-sensitive knob states).
- **Status & Configuration:**
  - **Visual Connection Badge:** Clearly indicate if the app is connected via "Direct WebMIDI" or "SocketCluster Bridge".
  - **Auto-Request SysEx:** Automatically request browser SysEx permissions on load for WebMIDI mode.

### 3. Connectivity
- **Direct WebMIDI:** Use the standard browser MIDI API for low-latency communication.
- **SocketCluster Bridge:** Integrate with the Slides-Studio plugin's SocketCluster server using standard channel conventions (`midi/device_name/input` and `midi/device_name/output`).

## Non-Functional Requirements
- **Performance:** Low-latency feedback for pad presses and animations.
- **Style Consistency:** Match the look and feel of the existing `launchpad_mk1_demo` while adapting to the unique form factor of the AKAI Fire.
- **Code Quality:** Use modular JavaScript (ESM) and document the MIDI/SysEx implementation details.

## Acceptance Criteria
- [ ] Virtual AKAI Fire renders correctly and is clickable.
- [ ] Hardware pads light up with correct RGB colors via SysEx.
- [ ] Hardware button LEDs respond to UI interaction and CC messages.
- [ ] Physical hardware inputs (pads, buttons, knobs) are reflected in the UI.
- [ ] Basic text/shapes can be rendered on the physical OLED.
- [ ] The app successfully switches between WebMIDI and SocketCluster modes.

## Out of Scope
- Full DAW integration or complex MIDI mapping for 3rd party software.
- Audio synthesis or playback within the demo app itself.
- Multi-device support (single AKAI Fire only).
