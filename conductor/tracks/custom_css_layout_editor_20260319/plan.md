# Implementation Plan: Custom CSS Layout Editor

## Phase 1: Setup and File Corrections
- [ ] Task: Rename and Update `iframe_positions.css`
    - [ ] Rename `slide-studio-app/css/iframe_positioins.css` to `slide-studio-app/css/iframe_positions.css`.
    - [ ] Update imports/references in all HTML files within `slide-studio-app/` and any other references across the project.
- [ ] Task: Conductor - User Manual Verification 'Setup and File Corrections' (Protocol in workflow.md)

## Phase 2: Custom Layout Editor App UI
- [ ] Task: Create Editor UI Structure
    - [ ] Create `apps/layout_editor/index.html` with basic HTML structure.
    - [ ] Create `apps/layout_editor/styles.css` for the editor layout (sidebar for controls, main area for preview).
    - [ ] Create `apps/layout_editor/app.js` to handle UI initialization.
- [ ] Task: Implement Layout Controls
    - [ ] Add input fields for Parent Window Width/Height in the UI.
    - [ ] Add an interactive "Slide Iframe" preview area that supports drag-to-move and resize interactions.
    - [ ] Add input controls (sliders/text fields) for: `top`, `left`, `width`, `height`, `z-index`, `aspect-ratio`, `object-fit`, `opacity`, `transform` (scale/rotate/skew), `border-radius`, `box-shadow`, `mix-blend-mode`.
    - [ ] Implement event listeners in `app.js` to bind UI control changes to the preview iframe's live CSS styles.
- [ ] Task: Conductor - User Manual Verification 'Custom Layout Editor App UI' (Protocol in workflow.md)

## Phase 3: Persistence and Storage
- [ ] Task: Implement Save/Load Logic
    - [ ] Write unit tests for JSON serialization and parsing logic in a new `apps/layout_editor/app.test.js`.
    - [ ] Add a "Layout Name" text input and "Save Layout" button to the UI.
    - [ ] Implement logic in `app.js` to gather current CSS properties from the UI and serialize them into a JSON object.
    - [ ] Implement API calls (using the plugin's Fastify server or SocketCluster bridge) to read/write the JSON object to `apps/slide-studio-app/layouts.json`.
- [ ] Task: Conductor - User Manual Verification 'Persistence and Storage' (Protocol in workflow.md)

## Phase 4: Slide Navigation and Triggering (`studio.html`)
- [ ] Task: Update `studio.html` Logic
    - [ ] Write unit tests for the utility function that parses the layout name from the OBS Scene name (e.g., extracting "SideBySide" from "Slides-SideBySide").
    - [ ] Modify the slide navigation event handler in `studio.html` to execute when a new tabulator row becomes active.
    - [ ] Implement logic to determine the active OBS Scene name from the tabulator row data, parse the layout name, and load the corresponding layout definition from `layouts.json`.
    - [ ] Implement SocketCluster broadcast of a new `apply-custom-layout` event containing the CSS properties payload.
- [ ] Task: Conductor - User Manual Verification 'Slide Navigation and Triggering' (Protocol in workflow.md)

## Phase 5: Slide View Application (`slide_view`)
- [ ] Task: Update `slide_view` Logic
    - [ ] Modify `slide-studio-app/slide_view/slides_studio_slide_view.html` to listen for the `apply-custom-layout` SocketCluster event.
    - [ ] Implement logic to receive the CSS properties payload and dynamically apply them to the slide iframe's inline styles or update a dynamic `<style>` block.
- [ ] Task: Conductor - User Manual Verification 'Slide View Application' (Protocol in workflow.md)