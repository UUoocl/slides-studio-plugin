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

## Installation

1. Download the latest release.
2. Place the contents in your vault's `.obsidian/plugins/slides-studio` folder.
3. Enable the plugin in Obsidian settings.

---

- MIT licensed | Copyright © 2025 Jonathan Wood
