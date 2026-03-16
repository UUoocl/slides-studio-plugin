# Specification: Speaker-View to Slide-View Sync Fix

## Overview
This track addresses a synchronization issue between the `speaker-view` (the main presentation controller) and the `slide-view` (the audience-facing display) within the `slides-studio-app`. The goal is to ensure that when a slide deck is selected or navigated in the `speaker-view`, the `slide-view` automatically updates to reflect the same deck and slide index.

## Functional Requirements
1.  **Deck Synchronization**: When a new slide deck is loaded in the `speaker-view`, the `slide-view` (`slide-studio-app/slide_view/slides_studio_slide_view.html`) must automatically reload to the same URL.
2.  **Navigation Synchronization**: All slide navigation commands (next, previous, go to index) from the `studio.html` frame in `speaker-view` must be communicated to the `slide-view`.
3.  **Communication Protocol**: Use SocketCluster channels to publish and subscribe to slide state changes (deck URL, current horizontal/vertical indices).
4.  **Source of Truth**: The `speaker-view`'s `studio.html` frame is the primary source of navigation commands.

## Non-Functional Requirements
- **Low Latency**: Slide transitions should appear synchronized with minimal delay.
- **Reliability**: The `slide-view` should recover if the SocketCluster connection is briefly interrupted.

## Acceptance Criteria
- [ ] Selecting a new deck in `speaker-view` causes `slide-view` to load the same deck.
- [ ] Navigating slides in `speaker-view` (via `studio.html`) causes `slide-view` to navigate to the same slide.
- [ ] The `slide-view` correctly handles initial state if it connects after the deck has already been loaded.

## Out of Scope
- Direct navigation from the `slide-view` itself.
- Changes to the OBS websocket integration for these specific views (unless required for state).
