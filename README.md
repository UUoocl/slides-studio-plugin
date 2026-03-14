# Slides Studio (for Obsidian)

Slides Studio is a powerful, unified OBS control hub integrated directly into Obsidian. It serves as a sophisticated bridge between live presentations, streaming software, and hardware controllers, designed for live streamers, educators, and power users who want professional-grade production control from their notes.

> [!IMPORTANT]
> This project was developed and enhanced using the **Gemini CLI** agent and follows a spec-driven development workflow via **Conductor**.

## Features

- **Slide Syncing**: Seamless, real-time synchronization between Obsidian slide changes and OBS scene transitions.
- **Smart Automation**: A robust automation engine. Beyond custom slide tags, it features a dynamic **Rule Engine** that monitors any system channel and triggers sequences of delayed actions.
- **Hardware Bridging**: Low-latency, bidirectional communication with external devices via MIDI, OSC, and UVC.
- **Unified Real-time Messaging**: Powered by **SocketCluster** for high-performance, system-wide event streaming.
- **Integrated Presentation App**: A built-in Reveal.js environment (`slide-studio-app`) for professional slide delivery and real-time state management.
- **On-Device Speech-to-Text**: Local, privacy-first transcription using Chrome's experimental Web Speech API.

## Usage

### 1. Connecting to OBS
- Ensure [obs-websocket](https://github.com/obsproject/obs-websocket) is installed and enabled in OBS.
- Configure your IP, Port, and Password in Slides Studio settings.
- Use the `Connect OBS` command to establish the link.

### 2. Rule Engine & Automation
- Launch the **Rule Engine** from the Apps Gallery.
- Create rules to bridge protocols (e.g., MIDI button -> OBS scene change).
- Supports advanced matching (Regex, Wildcard) and sequential actions with delays.

### 3. External Devices
- **OSC**: Configure input/output ports to bridge Obsidian with software like TouchOSC.
- **MIDI**: Connect controllers to trigger slide changes or OBS transitions directly from hardware.
- **Input Monitoring**: Automated tracking of global mouse and keyboard events via integrated Python monitors.

## Developer Overview

### Architecture
- **Core (`src/main.ts`)**: Manages the plugin lifecycle and Obsidian integration.
- **Fastify Server**: Handles REST routes for file persistence and serving frontend apps.
- **SocketCluster Server**: The central hub for all real-time communication.
- **Python Bridge**: Used for global input monitoring where native Node.js support is limited.

### Real-time Communication (SocketCluster)
The system has transitioned from legacy SSE to a unified **SocketCluster** architecture. All devices, monitors, and frontend apps connect to the central hub.

#### Key Channels
| Channel | Description |
| :--- | :--- |
| `custom_slidesCommands` | Global slide state and orchestration commands. |
| `obsEvents` | Real-time event stream from the OBS WebSocket server. |
| `serverState` | System-wide status and connected client discovery. |
| `keyboardPress`, `mousePosition` | Global input monitor data. |
| `midi_in_<name>`, `osc_in_<name>` | Incoming hardware messages from bridged devices. |

#### Example: Consuming Data (JavaScript)
```javascript
import { create } from './lib/socketcluster-client.min.js';

const socket = create({ hostname: 'localhost', port: 57000, path: '/socketcluster/' });
const channel = socket.subscribe('custom_slidesCommands');

(async () => {
    for await (let data of channel) {
        console.log('Slide Command:', data.eventName, data.msgParam);
    }
})();
```

## Server Routes (REST)

The REST API is primarily used for configuration and persistence.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/file/list?folder=...` | List JSON files in a vault folder. |
| `GET` | `/api/file/get?folder=...&filename=...` | Retrieve contents of a JSON file. |
| `POST` | `/api/file/save` | Save data to a JSON file in the vault. |
| `POST` | `/api/osc/send` | Send an OSC message to a configured device. |
| `POST` | `/api/midi/send` | Send a MIDI message. |

## Installation

1. Download the latest release.
2. Place the contents in your vault's `.obsidian/plugins/slides-studio` folder.
3. Enable the plugin in Obsidian settings.

---

- MIT licensed | Copyright © 2025 Jonathan Wood
