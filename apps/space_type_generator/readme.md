# Space Type Generator (STG)

Space Type Generator is a collection of kinetic type generators built with P5.js. It allows users to create, customize, and animate text in various styles, which can then be used as live overlays in OBS or exported as visuals.

## Features

- **Multiple Animation Modes**:
  - **Boost**: High-energy kinetic type with various extrusion and tumble effects.
  - **Cylinder**: Wraps text around a 3D cylinder with adjustable wave and rotation parameters.
  - **Stripes**: Creates flowing ribbon-like animations with stacked text.
  - **Layers**: Multi-layered 3D depth animations.
  - **Danger**: Gritty, noise-based distortion animations.
- **EDIT and PLAY Modes**:
  - **EDIT Mode**: Full UI controls for adjusting every parameter of the sketch. Parameters can be saved to and loaded from local preset files.
  - **PLAY Mode**: Minimalist view with hidden UI and transparent background, optimized for use as an OBS Browser Source overlay.
- **Real-time Data Integration**:
  - Responds to system-wide hotkeys (e.g., `Cmd+C`) via Broadcast Channels.
  - Responds to Speech-to-Text (STT) data for live captioning effects.
- **Preset Management**: Save and load custom configurations locally via a built-in API.

## Usage

### Edit Mode
Simply open any of the HTML files (e.g., `boost.html`, `cylinder.html`) in a browser. Use the sidebar controls to adjust the text, style, animation, and camera settings.

### Preset Management
1. Enter a name in the "Settings Name" field.
2. Click **Save** to persist the current configuration to the `presets/` folder.
3. Use the dropdown and click **Load** to recall a saved configuration.

### OBS Integration (PLAY Mode)
To use a sketch as an overlay in OBS:
1. Add a **Browser Source** in OBS.
2. Set the URL to: `http://localhost:3000/apps/space_type_generator/stg_obs.html?preset=YOUR_PRESET_NAME`
3. STG will automatically load the preset and enter **PLAY Mode** (hidden UI, transparent background).

#### Input Source Selection
You can choose which data source the sketch should listen to by adding the `inputSource` query parameter:
- `?preset=my_preset&inputSource=keyboard` (Default): Listens for hotkeys on the `keyboard_events` channel.
- `?preset=my_preset&inputSource=audio`: Listens for live speech-to-text data on the `audio_stt` channel.

## Developer Overview

### Architecture
- **P5.js**: Core animation and rendering engine.
- **BroadcastChannel API**: Used for real-time communication between the master listener (SSE) and the sketches.
- **Local File API**: A dedicated `/api/file/*` endpoint provided by the host server allows sketches to save/load JSON presets.
- **`manage_view.js`**: Handles the transition between EDIT and PLAY modes based on URL parameters.
- **`keyboard_input.js`**: Centralized logic for responding to external broadcast events.

### Adding New Sketches
1. Create a new `.html` and `js/sketch_NAME.js` file.
2. Implement `getSketchSettings()` and `setSketchSettings()` functions to handle preset persistence.
3. Include the standard suite of scripts: `stg_menu.js`, `obsidian_save_load.js`, `manage_view.js`, and `keyboard_input.js`.

## Opportunities for Improvement

- **Logic Consolidation**: Many sketches share identical UI and saving logic. This could be moved into a shared base class or library to reduce duplication.
- **Advanced Export**: Re-enable and stabilize the MP4/GIF export functionality across all modes.
- **Global Settings**: Add global animation speed and color palette overrides that apply across all loaded presets.
- **Dynamic Fonts**: Allow users to upload or link to custom web fonts instead of relying on a hardcoded selection.
