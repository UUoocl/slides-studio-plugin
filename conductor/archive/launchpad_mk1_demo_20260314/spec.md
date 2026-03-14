# Specification: Novation Launchpad mk1 LED Controller Demo

## 1. Overview
This track introduces a new standalone HTML application designed to demonstrate real-time LED control and interaction with the Novation Launchpad mk1 MIDI controller. The application will leverage the existing SocketCluster infrastructure and WebMIDI to provide bidirectional communication, serving as a reference implementation for hardware-to-web synchronization using the original mk1 model.

## 2. Functional Requirements
*   **Virtual Grid UI:** The application must render a visual representation of the Launchpad mk1 grid (8x8 main grid, 8 scene launch buttons on the right, 8 automap/live buttons on the top row) similar to the existing mk3 demo.
*   **Bidirectional Sync (Device to Web & Web to Device):**
    *   Clicking a virtual pad on the web UI must send the appropriate MIDI message to light up the physical pad on the Launchpad mk1.
    *   Pressing a physical pad on the Launchpad mk1 must update the corresponding virtual pad on the web UI.
    *   **Communication Mode Selection:** The user must be able to choose between **Direct WebMIDI** and **SocketCluster Bridge** for communication.
        *   **SocketCluster Bridge:** Publish/subscribe to a dedicated channel (e.g. `midi_out_<Device Alias>`) to bridge between the app and hardware via the server.
*   **LED Color Support:** The app must support the Launchpad mk1's bi-color LED system (Red, Green, Amber) with varying brightness levels (Off, Low, Medium, Full), calculating the velocity byte using the formula: `Velocity = (16 * Green) + Red + Flags`.
*   **Animations & Patterns:** The application must include predefined LED animations (e.g., solid fill, simple patterns) to demonstrate programmatic control of the grid.
*   **Protocol & Mapping:**
    *   Use X-Y Mapping Mode by default.
    *   Use Note On (`0x90`) for the 8x8 grid and scene buttons.
    *   Use Control Change (`0xB0`) for the top row buttons.

## 3. Non-Functional Requirements
*   **Performance:** The application must respect the original Launchpad mk1's bandwidth constraint of ~400 messages per second to avoid crashing the USB controller.
*   **Architecture:** The app must reside in `apps/launchpad_mk1_demo/` (or similar) and connect to the Slides Studio SocketCluster server for unified messaging if applicable, or use WebMIDI directly if it matches the `midi_controller_demo` pattern.
*   **Code Reusability:** Logic should be modular, potentially utilizing a core class (e.g., `launchpadMk1Core.js`) to handle the specific MIDI byte calculations.

## 4. Out of Scope
*   Support for other Launchpad models (mk2, mk3, Pro, Mini) within this specific demo.
*   Complex double-buffering or rapid LED update mode implementations (unless necessary for basic animations).
*   Audio playback or music production features (this is purely an LED/MIDI demo).