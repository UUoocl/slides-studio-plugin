# Slides Studio (for Obsidian)

Slides Studio is the perfect companion for presenting Reveal.js slides with [Obsidian](https://obsidian.md) and [Open Broadcast Studio](https://obsproject.com/).

> [!IMPORTANT]
> This project was developed and enhanced using the **Gemini CLI** agent.

## Features

- **OBS Synchronization**: Automatically sync slide changes in Obsidian with OBS scene changes.
- **Smart Tags**: Use slide tags to trigger complex OBS actions, camera transitions, and layout changes.
- **Integrated Server**: A built-in Fastify server enables communication between Obsidian, OBS, and external devices.
- **Real-time Control**: Full support for MIDI and Open Sound Control (OSC) for professional presentation workflows.
- **SSE Support**: Server-Sent Events (SSE) for real-time broadcasting of MIDI and OSC messages to webviews or external listeners.

## Usage

### 1. Connecting to OBS
- Ensure [obs-websocket](https://github.com/obsproject/obs-websocket) is installed and enabled in OBS.
- Configure your IP, Port, and Password in Slides Studio settings.
- Use the `Connect OBS` command to establish the link.

### 2. Presentation Setup
- Use **Slides Extended** or similar to create your Reveal.js content.
- Add tags to your slides to define OBS behaviors (Scenes, Camera positions, etc.).
- Use the "Open Slides Studio View" ribbon icon to manage your presentation tags.

### 3. External Devices
- **OSC**: Configure input and output ports in settings to bridge Obsidian with software like TouchOSC or specialized hardware.
- **MIDI**: Connect MIDI controllers to trigger slide changes or OBS transitions directly from your hardware.

## Developer Overview

Slides Studio is built as an Obsidian plugin with a modern TypeScript architecture.

### Architecture
- **Core (`src/main.ts`)**: Manages the plugin lifecycle, Obsidian command registration, and event orchestration.
- **Server (`src/utils/serverLogic.ts`)**: Implements a **Fastify** server that runs locally within Obsidian. It provides:
    - **REST API**: For file management and sending device commands.
    - **SSE (Server-Sent Events)**: Real-time streams at `/api/osc/events` and `/api/midi/events` allowing the OBS browser sources or other webviews to react instantly to hardware inputs. **Device names are used as SSE event names**, allowing targeted listeners (e.g., `eventSource.addEventListener('MyController', ...)`).
- **Hardware Integration**:
    - **OSC Logic (`src/utils/oscLogic.ts`)**: Uses `node-osc` to handle bidirectional communication.
    - **MIDI Logic (`src/utils/midiLogic.ts`)**: Leverages `webmidi` for low-latency hardware interaction.
- **Commands**: Modular command pattern used for clean separation of concerns (see `src/commands/`).

### Documentation
API and code-level documentation can be generated using:
```bash
npm run doc
```
The output will be available in the `/docs` directory (configured for GitHub Pages).

## Server Routes

The built-in server provides a REST API for file management, device control, and status information.

### File Operations
Used for managing assets (like presets or configuration files) within the vault.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/file/list?folder=...` | List all JSON files in a specific folder. |
| `GET` | `/api/file/get?folder=...&filename=...` | Retrieve the contents of a JSON file. |
| `POST` | `/api/file/save` | Save data to a JSON file (Body: `{ folder, filename, data }`). |

### Device Control
Send commands to hardware or external software.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/osc/send` | Send an OSC message (Body: `{ deviceName, address, args }`). |
| `POST` | `/api/midi/send` | Send a MIDI message (Body: `{ deviceName, message }`). |
| `POST` | `/api/uvc/command` | Send a command to the UVC bridge (Body: `{ action, ... }`). |

### Settings & Messaging
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/obswss` | Get current OBS WebSocket connection details (IP, Port, PW). |
| `GET` | `/api/keyboard/settings` | Get current keyboard monitor settings. |
| `GET` | `/api/mouse/settings` | Get current mouse monitor settings. |
| `POST` | `/api/custom/message` | Broadcast a custom message to all SSE listeners (Body: `{ name, data }`). |

### Static File Serving
The server also serves files directly from the following locations:
- Plugin `lib/` folder (e.g., `p5.min.js`).
- Plugin `slide-studio-app/` folder (e.g., `studio.html`).
- The Obsidian Vault root (allowing access to any vault file via `http://localhost:57001/path/to/file`).

## Server-Sent Events (SSE)

The integrated server provides real-time SSE streams for low-latency communication between Obsidian and external listeners (like OBS browser sources).

| Topic | Endpoint | Event Name | Description |
| :--- | :--- | :--- | :--- |
| **OSC** | `/api/osc/events/:deviceName` | `:deviceName` | Broadcasts OSC messages from a specific device. |
| **MIDI** | `/api/midi/events/:deviceName` | `:deviceName` | Broadcasts MIDI messages from a specific device. |
| **Mouse** | `/api/mouse/events/:topic` | `:topic` | Mouse events (e.g., `mousePosition`, `mouseClick`, `mouseScroll`). |
| **Keyboard** | `/api/keyboard/events/:topic` | `:topic` | Keyboard events (e.g., `keyboardPress`, `keyboardRelease`). |
| **UVC** | `/api/uvc/events` | `uvc` | Broadcasts events from UVC-compatible cameras. |
| **Custom** | `/api/custom/events` | *Dynamic* | Broadcast custom messages via `POST /api/custom/message`. |
| **OBS** | `/api/v1/obs/events` | `CustomEvent`, `ConnectionOpened`, etc. | Broadcasts OBS WebSocket events. |

### SSE Example (JavaScript)
```javascript
const eventSource = new EventSource('http://localhost:57001/api/osc/events/TouchOSC');
eventSource.addEventListener('TouchOSC', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received OSC message:', data.message);
});
```

## OBS Proxy API (v1)

The plugin exposes a local proxy to the OBS WebSocket, allowing browser sources to call OBS functions without needing a direct connection or managing credentials.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/obs/isconnected` | Returns `{ "connected": boolean }`. |
| `POST` | `/api/v1/obs/batch` | Execute a batch of OBS WebSocket requests. |
| `POST` | `/api/v1/obs/:requestType` | Execute a single OBS WebSocket request (e.g., `SetCurrentProgramScene`). |

### Proxy Example (JavaScript)
```javascript
// Switching a scene via the OBS Proxy API
fetch('http://localhost:57001/api/v1/obs/SetCurrentProgramScene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneName: 'Camera 1' })
});
```

## Source Capture App

The `apps/source_capture/` directory contains a specialized application for high-performance source monitoring and computer vision processing.

### Key Capabilities
- **Direct OBS Connection**: Connects directly to the OBS WebSocket server (bypassing the internal proxy) to minimize latency for data-heavy operations.
- **Screenshot-based Polling**: Uses the `GetSourceScreenshot` request to capture frames at a configurable FPS, rather than subscribing to event streams.
- **MediaPipe Vision Tasks**: Integrated support for real-time computer vision processing using MediaPipe:
    - **Pose Landmarker**: 3D body tracking.
    - **Face Landmarker**: Facial feature and blendshape tracking.
    - **Hand Landmarker**: Multi-hand tracking.
- **Broadcast Channel API**: Captured data is forwarded to a browser `BroadcastChannel` (using the user-defined `Instance Name`).
    - **Image Mode**: Broadcasts the full base64/data-URL image.
    - **Vision Modes**: Broadcasts only the landmark coordinates and metadata to minimize channel overhead (the image is used for processing but not re-broadcast).

### Implementation Details
- **Vision Bundle**: While the app includes a local `vision_bundle.mjs`, it is currently configured to load MediaPipe tasks via CDN for broad compatibility.
- **Resource Management**: Computer vision models are loaded on-demand and executed on the GPU (where supported) for optimal performance.

## Installation

1. Download the latest release.
2. Place the contents in your vault's `.obsidian/plugins/slides-studio` folder.
3. Enable the plugin in Obsidian settings.

---

- MIT licensed | Copyright © 2025 Jonathan Wood
