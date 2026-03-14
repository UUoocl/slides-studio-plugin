# Slides Studio App

## Description
Slides Studio is a specialized presentation environment built on top of the **Reveal.js** framework. It bridges the gap between digital slide decks and live broadcasting by enabling seamless control of **Open Broadcaster Software (OBS)** directly from the presentation interface.

The application consists of two primary operational modes:
1. **Speaker View**: An interactive control center for the presenter to manage navigation, notes, and OBS settings.
2. **Slide View**: A clean, broadcast-ready view designed to be used as an OBS Browser Source.

## Key Features
- **Integrated OBS Control**: Remotely trigger scene changes and source visibility based on the current slide state.
- **Dynamic Layout Control**: Automatically update Slide View positioning using `data-scene` attributes.
- **Professional Teleprompter**: Auto-scrolling slide notes with adjustable font size and scroll speed.
- **Real-time Synchronization**: All components stay in sync via SocketCluster, ensuring low-latency communication between the speaker's "brain" and the broadcast output.

---

## Usage

### 1. Launching the App
The application is hosted by the Slides Studio plugin server (default: `http://127.0.0.1:57000`).
- **Main Interface**: Open `index.html` in your browser. Enter the location of your Reveal.js slide deck to load the environment.
- **OBS Integration**: Add the following URLs as Browser Sources in OBS:
    - Slide View: `slide_view/slides_studio_slide_view.html`
    - Camera Mask: `slide_view/camera_shape.html`

### 2. Navigation & Control
- Use the **Studio** panel (`studio.html`) to index your deck and configure OBS metadata.
- Navigate through slides using arrow keys or the Studio table.
- Configured tags (Scene, Camera Position, Camera Shape) will automatically trigger in OBS as you move through the presentation.

### 3. Speaker Notes
The **Teleprompter** view (`teleprompter.html`) automatically updates with notes from the current Reveal.js slide. Presenters can toggle auto-scroll and customize the display for a professional delivery.

---

## Developer Overview

### Architecture: The "Studio" Brain
The `studio.html` file acts as the central logic hub ("the brain") of the application. It handles:
- **Metadata Discovery**: Fetching available scenes and sources from OBS via the `obsWss` proxy.
- **Deck Indexing**: Parsing the Reveal.js structure to associate slide states with specific OBS commands.
- **Command Orchestration**: Sending synchronization events to all other views.

### Communication Protocols
- **SocketCluster**: Replaces legacy SSE for all real-time bidirectional messaging.
- **Reveal.js API (postMessage)**: Used to communicate with the Reveal.js instances running inside iframes. This allows the app to trigger navigation (`slide`, `next`) and extract content like slide notes.
- **BroadcastChannel**: Utilized for high-performance, same-origin communication (e.g., passing camera shape updates between the Slide View and the Camera Shape overlay).

### SocketCluster Channels
The system utilizes a unified messaging network. Key channels include:

| Channel | Scope | Description |
| :--- | :--- | :--- |
| `custom_slidesCommands` | App | Global slide state updates, scene triggers, and camera positions. |
| `slides_navigation` | App | Explicit navigation commands (next, prev, slide index). |
| `studio_to_currentSlide` | Internal | Logic sent from the Studio controller to the active slide iframe. |
| `currentSlide_to_studio` | Internal | State/Content passed from the Reveal.js slide back to the controller. |
| `obsEvents` | System | Passthrough for real-time events from the OBS WebSocket server. |
| `serverState` | System | Lists connected clients and system-wide service availability. |
| `keyboardPress` | Inputs | Stream of global key-down events (captured via Python monitor). |
| `mousePosition` | Inputs | Stream of global cursor coordinates (captured via Python monitor). |
| `midi_in_<name>` | Bridge | Incoming MIDI messages from specific hardware devices. |
| `osc_in_<name>` | Bridge | Incoming Open Sound Control (OSC) messages. |

#### `custom_slidesCommands` Payload Format
Messages published to this channel follow a standardized structure:

```json
{
  "eventName": "string",
  "msgParam": "object | any"
}
```

**Common Events:**

*   **`slide-changed`**: Emitted when the user navigates or manually triggers a slide state.
    ```json
    {
      "eventName": "slide-changed",
      "msgParam": {
        "id": 12,
        "scene": "Speaker with Overlays",
        "cameraPosition": "top-right",
        "cameraShape": "circle",
        "slideState": "5,2",
        "notes": "Important point about SocketCluster..."
      }
    }
    ```
*   **`set-slides-studio-url`**: Used to synchronize the source Reveal.js deck across all views.
    ```json
    {
      "eventName": "set-slides-studio-url",
      "msgParam": {
        "url": "http://127.0.0.1:57000/vault/decks/presentation.html"
      }
    }
    ```
*   **`next-slide`**: Triggered externally to navigate to the next slide.
    ```json
    {
      "eventName": "next-slide",
      "msgParam": {}
    }
    ```
*   **`previous-slide`**: Triggered externally to navigate to the previous slide.
    ```json
    {
      "eventName": "previous-slide",
      "msgParam": {}
    }
    ```

### CSS Layout Engine
Slides can define layouts using the `data-scene` attribute. The application logic splits this string on the keyword `"slides"` to identify the target CSS class. This class is then sent to the Slide View, which updates its iframe styling to reposition the content dynamically (e.g., shifting the slide to a corner for a head-shot overlay).

### Core Components
- `index.html`: The host container for the Speaker View environment.
- `lib/obsApiProxy.js`: The primary interface for SocketCluster and OBS WebSocket communication.
- `lib/slideSync_*.js`: Logic for maintaining state across local and remote views.
- `slide_view/`: Optimized views for OBS Browser Source integration.

---
*Inspired by reveal.js, OBS, and the creative coding community.*
