# Specification: Fix Python Input Monitors Connectivity

## Overview
This track addresses a bug where the Python-based keyboard and mouse monitors fail to send messages to the SocketCluster server, despite logging a "CONNECTED" status. These scripts appear to be crashing silently or losing their connection immediately after initialization, and their logs are incorrectly labeled as errors in the Obsidian console.

## Problem Analysis
- **Connectivity**: Scripts log `INFO:CONNECTED` but do not appear in the SocketCluster Monitor.
- **Messaging**: No input events are transmitted.
- **Logging**: Standard informational logs from Python are being captured by the plugin's stderr listener, causing misleading `ERR` labels in Obsidian.
- **Lifecycle**: Potential silent crashes after the initial connection log.

## Functional Requirements
- **Stable Connection**: Python scripts must maintain a persistent connection to `ws://127.0.0.1:59000/socketcluster/` (or the configured port).
- **Event Transmission**: Successfully capture and transmit:
    - Mouse: Position, clicks, and scroll events.
    - Keyboard: Single keys and key combinations.
- **Improved Logging**: Differentiate between informational logs and actual errors.
- **Reliable Lifecycle**: The scripts must handle server-side disconnections gracefully and restart/reconnect if needed.

## Non-Functional Requirements
- **Log Clarity**: Logs in the Obsidian console should reflect the actual severity level.
- **Latency**: Input event transmission should be low-latency to support real-time automation.

## Acceptance Criteria
- [ ] Keyboard Monitor appears as a client in the SocketCluster Monitor app.
- [ ] Mouse Monitor appears as a client in the SocketCluster Monitor app.
- [ ] Pressing keys or moving the mouse triggers real-time message updates in the monitor.
- [ ] The Obsidian console no longer shows `ERR: INFO:CONNECTED` for successful connections.
- [ ] Scripts remain running and connected for the duration of the session.

## Out of Scope
- Rewriting the monitoring logic in Node.js (sticking with Python).
- Adding new monitoring features (focusing on fixing existing ones).
