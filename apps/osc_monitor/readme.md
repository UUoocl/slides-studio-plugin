# OSC Monitor

A real-time OSC (Open Sound Control) monitoring and control application built for the Slides Studio environment. This app uses **WebSockets** to receive and send messages in a format compatible with the Slides Studio plugin.

## Usage

The application is a standalone HTML file that connects to the local WebSocket server (typically running on port 57000).

### Monitoring and Sending on Devices
To see OSC messages flowing through a specific device and send to another:
- Open `osc_monitor.html` in your browser.
- Append `?deviceName=YOUR_DEVICE_NAME` to the URL.
- **Example:** `osc_monitor.html?deviceName=MyiPhone`
- The status bar will show "Connected" when the WebSocket link is active.
- The app subscribes to `osc_in_YOUR_DEVICE_NAME` for monitoring.
- The app publishes to `osc_out_YOUR_DEVICE_NAME` when interacting with UI controls.

### Features
- **Live Logging:** Real-time display of messages including Topic, Address, and Arguments.
- **WebSocket Transport:** Uses the native Slides Studio WebSocket protocol.
- **Remote Control Demo:** A "Toggle OSC" button that sends an OSC-style payload to the output channel.

## Developer Overview

### Technical Stack
- **Library:** `slides-studio-client.js` (Native WebSocket wrapper)
- **Transport:** WebSockets
- **Styling:** Vanilla CSS (VS Code dark theme inspired)

### WebSocket Communication
The app uses the `SlidesStudioClient` to handle messaging:

- **Subscription:** Subscribes to `osc_in_${deviceName}`.
- **Message Format:** Expects objects with the following structure:
  ```json
  {
    "deviceName": "string",
    "message": ["address", ...args]
  }
  ```

### Remote Control Logic
The "Toggle OSC" button publishes to `osc_out_${deviceName}` using the standard format:
```javascript
socket.publish(`osc_out_${deviceName}`, {
    address: '/4/toggle1',
    args: [1] // or 0
});
```
