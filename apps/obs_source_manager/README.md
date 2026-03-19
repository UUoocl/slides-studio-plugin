# OBS Source Manager

A standalone web application to manage and configure OBS browser sources that are integrated with the Slides Studio plugin.

## Description

The OBS Source Manager connects to your OBS instance via the Slides Studio plugin's SocketCluster proxy. It scans your active OBS collection for browser sources that have been marked for management and provides quick links to their respective settings pages.

This app is part of the "Render/Settings Split" architecture, where visual output is rendered in one page (optimized for OBS performance) and controls are handled in a separate settings page.

## Usage

1. **Mark your sources**: In OBS, add the following CSS to any browser source you want to manage:
   ```css
   body { --slides-studio-refresh: 1; }
   ```
2. **Open the Manager**: Navigate to `http://localhost:59000/apps/obs_source_manager/index.html` (assuming default port 59000).
3. **Connect**: Ensure the status indicator shows "Connected to OBS Proxy".
4. **Configure**: Click "Open Settings" for any listed source to open its dedicated controller page.
5. **Apply Presets**: Use the settings page to save and apply presets. Applying a preset will update the OBS source URL automatically to ensure persistence.

## Developer Overview

### Architecture
- **Frontend**: Vanilla HTML/JavaScript with CSS modules.
- **Communication**: Uses `socketcluster-client` to communicate with the Slides Studio plugin.
- **OBS Integration**: Executes `obsRequest` calls via the SocketCluster proxy to fetch input lists and settings.

### Key Logic
- **Discovery**: Fetches all inputs of type `browser_source` and inspects their CSS settings for the `--slides-studio-refresh: 1;` marker.
- **URL Inference**: Automatically determines the settings page URL by appending `_settings.html` to the base filename of the source's URL.
- **Context Passing**: Passes the `obsSourceName` as a query parameter to settings pages, enabling them to update the source configuration back in OBS.

### File Structure
- `index.html`: The main management interface.
- `README.md`: This documentation.
