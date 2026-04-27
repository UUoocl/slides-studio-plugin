# Technical Specification: Slides Studio Plugin

## Overview
Slides Studio is an Obsidian plugin that transforms Obsidian into a powerful presentation studio. It integrates a local web server, real-time messaging, and hardware monitoring to drive interactive slide decks (Reveal.js) and overlays.

## System Architecture

### 1. Fastify Web Server (`ServerManager.ts`)
The heart of the plugin is a Fastify instance that provides:
- **Static File Server**: Serves the plugin's `lib`, `apps`, and `slide-studio-app` folders, as well as the Obsidian vault root.
- **WebSocket Gateway**: A native WebSocket server mounted at `/socketcluster/`.
- **API Endpoints**: 
    - `/api/stt/result`: Receives speech-to-text results.
    - `/api/obswss`: Provides OBS WebSocket connection details.
    - `/api/file/save`: Allows apps to save files back to the vault.

### 2. Messaging Protocol
The system uses a custom Pub/Sub and RPC protocol over native WebSockets.
- **Channels**: Standard channels include `mousePosition`, `keyboardPress`, `midi_in_*`, `osc_in_*`, `obsEvents`, and `studio_to_currentSlide`.
- **Broadcasts**: The server automatically re-broadcasts `publish` messages to all clients subscribed to the target channel.

### 3. Integrated Components

#### OBS Proxy (`obsApiProxy.js`)
A client-side library that routes OBS-WebSocket requests through the plugin's WebSocket server. This allows browser-based overlays to interact with OBS without needing a direct connection or knowing the OBS password.

#### Python Monitors
Background processes that capture system-level events and pipe them into the WebSocket server:
- **Mouse Monitor**: Tracks position, clicks, and scrolls.
- **Keyboard Monitor**: Tracks key combinations and shortcuts.
- **UVC Bridge**: Provides bidirectional control of USB cameras (Pan/Tilt/Zoom).

#### Hardware Managers
- **MIDI Manager**: Handles discovery and message routing for MIDI controllers.
- **OSC Manager**: Handles UDP-to-WebSocket bridging for Open Sound Control devices.

## Core Data Flows
1. **Input**: A hardware event (MIDI/OSC) or system event (Mouse/Keyboard) is captured.
2. **Ingress**: The manager or Python script sends a `publish` message to the WebSocket server.
3. **Distribution**: The `ServerManager` broadcasts the message to all subscribed browser apps or other monitors.
4. **Action**: An app (e.g., `rule_engine`) receives the message and triggers an effect, such as an OBS scene change via `obsWss.call()`.

## Directory Structure
- `/src/`: TypeScript source for the Obsidian plugin.
- `/apps/`: Collection of specialized web tools and overlays.
- `/slide-studio-app/`: The main presenter view and studio dashboard.
- `/pythonScripts/`: Native bridges for system-level monitoring.
- `/lib/`: Shared client-side libraries (`slides-studio-client.js`, `obsApiProxy.js`).
