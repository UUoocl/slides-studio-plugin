
## Source Capture App

The `apps/source_capture/` directory contains a specialized application for high-performance source monitoring and computer vision processing.

### Key Capabilities
- **Direct OBS Connection**: Connects directly to the OBS WebSocket server (bypassing the internal proxy) to minimize latency for data-heavy operations.
- **Screenshot-based Polling**: Uses the `GetSourceScreenshot` request to capture frames at a configurable FPS, rather than subscribing to event streams.
- **MediaPipe Vision Tasks**: Integrated support for real-time computer vision processing using MediaPipe:
    - **Pose Landmarker**: 3D body tracking.
    - **Face Landmarker**: Facial feature and blendshape tracking.
    - **Hand Landmarker**: Multi-hand tracking.
- **Broadcast Channel API**: Captured data is forwarded to a browser `BroadcastChannel` (using the user-defined `Instance Name`).
    - **Image Mode**: Broadcasts the full base64/data-URL image.
    - **Vision Modes**: Broadcasts only the landmark coordinates and metadata to minimize channel overhead (the image is used for processing but not re-broadcast).