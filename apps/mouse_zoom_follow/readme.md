# Mouse Zoom & Follow

A dynamic OBS Browser Source application that automates scene item transformations to "follow" the system mouse cursor with smooth zooming capabilities. Designed for high-quality screen recordings and live presentations where focusing on specific areas of the screen is required.

## Description

The **Mouse Zoom & Follow** app provides a virtualized "stage" that mirrors your desktop layout in OBS. It tracks the system-wide mouse position and keyboard events via **WebSockets**, allowing you to zoom into areas of interest. The app automatically calculates the necessary transformations (position and scale) for OBS scene items (such as Display Captures) so that the "camera" in OBS follows your cursor smoothly.

### Key Features
- **WebSocket Integration**: High-performance, low-latency communication for real-time tracking and OBS control.
- **Dynamic Mouse Tracking**: Real-time cursor following across multiple monitors.
- **Rich Hotkey Support**: Support for complex key combinations (e.g., `ctrl + alt + =`) tracked globally via the host plugin.
- **Smooth Interpolation**: Configurable smoothing for both movement and zoom transitions.
- **Multi-Monitor Support**: Map individual physical monitors to specific OBS sources.
- **Perimeter Sync**: Sync additional browser sources (like overlays) to the current zoomed bounds.
- **Improved UI**: Toggleable list boxes and text inputs for easier source mapping within OBS.

## Usage

1. **Setup in Slides-Studio**: Ensure the Slides-Studio Obsidian plugin is running and OBS is connected.
2. **Add Browser Source**: Add `zoom_follow.html` as a Browser Source in OBS. Recommended resolution: `1920x1080`.
3. **Configure Mappings**:
   - Open the settings menu (press `S` or click the "Settings" button).
   - The app will list detected physical monitors.
   - **Click a Monitor Title** to show/hide the list of available OBS sources.
   - Select a source from the list, or manually type the **Source Name** into the text field.
4. **Set Hotkeys**:
   - Click the "Set key" fields for Zoom In/Out.
   - The field will change to "Press a key...".
   - Press the desired key (or combination) on your keyboard. The global monitor will capture and assign it.
5. **Tune Movement**: Adjust "Bounding Box Size" (dead-zone before following) and "Movement Speed" to match your preference.

## Developer Overview

The application is built using **p5.js** for the internal visualization and **WebSockets** for low-latency communication with the Obsidian plugin host.

- **`zoom_follow.html`**: The entry point. Loads dependencies and provides the settings UI overlay.
- **`js/sketch.js`**: Core p5.js logic. Handles the rendering loop, coordinate remapping, and physics calculations. Also manages the dynamic UI for monitor mapping.
- **`js/OBSManager.js`**: Managed WebSocket client.
    - **Identification**: Identifies as `Mouse_Zoom_and_Follow` on connection.
    - **Invocations**: Uses `obsRequest` to call OBS WebSocket methods.
    - **Subscriptions**: Listens to `mousePosition`, `keyboardPress`, and `obs:*` event channels.
- **`js/Monitor.js`**: Logic class for individual monitor instances. Calculates per-monitor transformations based on global zoom and view coordinates.
- **`js/Settings.js`**: Manages application state, `localStorage` persistence, and the hotkey "learning" state.

### Networking Flow
1. **Plugin -> App**: The host publishes `mousePosition` (absolute desktop coordinates) and `keyboardPress` (key strings or combos).
2. **App Calculation**: `sketch.js` lerps the `viewX` and `viewY` based on the mouse position relative to the configured `boundingBoxSize`.
3. **App -> OBS**: `OBSManager.js` sends `SetSceneItemTransform` requests to OBS via the plugin's `obsRequest` procedure, updating the actual sources seen by the audience.

To modify the app, edit the files in `@apps/mouse_zoom_follow/**`. Since it relies on WebSockets and the Slides-Studio API, it is best tested while the Obsidian plugin is active and serving the `/apps/` directory.
