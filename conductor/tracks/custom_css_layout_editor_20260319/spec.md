# Track Specification: Custom CSS Layout Editor

## Overview
This track introduces a Custom CSS Layout Editor for the `slide-studio-app`. This feature provides a GUI to visually create and manage custom layouts for the `slide-view` iframe. These layouts are associated with OBS Scene names and synchronized via SocketCluster when navigating slides.

## User Stories
- As a User, I want to visually position and style the slide iframe within a parent window using a drag-and-drop and slider-based GUI.
- As a User, I want to save these custom layouts to a JSON file (`apps/slide-studio-app/layouts.json`) in my Obsidian vault.
- As a User, I want the `slide-view` to automatically apply a specific layout when I navigate to a slide configured with that layout's corresponding OBS Scene.
- As a User, I want to adjust advanced CSS properties (transforms, shadows, opacity) to create professional-looking overlays.

## Functional Requirements
### 1. Custom CSS Layout Editor (Standalone HTML App)
- **Host**: A new standalone HTML app (e.g., `apps/layout_editor/index.html`).
- **GUI Features**:
  - Input fields to define the Parent Window dimensions (Width/Height).
  - Interactive "Slide Iframe" preview that supports drag-to-move and resize.
  - Controls (Sliders/Inputs) for: `top`, `left`, `width`, `height`, `z-index`, `aspect-ratio`, `object-fit`, `opacity`, `transform` (scale, rotate, skew), `border-radius`, `box-shadow`, `mix-blend-mode`.
  - Save functionality to persist the current layout definition (with a user-provided name) to `apps/slide-studio-app/layouts.json`.

### 2. Slide Navigation & Triggering
- `slide-studio-app/studio.html` is triggered by slide deck navigation.
- The tabulator table data for the active slide row is used to determine the OBS Scene to set and the associated CSS layout.
- The layout name is parsed from the OBS Scene name (e.g., splitting on 'slides' and using the subsequent string).

### 3. Synchronization & Application
- Upon slide navigation, `studio.html` determines the required layout and broadcasts the layout name and its CSS properties via SocketCluster.
- `slide-view` listens for this SocketCluster message and dynamically applies the corresponding CSS properties to the slide iframe.

### 4. File Correction & Migration
- Rename `slide-studio-app/css/iframe_positions.css` to `slide-studio-app/css/iframe_positions.css`.
- Update all references in the project to the corrected filename.
- The 4 existing hardcoded layouts in `iframe_positions.css` will be maintained as defaults.

## Non-Functional Requirements
- **Performance**: High-frequency updates during drag/resize must be smooth in the editor preview.
- **Persistence**: Layouts must be reliably saved to the Obsidian vault via the plugin's file handling mechanisms.
- **Extensibility**: The JSON schema for layouts must be extensible to support future CSS properties.

## Acceptance Criteria
- [ ] New standalone GUI app `apps/layout_editor/` is fully functional.
- [ ] User can save/load named layouts to/from `apps/slide-studio-app/layouts.json`.
- [ ] Navigating slides in `studio.html` correctly identifies the layout from the tabulator data/OBS Scene name.
- [ ] `slide-view` correctly receives SocketCluster messages and applies the custom CSS properties to the iframe.
- [ ] `iframe_positions.css` is renamed to `iframe_positions.css` and all imports are updated.

## Out of Scope
- Modifying the existing 4 default layouts in `iframe_positions.css` via the GUI.
- Multi-iframe layout management (this track focuses strictly on a single slide iframe).