# Launchpad Mini [MK3] LED Controller Demo

## Description
A standalone HTML application designed to demonstrate real-time LED control of the Novation Launchpad Mini [MK3] MIDI controller. The application bridges user interactions from the web browser to the physical device using the Slides Studio SocketCluster server, serving as a reference implementation for high-frequency hardware synchronization.

## Features
- **Virtual Launchpad Grid**: A 9x9 interactive UI that mirrors the physical layout of the Launchpad Mini [MK3], providing visual feedback for outgoing MIDI messages.
- **Real-time Hardware Sync**: Bidirectional communication via SocketCluster channels, allowing for low-latency control of hardware LEDs.
- **System Commands**:
    - **Programmer Mode**: Automatically switches the device to Programmer Mode upon connection.
    - **Clear All**: Instantly turns off all LEDs on the device.
- **Lighting Controls**:
    - **Solid Fill**: Fills the entire 8x8 grid with a selectable palette color.
    - **Scrolling Text**: Sends ASCII text to the device for real-time scrolling display with custom colors.
- **Dynamic Animations**:
    - **Rainbow Wave**: A smooth, row-based color shifting animation.
    - **Random Sparkle**: A high-frequency "twinkling" effect with randomized colors.

## Usage
1. **Connection**: Ensure the Slides Studio plugin is running and the SocketCluster server is active.
2. **Access**: Open `index.html` in a modern web browser. The app will automatically attempt to connect to the server at the current host.
3. **Configuration**: 
    - Enter the **MIDI Device Alias** (default is "Launchpad") that matches your configured device in the Slides Studio settings.
4. **Interaction**:
    - Use the **Solid Fill** or **Scrolling Text** groups to send static commands.
    - Toggle **Dynamic Patterns** to start or stop continuous animations.
    - Use **Enter Programmer Mode** if the device needs to be manually reset to the correct mode.

## Developer Overview
- **`index.html`**: Defines the UI layout, including the virtual grid container and the control panels. Uses CSS Grid for the hardware-style interface.
- **`app.js`**: Manages the application lifecycle, including:
    - Initializing the SocketCluster client.
    - Handling UI events and the animation loop.
    - Throttling high-frequency animation frames to ensure system stability.
    - Updating the virtual UI state based on transmitted MIDI payloads.
- **`launchpadCore.js`**: A specialized utility module containing Launchpad Mini [MK3] specific constants and message generators:
    - **Constants**: Maps the non-linear pad indices used in Programmer Mode (8x8 grid, top row, and right column).
    - **MIDI Generators**: Functions for creating Note On and Control Change messages.
    - **SysEx Generators**: Sophisticated functions for generating Launchpad-specific SysEx payloads, including bulk LED updates and text scrolling commands.

### Communication Protocol
The app communicates over SocketCluster using a specific channel naming convention:
- **Outgoing**: Publishes to `midi_out_<Device Alias>`.
- **Payload Format**: 
  ```json
  {
    "type": "raw" | "sysex",
    "data": [byte1, byte2, ...]
  }
  ```
