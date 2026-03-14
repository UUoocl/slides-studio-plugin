# Specification: Launchpad mk3 LED Controller Demo

## Overview
A standalone HTML application located in `apps/midi_controller_demo/` designed to demonstrate real-time LED control of the Novation Launchpad mk3 MIDI controller. The app bridges user interactions from a web browser to the physical device using the Slides Studio SocketCluster server.

## Functional Requirements
1.  **SocketCluster Integration**: The app must connect to the Slides Studio SocketCluster server to send and receive MIDI messages.
2.  **Device Initialization**: Upon connection, the app will automatically send the SysEx command to switch the Launchpad mk3 into **Programmer Mode**.
3.  **Virtual Launchpad Interface**:
    -   Display an interactive **9x9 grid** on the screen representing the Launchpad's 8x8 color pads and 16 control/function buttons.
    -   Visual feedback on the virtual grid when a pattern is active.
4.  **LED Patterns**:
    -   **Solid Fill**: A UI color picker allows the user to set all 64 pads to a single static color.
    -   **Rainbow Wave**: A dynamic, animated gradient that cycles through the spectrum across the pad grid.
    -   **Random Sparkle**: An animation that lights up random pads in random colors at a configurable interval.
    -   **Scrolling Text**: An input field where the user can type text to be scrolled across the physical device using its internal SysEx text-scroll feature.
5.  **MIDI Message Transmission**:
    -   Send standard MIDI Note On/CC messages for static colors.
    -   Send bulk SysEx messages for complex animations (Rainbow, Sparkle).
    -   Send text-scroll SysEx messages.

## Non-Functional Requirements
-   **Standalone Operation**: The page should be accessible via a standard web browser (hosted by the Slides Studio Fastify server).
-   **Low Latency**: Pattern updates should feel responsive on the physical device.
-   **Clean UI**: Use a modern, dark-themed aesthetic consistent with the Slides Studio project.

## Acceptance Criteria
-   [ ] The application successfully connects to the SocketCluster server.
-   [ ] The physical Launchpad mk3 enters Programmer Mode automatically.
-   [ ] All 4 LED patterns (Solid, Rainbow, Sparkle, Text) function as expected on the physical device.
-   [ ] The Virtual Launchpad on the HTML page provides a visual representation of the sent commands.
-   [ ] The application is contained within `apps/midi_controller_demo/`.

## Out of Scope
-   Direct Web MIDI API implementation (all MIDI traffic goes through the SocketCluster bridge).
-   Custom layout mapping beyond Programmer Mode.
-   Obsidian-specific UI integration (sidebar/view).
