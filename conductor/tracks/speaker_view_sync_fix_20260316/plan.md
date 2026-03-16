# Implementation Plan: Speaker-View to Slide-View Sync Fix

## Phase 1: Analysis & Setup
- [x] Task: Analyze current `speaker-view` (`slide-studio-app/index.html`) and `studio.html` logic for deck loading and navigation.
- [x] Task: Analyze current `slide-view` (`slide-studio-app/slide_view/slides_studio_slide_view.html`) logic for receiving state.
- [x] Task: Verify SocketCluster client is available and configured in both views.
- [x] Task: Conductor - User Manual Verification 'Analysis & Setup' (Protocol in workflow.md)

## Phase 2: SocketCluster Channel Implementation
- [x] Task: Define the SocketCluster channel name (e.g., `slides-studio:sync`). [ca4a8e5]
- [x] Task: Write failing tests for a new `SyncService` (or similar) that handles publishing and subscribing to slide state. [ca4a8e5]
- [x] Task: Implement `SyncService` to handle state broadcasting (URL, horizontal index, vertical index). [ca4a8e5]
- [ ] Task: Conductor - User Manual Verification 'SocketCluster Channel Implementation' (Protocol in workflow.md)

## Phase 3: Speaker-View Updates
- [ ] Task: Write failing tests for `speaker-view` to ensure it publishes state when a deck is loaded or navigated.
- [ ] Task: Update `studio.html` to publish navigation events to the `SyncService`.
- [ ] Task: Update `speaker-view` to publish deck URL changes to the `SyncService`.
- [ ] Task: Conductor - User Manual Verification 'Speaker-View Updates' (Protocol in workflow.md)

## Phase 4: Slide-View Updates
- [ ] Task: Write failing tests for `slide-view` to ensure it reacts to incoming `SyncService` messages.
- [ ] Task: Update `slide-view` to subscribe to the `SyncService` channel.
- [ ] Task: Implement logic in `slide-view` to reload the deck URL if it differs from the current one.
- [ ] Task: Implement logic in `slide-view` to navigate to the correct horizontal/vertical indices.
- [ ] Task: Conductor - User Manual Verification 'Slide-View Updates' (Protocol in workflow.md)

## Phase 5: Verification & Finalization
- [ ] Task: Perform manual verification of the end-to-end sync between `speaker-view` and `slide-view`.
- [ ] Task: Ensure code coverage for new logic is >80%.
- [ ] Task: Final code cleanup and documentation update.
- [ ] Task: Conductor - User Manual Verification 'Verification & Finalization' (Protocol in workflow.md)
