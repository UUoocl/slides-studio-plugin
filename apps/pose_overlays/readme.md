# Pose Overlays

A collection of interactive p5.js overlays that visualize MediaPipe vision task results (Pose, Face, and Hand landmarks) in real-time. These overlays are designed to be used as Browser Sources in OBS, providing dynamic, data-driven visuals that react to your movements.

## Description

The Pose Overlays app subscribes to SocketCluster channels broadcasted by the Slides-Studio plugin. It processes landmark data from MediaPipe vision tasks and renders them using various artistic "sketches" powered by p5.js. 

Current available overlays:
- **r1b2**: A parabolic painting effect that creates flowing lines and "drips" based on joint movement.
- **Gemini 1**: A persistent painting effect focused on fluidity and color randomization.
- **Gemini 2**: An advanced version of Gemini 1 featuring gravity-affected "splatters" and "drips" when movement slows down or changes direction.

## Usage

To use these overlays in OBS:

1.  **Add a Browser Source**: Set the URL to point to one of the HTML files (e.g., `http://127.0.0.1:57000/apps/pose_overlays/interfaces_r1b2.html`).
2.  **URL Parameters**:
    - `channel`: The name of the MediaPipe vision task configured in the plugin settings. (e.g., `?channel=myPose`). If the channel name doesn't have a prefix, the app automatically assumes `mediapipe_in_{name}`.
    - `preset`: (Optional) The name of a saved settings file (without `.json`) to load automatically on startup (e.g., `?preset=neon_glow`).
3.  **Interaction**:
    - When opened in a standard browser, a settings UI appears at the top, allowing you to customize colors, FPS, and "ephemeral" (trail persistence) settings.
    - Click **Save** to persist these settings to the `apps/pose_overlays/presets` folder in your vault.
    - When loaded as a preset via URL parameter, the UI is hidden for a clean overlay.

## Developer Overview

### Architecture
- **Data Input**: The overlays connect to the plugin's internal SocketCluster server. They subscribe to a specific channel to receive JSON payloads containing MediaPipe landmark results.
- **Rendering**: p5.js is used for all drawing logic. The `cur_data` variable is updated on every message, and the `draw()` loop interpolates these coordinates to ensure smooth movement.
- **State Management**: Settings are saved as JSON files in the user's vault via the plugin's `/api/file/save` and `/api/file/get` endpoints.

### Landmark Mapping
The apps are designed to be flexible. They attempt to map incoming data to the `cur_data` array based on the task type:
- **Pose**: Maps to the 33 standard MediaPipe pose landmarks.
- **Face**: Maps to face mesh landmarks.
- **Hand**: Maps to hand landmarks (supports up to 2 hands).

### Key Files
- `interfaces_*.html`: Entry points for different sketch styles.
- `sketch/*.js`: The p5.js sketch logic (setup, draw, and custom classes like `PaintLine` or `Drip`).
- `js/obsidian_save_load.js`: Bridge logic for vault-based persistence.
- `js/manage_view.js`: Handles UI visibility and preset auto-loading.
