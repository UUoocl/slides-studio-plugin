# Implementation Plan: Fix Python Input Monitors Connectivity

## Phase 1: Diagnosis and Manual Verification
- [x] Task: Manually execute `pythonScripts/keyboard_monitor.py` and `pythonScripts/mouse_monitor.py` from the terminal. ae9b48d
    - [x] Identify if the scripts crash or log errors when run outside of Obsidian. ae9b48d
    - [x] Verify the SocketCluster connection status in the monitor when run manually. ae9b48d
- [x] Task: Inspect `src/utils/serverLogic.ts` (or relevant server code) to check how the plugin handles script output streams. ae9b48d
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Diagnosis and Manual Verification' (Protocol in workflow.md)

## Phase 2: Stabilize Python Connectivity
- [x] Task: Update `keyboard_monitor.py` and `mouse_monitor.py` to use robust connection handling. ae9b48d
    - [x] **Write Tests**: Create a small Python test suite to mock the SocketCluster server and verify connection/retry logic. ae9b48d
    - [x] **Implement**: Add heartbeats or auto-reconnect logic to the Python SocketCluster client. ae9b48d
- [x] Task: Fix the silent crash issue identifying the root cause (e.g., missing dependencies, unhandled exceptions in the event loop). ae9b48d
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Stabilize Python Connectivity' (Protocol in workflow.md)

## Phase 3: Optimize Logging and Lifecycle
- [x] Task: Redirect standard informational logs to `stdout` instead of `stderr` in the Python scripts. ae9b48d
- [x] Task: Update the Obsidian plugin's script runner to distinguish between `stdout` (INFO) and `stderr` (ERR). ae9b48d
- [x] Task: **Write Tests**: Add integration tests in Vitest to verify that the plugin correctly identifies script connection status. ae9b48d
- [x] Task: **Implement**: Ensure the plugin correctly logs script info without the `ERR` prefix unless a real error occurs. ae9b48d
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Optimize Logging and Lifecycle' (Protocol in workflow.md)

## Phase 4: Final Verification
- [x] Task: Verify both monitors appear in the SocketCluster Monitor app concurrently. ae9b48d
- [x] Task: Confirm real-time data flow for all configured input types (keys, clicks, moves). ae9b48d
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions b27fc43
