# Track Specification: Migrate messaging system to SocketCluster

## Objective
The primary goal of this track is to consolidate and modernize the project's real-time messaging infrastructure by migrating from SSE (Server-Sent Events) and disparate WebSocket implementations to a unified **SocketCluster** architecture. This will provide a more robust, low-latency, and scalable foundation for system-wide communication between Obsidian, OBS, external hardware, and creative coding overlays.

## Scope
- **Server-side**: Integrate SocketCluster into the existing Fastify server within the Obsidian plugin.
- **Client-side (HTML Apps)**: Update `slide-studio-app` and various overlays/monitors in `apps/` to use the SocketCluster client.
- **Python Bridges**: Modify the Python-based input monitors (Mouse, Keyboard, UVC) to communicate with the system via SocketCluster channels.
- **Protocol Consolidation**: Replace legacy SSE topics and individual WebSocket endpoints with organized SocketCluster channels (e.g., `audio`, `input`, `obs`).

## Architecture Changes
- **Unified Hub**: SocketCluster will serve as the central message bus for all high-frequency data.
- **Channel-based Communication**: Move from generic streams to specific, discoverable channels.
- **Bidirectional Support**: Leverage SocketCluster's native support for complex bidirectional interactions.

## Client Identification & Monitoring
- **Named Clients**: Every client (HTML app, Python script, or plugin component) must provide a unique name upon connection to the SocketCluster server.
- **Traceability**: This name will be used by the server to identify, monitor, and log client activity, facilitating easier debugging and system health checks.
- **Dynamic Registration**: Clients should ideally pass their identification as part of the initial handshake or connection metadata.

## Authentication
- **Localhost Focus**: As a localhost-based Obsidian plugin, the system assumes a trusted environment.
- **Minimal Requirements**: For the initial implementation, minimal or no authentication is required for client connections. This simplifies integration for creative coding overlays and local hardware bridges while maintaining compatibility with the existing trust model.

## Key Considerations
- **Backward Compatibility**: Ensure that existing OBS workflows are maintained during the transition.
- **Performance**: Maintain or improve the low-latency requirements for hardware-level events (MIDI, OSC).
- **Ease of Use**: Provide clear patterns for users to create their own reactive overlays using the new messaging system.
