# Slides Studio (for Obsidian)

Slides Studio is the perfect companion for presenting Reveal.js slides with [Obsidian](https://obsidian.md) and [Open Broadcast Studio](https://obsproject.com/).

> [!IMPORTANT]
> This project was developed and enhanced using the **Gemini CLI** agent.

## Features

- **OBS Synchronization**: Automatically sync slide changes in Obsidian with OBS scene changes.
- **Smart Tags**: Use slide tags to trigger complex OBS actions, camera transitions, and layout changes.
- **Integrated Server**: A built-in Fastify server enables communication between Obsidian, OBS, and external devices.
- **Real-time Control**: Low-latency support for MIDI and Open Sound Control (OSC) via dedicated WebSocket servers.
- **On-Device Speech-to-Text**: Local, privacy-first transcription using Chrome's experimental Web Speech API (Chrome 142+).
- **Unified SSE Support**: A single Server-Sent Events (SSE) endpoint at `/api/events` for real-time broadcasting of audio data, monitor events, and OBS status.

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
- **OSC**: Configure input and output ports in settings to bridge Obsidian with software like TouchOSC.
- **MIDI**: Connect MIDI controllers to trigger slide changes or OBS transitions directly from your hardware.
- **Audio**: Connect microphones to broadcast FFT frequency data or use the **STT Transcriber** for local captions.

## Developer Overview

Slides Studio is built as an Obsidian plugin with a modern TypeScript architecture.

### Architecture
- **Core (`src/main.ts`)**: Manages the plugin lifecycle, Obsidian command registration, and event orchestration.
- **Server (`src/utils/serverLogic.ts`)**: Implements a **Fastify** server that runs locally within Obsidian. It provides:
    - **REST API**: For file management, device control, and status information.
    - **Unified SSE**: A single stream at `/api/events` for system-wide status and monitor data.
    - **WebSocket Servers**: Individual servers for high-frequency hardware communication (OSC, MIDI, UVC).
- **Device Management**:
    - **OSC (`src/utils/oscLogic.ts`)**: Bidirectional communication via `node-osc`.
    - **MIDI (`src/utils/midiLogic.ts`)**: Hardware interaction via `webmidi`.
    - **Audio (`src/utils/audioLogic.ts`)**: FFT analysis and microphone stream management.

### Documentation
API and code-level documentation can be generated using:
```bash
npm run doc
```
The output will be available in the `/docs` directory.

## WebSockets

High-frequency hardware data is handled via dedicated WebSocket servers to ensure maximum performance and isolation from the main SSE stream.

| Device Type | Connection Pattern | Description |
| :--- | :--- | :--- |
| **OSC** | `ws://localhost:PORT` | One server per device (configured via `wsPort`). |
| **MIDI** | `ws://localhost:PORT` | One server per device (configured via `wsPort`). |
| **UVC** | `ws://localhost:PORT` | Single server for all UVC commands (configured via global `uvcWsPort`). |

### WebSocket Example (JavaScript)
```javascript
// Consuming MIDI data from a specific device
const ws = new WebSocket('ws://localhost:59000');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(`MIDI from ${data.deviceName}:`, data.message);
};
```

## Server-Sent Events (SSE)

The unified stream at `/api/events` broadcasts system activity and monitor data. Use `eventSource.addEventListener(eventName, ...)` to listen for specific topics.

| Event Name | Description |
| :--- | :--- |
| `audioData` | FFT frequency arrays (`fft`) or STT transcriptions (`stt`). |
| `mousePosition`, `mouseClick` | Real-time global mouse tracking data. |
| `keyboardPress`, `keyboardRelease`| Real-time global keyboard monitoring. |
| `ConnectionOpened`, `Identified`| OBS WebSocket connection status events. |
| `CustomEvent` | Dynamic OBS events or custom messages from `/api/custom/message`. |

## Server Routes (REST)

### File Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/file/list?folder=...` | List all JSON files in a specific folder. |
| `GET` | `/api/file/get?folder=...&filename=...` | Retrieve the contents of a JSON file. |
| `POST` | `/api/file/save` | Save data to a JSON file. |

### Device Control & STT
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/osc/send` | Send an OSC message. |
| `POST` | `/api/midi/send` | Send a MIDI message. |
| `POST` | `/api/stt/result` | Post transcription results from worker. |
| `GET` | `/api/audio/stt-devices` | List configured STT audio devices. |

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

## Installation

1. Download the latest release.
2. Place the contents in your vault's `.obsidian/plugins/slides-studio` folder.
3. Enable the plugin in Obsidian settings.
---

- MIT licensed | Copyright © 2025 Jonathan Wood
