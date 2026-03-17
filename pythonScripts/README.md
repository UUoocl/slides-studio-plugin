# Slides Studio Python Scripts

This directory contains Python scripts used by the Slides Studio Obsidian plugin to monitor system inputs (mouse and keyboard) and bridge UVC camera utilities. These scripts communicate with the plugin's SocketCluster server to provide real-time data for automation and overlays.

## Developer Overview

The scripts are designed to be long-running processes that connect as clients to a SocketCluster server. They use `pynput` for cross-platform input monitoring and `socketclusterclient` for real-time communication.

### Core Dependencies
- **pynput**: Used for global mouse and keyboard hooks.
- **socketclusterclient**: Used to connect to the plugin's WebSocket server.
- **ctypes**: (UVC Bridge only) Used to interface with the native `libuvcutil.dylib`.

## Installation & Setup

To use these scripts, you must have Python installed and the required modules available in your environment.

### Required Packages
Install the dependencies using pip:
```bash
pip install pynput socketclusterclient
```

### macOS Python Path
On macOS, if you are using the official Python.org installer, your Python path might be:
`Library/Frameworks/Python.framework/Versions/3.12/bin/python3`

## Script Descriptions

### `mouse_monitor.py`
Monitors global mouse events including position, clicks, and scroll.
- **Usage**: `python3 mouse_monitor.py <websocket_url> <monitor_pos> <monitor_clicks> <monitor_scroll>`
- **Channels**: Publishes to `mousePosition`, `mouseClick`, and `mouseScroll`.

### `keyboard_monitor.py`
Monitors global keyboard events and detects key combinations.
- **Usage**: `python3 keyboard_monitor.py <websocket_url> <show_combinations>`
- **Channels**: Publishes to `keyboardPress` and `keyboardRelease`.

### `uvc-util/uvc_util_bridge.py`
A bridge for controlling UVC camera settings (exposure, focus, etc.) on macOS using a native library.
- **Usage**: `python3 uvc_util_bridge.py --url <websocket_url> --lib <path_to_dylib>`
- **Channels**: Subscribes to `uvcCommands`, publishes to `uvcResponse` and `uvc_in_{device_name}`.

## Integration with Obsidian
The plugin launches these scripts as child processes using the `pythonPath` configured in the plugin settings. Ensure the `pythonPath` points to the interpreter where you installed the dependencies.
