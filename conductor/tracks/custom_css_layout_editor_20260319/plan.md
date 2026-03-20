# Implementation Plan: Custom CSS Layout Editor

## Phase 1: Setup and File Corrections [checkpoint: a4975ed]
- [x] Task: Rename and Update `iframe_positions.css`
    - [x] Rename `slide-studio-app/css/iframe_positions.css` to `slide-studio-app/css/iframe_positions.css`.
    - [x] Update imports/references in all HTML files within `slide-studio-app/` and any other references across the project.
- [x] Task: Conductor - User Manual Verification 'Setup and File Corrections' (Protocol in workflow.md)

## Phase 2: Custom Layout Editor App UI [checkpoint: 3a15668]
- [x] Task: Create Editor UI Structure
    - [x] Create `apps/layout_editor/index.html` with basic HTML structure.
    - [x] Create `apps/layout_editor/styles.css` for the editor layout (sidebar for controls, main area for preview).
    - [x] Create `apps/layout_editor/app.js` to handle UI initialization.
- [x] Task: Implement Layout Controls
    - [x] Add input fields for Parent Window Width/Height in the UI.
    - [x] Add an interactive "Slide Iframe" preview area that supports drag-to-move and resize interactions.
    - [x] Add input controls (sliders/text fields) for: `top`, `left`, `width`, `height`, `z-index`, `aspect-ratio`, `object-fit`, `opacity`, `transform` (scale/rotate/skew), `border-radius`, `box-shadow`, `mix-blend-mode`.
    - [x] Implement event listeners in `app.js` to bind UI control changes to the preview iframe's live CSS styles.
    - [x] UI Polish: Scale parent-preview to fit and align left in the visible window.
- [x] Task: Conductor - User Manual Verification 'Custom Layout Editor App UI' (Protocol in workflow.md)

## Phase 3: Persistence and Storage [checkpoint: 4d329b6]
- [x] Task: Implement Save/Load Logic
    - [x] Write unit tests for JSON serialization and parsing logic in a new `apps/layout_editor/app.test.js`.
    - [x] Add a "Layout Name" text input and "Save Layout" button to the UI.
    - [x] Implement logic in `app.js` to gather current CSS properties from the UI and serialize them into a JSON object.
    - [x] Implement API calls (using the plugin's Fastify server or SocketCluster bridge) to read/write the JSON object to `apps/slide-studio-app/layouts.json`.
- [x] Task: Conductor - User Manual Verification 'Persistence and Storage' (Protocol in workflow.md)

## Phase 4: Slide Navigation and Triggering (`studio.html`)
- [x] Task: Update `studio.html` Logic
    - [x] Write unit tests for the utility function that parses the layout name from the OBS Scene name (e.g., extracting "SideBySide" from "Slides-SideBySide").
    - [x] Modify the slide navigation event handler in `studio.html` to execute when a new tabulator row becomes active.
    - [x] Implement logic to determine the active OBS Scene name from the tabulator row data, parse the layout name, and load the corresponding layout definition from `layouts.json`.
    - [x] Implement SocketCluster broadcast of a new `apply-custom-layout` event containing the CSS properties payload.
- [x] Task: Conductor - User Manual Verification 'Slide Navigation and Triggering' (Protocol in workflow.md)

## Phase 5: Slide View Application (`slide_view`)
- [x] Task: Update `slide_view` Logic
    - [x] Modify `slide-studio-app/slide_view/slides_studio_slide_view.html` to listen for the `apply-custom-layout` SocketCluster event.
    - [x] Implement logic to receive the CSS properties payload and dynamically apply them to the slide iframe's inline styles or update a dynamic `<style>` block.
- [x] Task: Conductor - User Manual Verification 'Slide View Application' (Protocol in workflow.md)
