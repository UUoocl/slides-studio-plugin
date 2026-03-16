# Specification: `fix_speaker_view_load_20260315`

## Overview
The `slide-studio-app`'s Speaker-view (`index.html`) currently fails to successfully load and synchronize its internal iframes (`studio.html` and `teleprompter.html`). This track aims to fix the initialization sequence and SocketCluster-based signaling between these components to ensure reliable state synchronization (slides and notes).

## Functional Requirements
- **Initialization Sequence**:
  - The "current slide" frame (`index.html` within its own context or a designated child) must successfully gather all slide data attributes from the Reveal.js deck upon loading.
  - This data must be transmitted to the `studio` iframe to populate its management table (Tabulator).
- **Real-time Synchronization**:
  - When navigating to a slide with speaker notes, the "current slide" frame must broadcast these notes to the `teleprompter` iframe via SocketCluster.
- **SocketCluster Integration**:
  - All iframes must successfully connect to the running SocketCluster server.
  - Required channels for slide data and note synchronization must be created and subscribed to correctly.

## Non-Functional Requirements
- **Environment Compatibility**: The fix must ensure consistent behavior in both the Obsidian plugin environment and standard web browsers.
- **Robustness**: The loading process should handle potential timing issues between frame initialization and SocketCluster availability.

## Acceptance Criteria
- [ ] The `studio` iframe successfully receives and displays slide data from the main deck.
- [ ] The `teleprompter` iframe updates in real-time when a slide with speaker notes is active.
- [ ] No console errors related to SocketCluster connection or frame-to-frame messaging during the load process.
- [ ] The Speaker-view loads reliably in both Obsidian and Chrome.

## Out of Scope
- Adding new features to the `studio` or `teleprompter` beyond their core synchronization logic.
- Performance optimization of the Reveal.js deck itself.
