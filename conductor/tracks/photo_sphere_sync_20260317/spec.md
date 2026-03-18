# Specification: Photo Sphere Viewer UVC Sync App

## Overview
A standalone HTML application within the `apps/` directory that leverages the `PhotoSphereViewer` JavaScript library to provide a real-time, 360-degree visualization synchronized with UVC (USB Video Class) camera movements. The app subscribes to UVC Pan, Tilt, and Zoom (PTZ) data via SocketCluster and maps these values to the viewer's orientation and scale.

## Functional Requirements
- **360 Visualization**: Display an equirectangular image in a fully interactive 360-degree viewer.
- **UVC Synchronization**:
    - Subscribe to the `uvcResponse` SocketCluster channel.
    - Map UVC Pan and Tilt values to the viewer's horizontal and vertical orientation.
    - Map UVC Zoom values to the viewer's Field of View (FOV).
- **Animation & Smoothing**: Implement interpolation logic to ensure smooth transitions between received UVC data points, avoiding jarring jumps in the viewer.
- **Full Control Panel**:
    - **Image Management**: Allow users to load/switch between local equirectangular images.
    - **Mapping Sensitivity**: UI controls to adjust the mapping ranges and sensitivity for PTZ data.
    - **UVC Status**: Visual indicator of SocketCluster connection and incoming data stream.
- **Local Asset Support**: Bundle the `photo-sphere-viewer` library and core assets within the project's `lib/` and `apps/assets/` directories.

## Technical Requirements
- **Client**: Standard ESM JavaScript using the `SocketCluster Client`.
- **Library**: `PhotoSphereViewer` (and its Three.js dependency).
- **Messaging**: Integrated with the Slides Studio Fastify/SocketCluster server on the configured port.

## Acceptance Criteria
- [ ] App connects to the local SocketCluster server.
- [ ] 360 viewer renders an equirectangular image correctly.
- [ ] Incoming UVC PTZ messages trigger corresponding movements in the viewer.
- [ ] Movements are smooth and respond within acceptable latency limits.
- [ ] Control panel allows adjustment of PTZ mapping parameters in real-time.

## Out of Scope
- Bidirectional synchronization (publishing viewer state back to SocketCluster).
- Multi-user viewer synchronization.
- Direct UVC hardware control (this app is a receiver only).
