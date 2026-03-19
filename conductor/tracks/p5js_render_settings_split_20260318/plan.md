# Implementation Plan: p5js_render_settings_split

## Phase 1: Create Manage Browser Sources App
- [ ] Task: Setup new HTML page for managing sources
    - [ ] Create `apps/manage_source_settings.html`
    - [ ] Add basic HTML structure and styling
- [ ] Task: Connect to OBS via Slides-Studio Proxy
    - [ ] Implement SocketCluster connection to communicate with the plugin's OBS proxy.
    - [ ] Add UI feedback for connection status
- [ ] Task: Retrieve and filter browser sources via Proxy
    - [ ] Send request to proxy to fetch all inputs from OBS
    - [ ] Filter inputs to only show browser sources
    - [ ] Send request to proxy to fetch settings for each browser source to check for `--slides-studio-refresh: 1;` in CSS
- [ ] Task: Display marked sources and link to settings
    - [ ] Render a list of marked sources in the UI
    - [ ] Generate links/buttons for each source that point to its respective `_settings.html` page
- [ ] Task: Conductor - User Manual Verification 'Create Manage Browser Sources App' (Protocol in workflow.md)

## Phase 2: Refactor space_type_generator (stripes.html)
- [ ] Task: Refactor settings page (`stripes_settings.html`)
    - [ ] Ensure UI controls are correctly separated from rendering
    - [ ] Implement SocketCluster communication via `socketcluster-client.min.js`
    - [ ] Publish setting changes to `stripes-settings` channel
- [ ] Task: Refactor render page (`stripes.html`)
    - [ ] Remove UI controls and related DOM logic
    - [ ] Connect to SocketCluster server
    - [ ] Subscribe to `stripes-settings` channel
    - [ ] Implement "settings communication mode" logic in the draw loop
- [ ] Task: Conductor - User Manual Verification 'Refactor space_type_generator (stripes.html)' (Protocol in workflow.md)

## Phase 3: Implement Preset Management
- [ ] Task: Create API endpoint for saving presets
    - [ ] Add an endpoint in the Fastify server (or use existing file write capabilities) to save JSON to `apps/space_type_generator/presets/`
- [ ] Task: Implement save preset logic in settings page
    - [ ] Add a "Save Preset" button and input field for preset name in `stripes_settings.html`
    - [ ] Implement logic to gather current settings and send to the save API
- [ ] Task: Implement preset loading in render page
    - [ ] Add logic in `stripes.html` to parse the `?preset=` query parameter
    - [ ] Fetch the specified JSON preset file on startup
    - [ ] Apply the loaded preset settings before starting the render loop
- [ ] Task: Conductor - User Manual Verification 'Implement Preset Management' (Protocol in workflow.md)

## Phase 4: Apply Changes to Other space_type_generator Apps
- [ ] Task: Refactor remaining apps to use new SocketCluster and preset patterns
    - [ ] Update `boost.html` and `boost_settings.html`
    - [ ] Update `coil.html` and `coil_settings.html`
    - [ ] Update `cylinder.html` and `cylinder_settings.html`
    - [ ] Update `danger.html` and `danger_settings.html`
    - [ ] Update `flag.html` and `flag_settings.html`
    - [ ] Update `layers.html` and `layers_settings.html`
- [ ] Task: Conductor - User Manual Verification 'Apply Changes to Other space_type_generator Apps' (Protocol in workflow.md)