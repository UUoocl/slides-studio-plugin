# Space Type Generator (STG)

Space Type Generator is a collection of kinetic type generators built with P5.js. It allows users to create, customize, and animate text in various styles, which can then be used as live overlays in OBS or exported as visuals.

## Features

- **Multiple Animation Modes**:
  - **Boost**: High-energy kinetic type with various extrusion and tumble effects.
  - **Cylinder**: Wraps text around a 3D cylinder with adjustable wave and rotation parameters.
  - **Stripes**: Creates flowing ribbon-like animations with stacked text.
  - **Layers**: Multi-layered 3D depth animations.
  - **Danger**: Gritty, noise-based distortion animations.
- **Render/Settings Split Architecture**:
  - **Render Page**: (e.g., `boost.html`) Focuses purely on visual output. UI is hidden and background is transparent. Optimized for OBS Browser Sources.
  - **Settings Page**: (e.g., `boost_settings.html`) Contains all UI controls for adjusting parameters. Communicates with the Render Page in real-time via SocketCluster.
- **Real-time Data Integration**:
  - Responds to system-wide hotkeys (e.g., `Cmd+C`) via SocketCluster.
  - Responds to Speech-to-Text (STT) data for live captioning effects.
- **Preset Management**: Save and load custom configurations as key-value pairs in local JSON files.

## Usage

### 1. Management
Use the [OBS Source Manager](../obs_source_manager/index.html) to list all active STG sources in OBS and open their respective settings pages.

### 2. Configuration (Settings Mode)
Open a `*_settings.html` page. Use the sidebar controls to adjust the text, style, animation, and camera settings. Your changes will be broadcast via SocketCluster to any open Render Page for that app.

### 3. Preset Management
1. Enter a name in the "Preset Name" field.
2. Click **Save** to persist the current configuration to the `<app>_presets.json` file in the same directory.
3. Select a saved preset from the dropdown and click **Apply** to load it into the settings UI and update the connected Render Page.

### 4. OBS Integration (Render Mode)
To use a sketch as an overlay in OBS:
1. Add a **Browser Source** in OBS.
2. Set the URL to the main app file (e.g., `http://localhost:59000/apps/space_type_generator/boost.html`).
3. (Optional) Add `?preset=YOUR_PRESET_NAME` to the URL to load a specific configuration on startup.
4. **Important**: Add the following CSS to the source settings in OBS to enable management:
   ```css
   body { --slides-studio-refresh: 1; }
   ```

## Developer Overview

### Architecture
- **P5.js**: Core animation and rendering engine.
- **SocketCluster**: Used for real-time synchronization between settings and render pages, and for receiving external events (keyboard, audio).
- **Local File API**: A dedicated `/api/file/*` endpoint provided by the host server allows sketches to save/load JSON preset dictionaries.
- **`stg_sc_sync.js`**: Centralized logic for SocketCluster communication and preset loading.
- **`obsidian_save_load.js`**: Shared UI and logic for preset management.

### Adding New Sketches
1. Create a new `.html` (render), `_settings.html` (settings), and `js/sketch_NAME.js` file.
2. Implement `getSketchSettings()` and `setSketchSettings()` functions.
3. Include the standard suite of scripts: `obsidian_save_load.js`, `manage_view.js`, `keyboard_input.js`, and `stg_sc_sync.js`.
