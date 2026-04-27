# Slides Studio (for Obsidian)

Slides Studio is the perfect companion for presenting Reveal.js slides with [Obsidian](https://obsidian.md) and [Open Broadcast Studio](https://obsproject.com/).

> [!IMPORTANT]
> This project was developed and enhanced using the **Gemini CLI** agent.

## Features

- **OBS Synchronization**: Automatically sync slide changes in Obsidian with OBS scene changes.
- **Smart Tags**: Use slide tags to trigger complex OBS actions, camera transitions, and layout changes.
- **Integrated Server**: A built-in Fastify server enables communication between Obsidian, OBS, and external devices.
- **Real-time Control**: Low-latency support for MIDI, OSC, and AI vision via a unified WebSocket architecture.
- **On-Device Speech-to-Text**: Local, privacy-first transcription using Chrome's experimental Web Speech API (Chrome 142+).

## Usage

### 1. Connecting to OBS
- Ensure [obs-websocket](https://github.com/obsproject/obs-websocket) is installed and enabled in OBS.
- Configure your IP, Port, and Password in Slides Studio settings.
- Use the `Connect OBS` command to establish the link.

### 2. Presentation Setup
- Create your Reveal.js content using tools like **Advanced Slides** (formerly Slides Extended) or other Reveal.js generators. Slides Studio is fully independent and works with any standard Reveal.js slide deck.
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
    - **Unified WebSocket**: A single endpoint at `/websocket/` for system-wide status, hardware data, and AI vision landmarks.
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

All real-time data flows through a unified WebSocket server to ensure maximum performance and low-latency interaction between Obsidian and external clients.

### Connection
**Endpoint**: `ws://localhost:59000/websocket/`

### Usage Pattern (JavaScript)
```javascript
import { create } from './lib/slides-studio-client.js';

const socket = create({ port: 59000 });

// Listen for connection
socket.on('connect', () => {
    console.log('Connected to Slides Studio');
    
    // Subscribe to a data channel
    socket.subscribe('mousePosition');
});

// Handle incoming data
socket.on('mousePosition', (data) => {
    console.log('Mouse at:', data.x, data.y);
});
```

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

## Interfaces

Slides Studio provides a rich set of interfaces to bridge Obsidian with external devices, software, and AI vision tasks. All real-time data flows through a unified WebSocket at `ws://localhost:59000/websocket/`.

### 1. Core Controls
| Interface | Description | APIs | Client Events | Requests |
| :--- | :--- | :--- | :--- | :--- |
| **Open OBS** | Launches OBS with specific args (collection, profile, debug). | Command: `Open OBS` | N/A | N/A |
| **Connect OBS** | Establishes plugin link to OBS WebSocket. | Command: `Connect OBS` | `ConnectionOpened`, `Identified` | `isObsConnected`, `obsRequest` |

### 2. Hardware & Device Bridges
| Interface | Query Params | REST APIs | Publish (to App) | Subscribe (from App) |
| :--- | :--- | :--- | :--- | :--- |
| **OSC** | `?name={alias}` | `POST /api/osc/send` | `osc_in_{name}` | `osc_out_{name}` |
| **MIDI** | `?name={alias}` | `POST /api/midi/send` | `midi_in_{name}` | `midi_out_{name}` |
| **Gamepad** | `?name={alias}` | N/A | `gamepad_in_{name}` | `gamepad_out_{name}` |
| **UVC** | `?name={alias}` | N/A | `uvc_in_{name}` | `uvc_out_{name}` |

### 3. Monitoring & Input
| Interface | Query Params | REST APIs | Publish (to App) |
| :--- | :--- | :--- | :--- |
| **Keyboard** | N/A | N/A | `keyboardPress`, `keyboardRelease` |
| **Mouse** | N/A | N/A | `mousePosition`, `mouseClick`, `mouseScroll` |
| **Audio FFT** | N/A | N/A | `audio_fft` |
| **STT** | N/A | `POST /api/stt/result` | `stt_result` |

### 4. Advanced Integrations
| Interface | Query Params | REST APIs | Publish (to App) |
| :--- | :--- | :--- | :--- |
| **Shortcuts** | `?id={reqId}`* | `POST /api/shortcuts/run` | `shortcuts_result` |
| **MediaPipe** | `?channel={task}`| N/A | `mediapipe_in_{task}` |
| **Vault Files**| N/A | `/api/file/get`, `/save` | N/A |

*\* The `id` parameter is used in the macOS callback URL to route results back to the specific requester.*

### WebSocket Protocol Example
All data uses a JSON format. To receive Apple Shortcuts results, for example:
```javascript
const socket = slidesStudio.create({ port: 59000 });
socket.subscribe('shortcuts_result');
socket.on('shortcuts_result', (data) => {
    console.log('Shortcut completed:', data);
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

## Installation

1. Download the latest release.
2. Place the contents in your vault's `.obsidian/plugins/slides-studio` folder.
3. Enable the plugin in Obsidian settings.
---

- MIT licensed | Copyright © 2025 Jonathan Wood
