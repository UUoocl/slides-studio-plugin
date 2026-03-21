# Technology Stack: Slides Studio

## Languages
- **TypeScript**: The primary language for the Obsidian plugin, Fastify server, and frontend apps, ensuring type-safe development and clear architectural patterns.
- **JavaScript (ESM)**: Used extensively for frontend apps, particularly for high-performance OBS browser source overlays and creative coding integrations.
- **Python**: Used for high-level input monitoring (mouse, keyboard, UVC) where native Node.js support is limited, with data bridged into the main system.

## Core Frameworks
- **Obsidian API**: The foundation for plugin integration, lifecycle management, and UI rendering within the Obsidian vault.
- **Fastify**: A high-performance, low-overhead Node.js web framework for managing REST routes, file operations, and system status.
- **SocketCluster**: The primary real-time messaging server and client framework for high-frequency, low-latency communication between Obsidian, OBS, and external devices.
- **Reveal.js**: The slide engine powering the integrated `slide-studio-app` for professional, web-based presentations.

## Creative Coding & Overlays
- **p5.js**: A flexible JavaScript library for creative coding, used to create reactive animations and visual effects in OBS overlays.
- **cables.gl**: A visual programming environment for WebGL, utilized for high-performance 3D graphics and complex shader-based overlays.
- **PhotoSphereViewer**: A JavaScript library for displaying 360-degree panoramas, used for real-time UVC-synchronized visualizations.
- **Three.js**: The underlying 3D engine for PhotoSphereViewer and complex WebGL overlays.
- **SocketCluster Client**: Integrated into all browser-based overlays for real-time, bidirectional interaction between reactive visuals and the Slides Studio system.

## Core Libraries
- **obs-websocket-js**: For direct, reliable communication with the OBS WebSocket server.
- **node-osc**: For bidirectional Open Sound Control (OSC) communication.
- **webmidi**: For hardware-level MIDI device integration, supporting full SysEx and raw messaging for advanced controller features (LEDs, modes).
- **tabulator-tables**: For interactive, high-performance table UI in the slide management views.
- **@mediapipe/tasks-vision**: For high-performance computer vision tasks (pose and hand tracking) within the slide overlays.
- **GSAP (GreenSock Animation Platform)**: Core animation engine used for UI transitions and SVG morphing.
- **MorphSVGPlugin**: GSAP plugin for seamless morphing between complex SVG paths.

## Build & Tooling
- **esbuild**: For extremely fast bundling and transpilation of TypeScript source code.
- **eslint**: For maintaining code quality and adhering to Obsidian plugin best practices.
- **typedoc**: For generating API and architecture documentation.
- **version-bump.mjs**: A custom script for managing plugin versions across `manifest.json` and `versions.json`.
