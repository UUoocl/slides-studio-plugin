# Track Implementation Plan: Migrate messaging system to SocketCluster

## Phase 1: Server Setup & Core Integration
- [ ] Task: Integrate SocketCluster into Fastify
    - [ ] Install/verify SocketCluster dependencies.
    - [ ] Configure the SocketCluster server within `src/utils/serverLogic.ts`.
    - [ ] Implement initial authentication and connection handling.
- [ ] Task: Define Core Channels
    - [ ] Map existing SSE topics and WebSocket endpoints to SocketCluster channels.
    - [ ] Implement a system-wide broadcasting utility for the new architecture.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Server Setup & Core Integration' (Protocol in workflow.md)

## Phase 2: Client Migration (HTML Apps)
- [ ] Task: Update Slide Studio App
    - [ ] Update `slide-studio-app/lib/sc-connection.js` (or equivalent) to the new protocol.
    - [ ] Verify slide state synchronization via SocketCluster.
- [ ] Task: Update Overlays and Monitors
    - [ ] Migrate `apps/audio_monitor/`, `apps/mouse_monitor/`, and other critical tools.
    - [ ] Ensure `p5.js` and `cables.gl` integrations are updated to the new client.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Client Migration (HTML Apps)' (Protocol in workflow.md)

## Phase 3: Device Bridge Migration (Python)
- [ ] Task: Update Python SocketCluster Integration
    - [ ] Implement or update a SocketCluster client in the Python bridge system.
    - [ ] Modify `mouse_monitor.py` and `keyboard_monitor.py` to publish events to their respective channels.
    - [ ] Update `uvc_util_bridge.py` for bidirectional camera control.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Device Bridge Migration (Python)' (Protocol in workflow.md)

## Phase 4: Cleanup & Final Verification
- [ ] Task: Decommission Legacy Protocols
    - [ ] Remove SSE routes from the Fastify server.
    - [ ] Close and remove legacy WebSocket server implementations.
- [ ] Task: End-to-End Integration Testing
    - [ ] Verify complete data flow from hardware (MIDI/OSC) through the server to reactive overlays.
    - [ ] Perform performance benchmarking for low-latency events.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Cleanup & Final Verification' (Protocol in workflow.md)
