# Track Implementation Plan: Migrate messaging system to SocketCluster

## Phase 1: Server Setup & Core Integration [checkpoint: e31be5c]
- [x] Task: Integrate SocketCluster into Fastify [7609e2b]
    - [x] Install/verify SocketCluster dependencies.
    - [x] Configure the SocketCluster server within `src/utils/serverLogic.ts`.
    - [x] Implement initial connection handling (minimal/no authentication for localhost).
    - [x] Implement client identification mechanism (clients provide a name on connection).
- [x] Task: Define Core Channels [493fa65]
    - [x] Map existing SSE topics and WebSocket endpoints to namespaced flat SocketCluster channels (e.g., `mousePosition`, `osc_in_Device`).
    - [x] Implement a system-wide broadcasting utility for the new architecture.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Server Setup & Core Integration' (Protocol in workflow.md) [e31be5c]

## Phase 2: Client Migration (HTML Apps) [checkpoint: 96b0b68]
- [x] Task: Update Slide Studio App [77df18e]
    - [x] Update `slide-studio-app/lib/sc-connection.js` (or equivalent) to the new protocol with client naming.
    - [x] Verify slide state synchronization via SocketCluster using flat naming.
- [x] Task: Update Overlays and Monitors [c67a1b9]
    - [x] Migrate `apps/audio_monitor/`, `apps/mouse_monitor/`, and other critical tools, providing unique client names and using namespaced flat channels.
    - [x] Ensure `p5.js` and `cables.gl` integrations are updated to the new client with unique names.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Client Migration (HTML Apps)' (Protocol in workflow.md) [96b0b68]

## Phase 3: Device Bridge Migration (Python)
- [x] Task: Update Python SocketCluster Integration [6dbe7ae]
    - [x] Implement or update a SocketCluster client in the Python bridge system with client naming.
    - [x] Modify `mouse_monitor.py` and `keyboard_monitor.py` to publish events to their respective flat channels with unique client names.
    - [x] Update `uvc_util_bridge.py` for bidirectional camera control with client naming.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Device Bridge Migration (Python)' (Protocol in workflow.md)

## Phase 4: Cleanup & Final Verification
- [ ] Task: Decommission Legacy Protocols
    - [ ] Remove SSE routes from the Fastify server.
    - [ ] Close and remove legacy WebSocket server implementations.
- [ ] Task: End-to-End Integration Testing
    - [ ] Verify complete data flow from hardware (MIDI/OSC) through the server to reactive overlays.
    - [ ] Verify all clients are correctly identified and monitored via their names in the server logs.
    - [ ] Perform performance benchmarking for low-latency events.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Cleanup & Final Verification' (Protocol in workflow.md)
