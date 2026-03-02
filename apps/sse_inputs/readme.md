# SSE Master Listener

The `master_listener.html` acts as a central hub for Server-Sent Events (SSE). It connects to the unified `/api/events` endpoint and redistributes incoming events to various browser-native **Broadcast Channels**. This allows other visualizers, overlays, or tools in the same browser context to subscribe to specific data streams without each maintaining a separate SSE connection.

## Role
- **Centralized Connection:** Maintains a single `EventSource` connection to the Slides Studio plugin.
- **Event Routing:** Parses incoming SSE messages and routes them to logical Broadcast Channels based on event type.
- **Debugging:** Provides a minimal UI to monitor connection status and see a live log of recent events.

## Broadcast Channels
Visualizers can subscribe to these channels using `new BroadcastChannel('channel_name')`.

| Channel Name | Source Event(s) | Payload Content |
|--------------|-----------------|-----------------|
| `mouse_events` | `mousePosition`, `mouseClick`, `mouseScroll` | `{ type: string, data: object }` |
| `keyboard_events` | `keyboardPress`, `keyboardRelease` | `{ type: string, data: { key: string, ... } }` |
| `audio_fft` | `audioData` (if `fft` exists) | `{ device: string, fft: number[] }` |
| `audio_stt` | `audioData` (if `stt` exists) | `{ device: string, stt: string }` |
| `[device_name]` | `audioData` | `{ device: string, fft?: number[], stt?: string }` (Device-specific stream) |
| `slides_events` | `slideChanged`, `tagUpdate` | `{ type: string, data: object }` |
| `custom_events` | `customMessage` | `object` (The raw data object from the custom message) |

## Usage
Simply open `master_listener.html` in a browser tab or as an OBS custom dock. Once the status shows **SSE: CONNECTED**, other pages in the same browser (or OBS instance) can listen to the channels listed above.
