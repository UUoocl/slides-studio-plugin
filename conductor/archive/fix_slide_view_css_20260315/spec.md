# Specification: Fix Slide-View CSS Synchronization

## Overview
This track addresses a bug in the `slide-view` component where CSS transitions fail to trigger upon receiving an OBS scene change message via SocketCluster. The `slide-view`, running as an OBS overlay, should move its iframe based on the CSS class derived from the current OBS scene name.

## Functional Requirements
1.  **Message Reception**: `slide-view` (`slide-studio-app/slide_view/slides_studio_slide_view.html`) must reliably receive scene change messages from the SocketCluster channel.
2.  **Scene Parsing**: Correctly parse the OBS scene name to extract the intended CSS class.
3.  **CSS Application**: Apply the extracted CSS class to the iframe container to trigger the layout change (e.g., moving or resizing the slide deck).
4.  **Integration**: Ensure compatibility with the speaker-view tabulator table which acts as the primary controller.

## Non-Functional Requirements
- **Performance**: Transitions should be low-latency to maintain professional production quality in OBS.

## Acceptance Criteria
- [ ] Navigating slides in the speaker-view tabulator table correctly triggers a CSS update in the `slide-view`.
- [ ] The `slide-view` iframe moves and resizes according to the CSS layout defined for the target OBS scene.

## Out of Scope
- Modifying the tabulator table logic in the speaker-view.
- General Reveal.js navigation bugs.
