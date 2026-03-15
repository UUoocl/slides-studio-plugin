# Launchpad Mini [MK3] LED Controller Demo

## Description
A standalone HTML application designed to demonstrate real-time LED control of the Novation Launchpad Mini [MK3] MIDI controller. The application supports both direct browser-to-hardware communication via **WebMIDI** and networked control via the **Slides Studio SocketCluster server**.

## Features
- **Connectivity Menu**: Unified control for switching between Direct WebMIDI and SocketCluster Bridge modes.
- **Bi-directional WebMIDI**: Support for connecting directly to physical hardware with independent selection of MIDI Input and Output ports.
- **Virtual Launchpad Grid**: A 9x9 interactive UI that mirrors the physical layout of the Launchpad Mini [MK3], providing visual feedback for both incoming and outgoing MIDI messages.
- **Programmer Mode Support**: Automatic SysEx handshake to switch the device into Programmer Mode for direct LED control.
- **Lighting Controls**:
    - **Palette Control**: Select from the internal Launchpad color palette (0-127) and different LED behaviors (Solid, Pulsing, Blinking).
    - **Custom RGB**: Support for 24-bit RGB control via custom SysEx messages.
    - **Solid Fill**: Fills the entire 8x8 grid with a single command.
    - **Scrolling Text**: Sends ASCII text to the device for real-time scrolling display.
- **Dynamic Animations**:
    - **Rainbow Wave**: A smooth, row-based color shifting animation.
    - **Random Sparkle**: A high-frequency "twinkling" effect with randomized colors.

## Usage
1. **Access**: Open `index.html` in a WebMIDI-capable browser (Chrome, Edge, Opera).
2. **Connection**:
    - **Direct WebMIDI**:
        - Select **Direct WebMIDI** from the Mode dropdown.
        - Select your device's **Input** and **Output** ports (e.g., "LPM MIDI" or "Launchpad MK3 MIDI In/Out").
        - Click **Connect**. The hardware should enter Programmer Mode immediately.
    - **SocketCluster Bridge**:
        - Select **SocketCluster Bridge** from the Mode dropdown.
        - Enter the **Plugin MIDI Alias** that matches your configured device in Slides Studio.
        - Click **Connect**.
3. **Interaction**:
    - **UI -> Hardware**: Click pads in the virtual grid or use the pattern buttons to send MIDI to the device.
    - **Hardware -> UI**: Press physical pads on the Launchpad to see real-time visual feedback in the browser.

## Developer Overview
- **`app.js`**: Refactored into a class-based `LaunchpadApp` that manages the bidirectional state machine and unified communication layer.
- **`launchpadCore.js`**: Core MIDI constants and SysEx generation logic specific to the MK3 series.
- **`app.test.js`**: Comprehensive unit tests covering initialization, connectivity logic, and message parsing using Vitest and DOM mocking.

### Technical Implementation
- **Programmer Mode Handshake**: `F0 00 20 29 02 0D 0E 01 F7`
- **RGB SysEx Format**: `[Header] 03h 03h <index> <r> <g> <b>` (where r, g, b are 7-bit values 0-127).
- **SocketCluster Channels**: Listens on `midi_in_<alias>` and `midi_out_<alias>`, publishes to `midi_out_<alias>`.
