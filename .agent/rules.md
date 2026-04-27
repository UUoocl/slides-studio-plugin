# Project Rules: Slides Studio Plugin

Guidelines for developers and AI agents working on the Slides Studio Obsidian plugin.

## 1. Core Architecture
- **Web Server**: Use **Fastify** for all HTTP and static file serving.
- **Real-time Messaging**: Use **Native WebSockets** via `@fastify/websocket`. 
- **SocketCluster is Deprecated**: Do NOT use or re-introduce SocketCluster or its client libraries.
- **Port Management**: The server must run on a single port (default `57000`), handling both HTTP and WebSocket connections.

## 2. Networking & Security
- **Local Only**: The server MUST only listen on `127.0.0.1` for security.
- **CORS & CSP**: Always maintain permissive CORS (`*`) and loose CSP headers for the static server to allow iframes and external assets (MediaPipe, etc.) to function correctly.
- **X-Frame-Options**: Must be set to `ALLOWALL` to support embedding in Obsidian and other tools.

## 3. WebSocket Protocol
All communication over WebSocket must follow the custom JSON protocol:

### Outgoing (Client -> Server)
- `{"type": "subscribe", "channel": "string"}`: Join a topic.
- `{"type": "unsubscribe", "channel": "string"}`: Leave a topic.
- `{"type": "publish", "channel": "string", "data": any}`: Broadcast data to a channel.
- `{"type": "call", "id": "string", "method": "string", "data": any}`: Execute a procedure call.

### Incoming (Server -> Client)
- `{"type": "event", "channel": "string", "data": any}`: Published data from a channel.
- `{"type": "response", "id": "string", "data": any, "error": "string"}`: Result of a `call`.

## 4. Client Libraries
- **Web Clients**: Use `/lib/slides-studio-client.js`. It provides a SocketCluster-like API (`subscribe`, `publish`, `invoke`, `listener`) using native WebSockets.
- **Python Clients**: Use the `websocket-client` (imported as `websocket`) library and implement the JSON protocol manually.

## 5. Development Practices
- **ES Modules**: All new JavaScript files for the web apps should be ES modules (`type="module"`).
- **TypeScript**: The core Obsidian plugin code must be written in TypeScript.
- **Static Assets**: Apps are located in `/apps/` and the main viewer in `/slide-studio-app/`. Both are served at the root of the Fastify server.
- **Python Monitors**: Located in `/pythonScripts/`. They should be managed by the `ServerManager` lifecycle.
