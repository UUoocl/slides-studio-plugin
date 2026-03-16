# Implementation Plan: `fix_speaker_view_load_20260315`

## Phase 1: Diagnostics and Traceability
Analyze why the current initialization and SocketCluster signaling is failing across the three frames.

- [ ] Task: Audit `slide-studio-app/index.html`, `studio.html`, and `teleprompter.html` for SocketCluster initialization and channel subscription logic.
- [ ] Task: Inspect the message payload structure for slide data being sent from the "current slide" frame.
- [ ] Task: Add verbose diagnostic logging for SocketCluster connection states and message events in all three frames.
- [ ] Task: Observe the frame-to-frame messaging sequence in standard browsers vs. Obsidian to identify environment-specific timing failures.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Diagnostics and Traceability' (Protocol in workflow.md)

## Phase 2: Fix Initialization and Synchronization Logic
Implement robust initialization and SocketCluster signaling between the frames.

- [ ] Task: Refactor the "current slide" frame's logic to wait for all iframes (studio, teleprompter) and SocketCluster connection to be ready before broadcasting slide data.
- [ ] Task: Implement a reliable mechanism for the `studio` iframe to request a "refresh" of slide data if it loads after the initial broadcast.
- [ ] Task: Fix the SocketCluster channel names and payloads for slide data and speaker notes.
- [ ] Task: Ensure that speaker notes are correctly extracted and broadcasted during slide transitions in the main Reveal.js deck.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Fix Initialization and Synchronization Logic' (Protocol in workflow.md)

## Phase 3: Validation and Verification
Ensure the loading and synchronization process works flawlessly in all environments.

- [ ] Task: Confirm that the `studio` iframe's Tabulator table correctly renders all slide attributes upon load.
- [ ] Task: Verify real-time updates of the `teleprompter` iframe during a presentation.
- [ ] Task: Remove all diagnostic logging added during Phase 1.
- [ ] Task: Perform a final check of all existing functionality in the `slide-studio-app`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Validation and Verification' (Protocol in workflow.md)
