# Rule Engine

The Rule Engine is a SocketCluster middleware application that allows you to create dynamic routing logic for messages passing through the server. It bridges devices and automates workflows by monitoring system channels and triggering sequences of actions.

## Features

- **Modernized Rule Structure**: Rules use a flexible, hierarchical JSON format supporting complex conditions and multiple actions.
- **Advanced Matching**: Choose between `partial`, `exact`, `regex`, or `wildcard` matching modes for incoming payloads.
- **Sequential & Delayed Actions**: A single trigger can execute multiple actions in sequence, each with its own optional delay (in milliseconds).
- **Corrected Throttling**: Includes `Always`, `Per Interval`, and an improved `Once per Change` mode that correctly resets when a non-matching message arrives on the same channel.
- **Capture & Learn**: Use the "LISTEN" button to automatically capture the payload of the next message on a channel to define matching criteria easily.
- **Automated Lifecycle**: Support for `autostart` and `file` URL parameters to automatically load and activate rules upon connection.
- **Vault Persistence**: Rules are saved to and loaded from your Obsidian vault using the Slides-Studio file APIs.

## Usage

### Rule Configuration

Each rule consists of three main components:

1.  **IF (Trigger)**:
    *   **Channel**: The SocketCluster channel to monitor.
    *   **Payload**: The data to match against (JSON object or string).
    *   **Mode**:
        *   `partial`: Matches if the target is a subset of the incoming data (default).
        *   `exact`: Matches only if the data is identical.
        *   `regex`: Uses Regular Expressions for string matching.
        *   `wildcard`: Uses glob-like patterns (`*` for any sequence, `?` for single character).
2.  **THEN (Actions)**:
    *   A list of one or more actions to perform.
    *   Each action specifies a **Channel**, **Payload**, and an optional **Delay** in milliseconds.
3.  **Throttle**:
    *   `Always`: Trigger every time the condition is met.
    *   `Once per Change`: Trigger once, then wait for a different message on the channel (even a non-matching one) before triggering again.
    *   `Per Interval`: Trigger at most once every X milliseconds.

### Automation (Autostart)

You can launch the Rule Engine with pre-loaded rules that start automatically by adding query parameters to the URL:

`index.html?autostart=true&file=my-production-rules.json`

## Example Usage

### 1. Multi-Action MIDI Control
Trigger a scene change and a lower-third overlay with a single MIDI button press.
*   **IF**: Channel `midi_in_myController`, Payload `{"type": "noteon", "note": 60}`, Mode `partial`
*   **THEN**:
    1.  Channel `obs_request`, Payload `{"requestType": "SetCurrentProgramScene", "requestData": {"sceneName": "Main Scene"}}`, Delay `0`
    2.  Channel `overlay_control`, Payload `{"action": "show_title", "text": "Live Now"}`, Delay `500`

### 2. OBS Event Routing
Route OBS scene changes to a custom logging channel using wildcards.
*   **IF**: Channel `obsEvents`, Payload `Scene*`, Mode `wildcard`
*   **THEN**: Channel `system_logs`, Payload `{"event": "scene_switched"}`, Delay `0`

## Developer Info

- **Entry Point**: `index.html` (UI and SocketCluster integration).
- **Core Logic**: `ruleEngineCore.js` (Pure JS module for matching and action execution).
- **Tests**: `src/tests/ruleEngine.test.ts` (Comprehensive Vitest suite covering all matching and throttling modes).
- **Dependencies**: `socketcluster-client`.
- **Persistence**: Uses the Slides-Studio `/api/file/*` endpoints to manage JSON rule sets in the Obsidian vault (stored in the `rules/` folder).
