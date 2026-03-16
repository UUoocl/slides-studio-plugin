# Implementation Plan: Speaker-View to Slide-View Sync Fix

## Phase 1: Analysis & Setup
- [x] Task: Analyze current `speaker-view` (`slide-studio-app/index.html`) and `studio.html` logic for deck loading and navigation.
- [x] Task: Analyze current `slide-view` (`slide-studio-app/slide_view/slides_studio_slide_view.html`) logic for receiving state.
- [x] Task: Verify SocketCluster client is available and configured in both views.
- [x] Task: Conductor - User Manual Verification 'Analysis & Setup' (Protocol in workflow.md)

## Phase 2: SocketCluster Channel Implementation [checkpoint: 9092177]
- [x] Task: Define the SocketCluster channel name (e.g., `slides-studio:sync`). [ca4a8e5]
- [x] Task: Write failing tests for a new `SyncService` (or similar) that handles publishing and subscribing to slide state. [ca4a8e5]
- [x] Task: Implement `SyncService` to handle state broadcasting (URL, horizontal index, vertical index). [ca4a8e5]
- [x] Task: Conductor - User Manual Verification 'SocketCluster Channel Implementation' (Protocol in workflow.md)

## Phase 3: Speaker-View Updates
- [x] Task: Write failing tests for `speaker-view` to ensure it publishes state when a deck is loaded or navigated. [2f1feec]
- [x] Task: Update `studio.html` to publish navigation events to the `SyncService`. [2f1feec]
- [x] Task: Update `speaker-view` to publish deck URL changes to the `SyncService`. [2f1feec]
- [ ] Task: Conductor - User Manual Verification 'Speaker-View Updates' (Protocol in workflow.md)

## Phase 4: Slide-View Updates
- [x] Task: Write failing tests for `slide-view` to ensure it reacts to incoming `SyncService` messages. [2f1feec]
- [x] Task: Update `slide-view` to subscribe to the `SyncService` channel. [2f1feec]
- [x] Task: Implement logic in `slide-view` to reload the deck URL if it differs from the current one. [2f1feec]
- [x] Task: Implement logic in `slide-view` to navigate to the correct horizontal/vertical indices. [2f1feec]
- [ ] Task: Conductor - User Manual Verification 'Slide-View Updates' (Protocol in workflow.md)

## Phase 5: Verification & Finalization
- [x] Task: Perform manual verification of the end-to-end sync between `speaker-view` and `slide-view`. [2f1feec, 008bfe4]
- [x] Task: Ensure code coverage for new logic is >80%. [7561]
- [x] Task: Final code cleanup and documentation update.
- [x] Task: Conductor - User Manual Verification 'Verification & Finalization' (Protocol in workflow.md)
