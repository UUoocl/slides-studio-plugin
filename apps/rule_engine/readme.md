# Rule Engine

The Rule Engine is a SocketCluster middleware application that allows you to create dynamic routing logic for messages passing through the server.

## Features

- **If-Then Rules**: Define rules that trigger actions based on incoming message payloads.
- **Dynamic Channel Discovery**: Automatically detects active channels on the SocketCluster server.
- **Capture & Learn**: Use the "LISTEN" button to automatically capture the payload of the next message on a channel, making it easy to define matching criteria.
- **Payload Matching**: Supports partial JSON matching and string inclusion for "If" conditions.
- **Vault Persistence**: Rules are saved to and loaded from your Obsidian vault (`rules/socketcluster-rules.json`).

## Example Usage

1. **MIDI to OBS**: 
   - IF channel: `midi_in_myController`, payload: `{"type": "noteon", "note": 60}`
   - THEN channel: `obs_request`, payload: `{"requestType": "SetCurrentProgramScene", "requestData": {"sceneName": "Main Scene"}}`
2. **Hotkeys to Webviews**:
   - IF channel: `keyboard_events`, payload: `{"key": "f1"}`
   - THEN channel: `my_overlay_control`, payload: `{"action": "toggle_visibility"}`

## Developer Info

- **Entry Point**: `index.html`
- **Dependencies**: `socketcluster-client`
- **Persistence**: Uses the Slides-Studio `/api/file/*` endpoints.
