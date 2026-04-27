# UVC Monitor Apps

This directory contains a suite of web-based tools for monitoring and controlling USB Video Class (UVC) devices (cameras) through the Slides-Studio plugin and its Python bridge.

## Overview

The UVC-util bridge allows you to interact with camera hardware controls—such as Pan, Tilt, Zoom, Focus, Brightness, and Contrast—in real-time via WebSockets. This enables cameras to be used as high-precision input sensors for visualizations and automation.

## Included Apps

### 1. Live Monitor (`uvc_util_monitor.html`)
The primary tool for verifying camera output. It displays a live grid of all available hardware controls for a specific camera.
- **Features:** Shows both **Raw** (hardware) and **Mapped** (user-defined) values side-by-side.
- **Visuals:** Includes progress bars for mapped values to quickly visualize range utilization.
- **Usage:** Open with `?name=your_camera_alias`.

### 2. Controller Demo (`uvc_util_demo.html`)
A diagnostic tool for manual interaction with camera controls.
- **Features:** Lists all controls, allows reading specific values, and provides an interface to manually `set_value`.
- **Usage:** Best for testing the range and response of specific hardware controls.

### 3. PTZF Poller & Mapper (`uvc_util_poller.html`)
A legacy tool for high-frequency polling and local range mapping.
- **Note:** The Python bridge now handles range mapping and polling internally, which is more efficient. This app remains useful for complex local-only re-mapping scenarios.

---

## Developer Overview

### Architecture
The UVC control flow operates through several layers:
1. **Hardware:** UVC-compliant camera.
2. **C Layer (`libuvcutil.dylib`):** Low-level access to the macOS/Windows UVC stack.
3. Bridge Layer (`uvc_util_bridge.py`): A Python process that loads the C library, connects to the plugin's WebSocket server, and performs real-time value mapping.
4. Transport Layer (WebSockets): Routes messages between the bridge and the plugin/apps.
5. **App Layer:** Web-based monitors (this directory) or visualization sketches.

### Communication Protocol

#### Outbound (Control)
To control a camera, publish to `uvc_out_{device_name}`:
```json
{
  "action": "set_value",
  "control": "zoom-abs",
  "value": 500
}
```

#### Inbound (Feedback)
Subscribe to `uvc_in_{device_name}` to receive updates. The bridge automatically enhances the payload with `mapped-value` if mapping is enabled in settings:
```json
{
  "action": "get_value",
  "control": "zoom-abs",
  "data": 500,
  "mapped-value": 0.75
}
```

### Value Mapping
Mapping is defined in the Obsidian plugin settings. For each camera, you can set a single range (e.g., `0` to `1`). The Python bridge will then automatically `lerp` every hardware value (regardless of its native range) into your target range. This ensures your visualizations can remain hardware-agnostic.
