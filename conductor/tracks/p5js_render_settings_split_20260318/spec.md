# Track Specification: p5js_render_settings_split

## Overview
Separate the rendering and settings management for p5js applications to improve user experience in OBS. Render pages will focus solely on the visual output, while a separate standalone HTML settings page will handle configuration and preset management via SocketCluster.

## Functional Requirements
- **Manage Browser Sources App**:
    - Create a new standalone HTML page (e.g., `apps/manage_source_settings.html`).
    - Connect to the OBS websocket to retrieve all browser sources.
    - Filter and display only sources containing the CSS marker `--slides-studio-refresh: 1;`.
    - Provide links/buttons to open the corresponding settings page for each listed source.
- **Render/Settings Split (space_type_generator)**:
    - `stripes.html`: Refactored to remove overlay controls and focus only on the p5js canvas.
    - `stripes_settings.html`: A new settings page to control the render page via SocketCluster.
    - Implement a "settings communication mode" in the render page:
        - Check for updates on the `app-name-settings` channel.
        - Only perform heavy settings checks when active.
- **Preset Management**:
    - Allow users to save current configurations as presets.
    - Presets will be saved as key-value pairs in a single JSON file per app (e.g., `apps/space_type_generator/stripes_presets.json`) located in the app's directory relative to the vault root.
    - Render pages will support a query parameter (e.g., `?preset=presetName`) to load a specific configuration from the app's preset file on startup.
    - Settings pages will allow the user to select a preset and "apply" it to the connected render page via SocketCluster.
    - Applying a preset will also update the OBS Browser Source URL to include the `?preset=presetName` query parameter (if not already present or if different) to ensure the preset persists on OBS restart.

## Non-Functional Requirements
- **Communication**: Use SocketCluster for real-time synchronization between settings and render pages.
- **Latency**: Minimize UI lag in the render page when settings communication is inactive.

## Acceptance Criteria
1. The "Manage" app successfully lists all marked OBS browser sources.
2. Clicking a source in the "Manage" app opens the correct `_settings.html` page.
3. Changes in `stripes_settings.html` are reflected in `stripes.html` in real-time.
4. Presets can be saved and reloaded using JSON storage.
5. `stripes.html` loads the correct preset when the `?preset=` query parameter is provided.

## Out of Scope
- Porting all existing p5js apps (focus is on `space_type_generator` first).
- Building an Obsidian-specific view for source management (standalone HTML is preferred).