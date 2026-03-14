# Launchpad mk1 LED Controller Demo

## Description
A standalone HTML application designed to demonstrate real-time LED control and bidirectional synchronization with the original Novation Launchpad (mk1) MIDI controller. 

## Features
- **Virtual Grid UI**: A 9x9 interactive grid representing the physical device.
- **Dual Communication Modes**:
  - **Direct WebMIDI**: Direct browser-to-hardware communication via the WebMIDI API.
  - **SocketCluster Bridge**: Remote control and unified messaging via the Slides Studio SocketCluster server.
- **Bicolor LED Simulation**: Visual representation of the mk1's Red, Green, and Amber LED states.
- **Animations**:
  - **Amber Wave**: A sequential scan showing row-by-row color updates.
  - **Random Sparkle**: High-frequency random color updates across the grid.
- **Bidirectional Sync**: Physical button presses are reflected in the UI, and UI clicks update the hardware.

## Usage
1. Open `index.html` in a WebMIDI-capable browser (e.g., Chrome, Edge).
2. Set the **MIDI Device Alias** to match your Launchpad (default: "Launchpad").
3. Choose your **Communication Mode**:
   - Select **Direct WebMIDI** for local use.
   - Select **SocketCluster Bridge** if you want to route MIDI through the Slides Studio server.
4. Use the **Manual Control** inputs (Red/Green brightness 0-3) to set colors.
5. Click pads or animations to see them on the device.

## Developer Overview
- **`index.html`**: The UI structure and styling.
- **`app.js`**: Application logic, WebMIDI connection, and SocketCluster client integration.
- **`launchpadMk1Core.js`**: Core MIDI logic, including color velocity calculations and X-Y coordinate mapping.
- **`launchpadMk1Core.test.js`**: Unit tests for the core logic (run with `vitest`).

### MIDI Implementation
The app follows the original Launchpad technical documentation:
- **Grid Pads**: Note On messages on Channel 1 using X-Y mapping (`16 * Row + Col`).
- **Top Row**: Control Change messages (104-111).
- **LED Colors**: Velocity formula `(16 * Green) + Red + 12`.
