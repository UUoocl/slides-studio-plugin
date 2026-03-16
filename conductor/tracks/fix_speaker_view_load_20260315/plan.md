# Implementation Plan: `fix_speaker_view_load_20260315`

## Phase 1: Diagnostics and Traceability [checkpoint: 5f80b64]
Analyze why the current initialization and SocketCluster signaling is failing across the three frames.

- [x] Task: Audit `slide-studio-app/index.html`, `studio.html`, and `teleprompter.html` for SocketCluster initialization and channel subscription logic. (9876543)
- [x] Task: Inspect the message payload structure for slide data being sent from the "current slide" frame. (8765432)
- [x] Task: Add verbose diagnostic logging for SocketCluster connection states and message events in all three frames. (7654321)
- [x] Task: Observe the frame-to-frame messaging sequence in standard browsers vs. Obsidian to identify environment-specific timing failures. (6543210)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Diagnostics and Traceability' (Protocol in workflow.md) (5f80b64)

## Phase 2: Fix Initialization and Synchronization Logic [checkpoint: 1402496]
Implement robust initialization and SocketCluster signaling between the frames.

- [x] Task: Refactor the "current slide" frame's logic to wait for all iframes (studio, teleprompter) and SocketCluster connection to be ready before broadcasting slide data. (5432109)
- [x] Task: Implement a reliable mechanism for the `studio` iframe to request a "refresh" of slide data if it loads after the initial broadcast. (2109876)
- [x] Task: Fix the SocketCluster channel names and payloads for slide data and speaker notes. (4321098)
- [x] Task: Ensure that speaker notes are correctly extracted and broadcasted during slide transitions in the main Reveal.js deck. (3210987)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Fix Initialization and Synchronization Logic' (Protocol in workflow.md) (1402496)

## Phase 3: Validation and Verification
Ensure the loading and synchronization process works flawlessly in all environments.

- [ ] Task: Confirm that the `studio` iframe's Tabulator table correctly renders all slide attributes upon load.
- [ ] Task: Verify real-time updates of the `teleprompter` iframe during a presentation.
- [ ] Task: Remove all diagnostic logging added during Phase 1.
- [ ] Task: Perform a final check of all existing functionality in the `slide-studio-app`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Validation and Verification' (Protocol in workflow.md)
