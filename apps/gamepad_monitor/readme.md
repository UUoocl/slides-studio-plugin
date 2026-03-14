# Gamepad Monitor (SocketCluster)

This application monitors and visualizes gamepad input received from the Slides-Studio SocketCluster server.

## Features
- **Remote Monitoring**: View gamepad state from any device connected to the server.
- **Dynamic Configuration**: Subscribes to a specific gamepad channel based on query parameters.
- **Real-time**: Displays button presses and axis movements as they happen.
- **Visual Feedback**: Shows active buttons and axis values in the UI.

## Usage
Add this app to OBS as a **Browser Source** and append the gamepad's configured name as a query parameter:

`http://127.0.0.1:57000/apps/gamepad_monitor/gamepad_input.html?name=player1`

- The `name` parameter should match the "Channel name" configured in the Slides-Studio plugin settings.
- The app will subscribe to the channel `gamepad_in_{name}`.

## Requirements
- Slides-Studio plugin with Server enabled and Gamepad broadcasting enabled for the controller.
- Connected to the SocketCluster server (handled automatically).
