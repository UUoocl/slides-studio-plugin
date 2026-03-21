# Specification: Camera Shape Morph Editor

## Overview
The **Camera Shape Morph Editor** is a new standalone application within the Slides Studio ecosystem. It provides a visual interface for creating, editing, and previewing SVG shapes that serve as alpha masks for camera sources in OBS. These shapes can then be seamlessly morphed between each other during slide transitions using GSAP's MorphSVG plugin.

## Functional Requirements

### 1. SVG Editor Page (`index.html`)
- **WYSIWYG Interface**: A visual editor for manipulating SVG paths.
- **Input Methods**:
  - Load SVG files from disk.
  - Paste raw SVG text into a dedicated input area.
- **Canvas Control**: Users can set the width and height of the preview canvas to match their OBS source dimensions.
- **Path Manipulation**: Support for selecting and editing SVG path points.
- **GSAP MorphSVG Options**:
  - Configure `shapeIndex` for fine-tuning the morphing transition.
  - Set global or per-shape transition settings (duration, easing).
- **Persistence**: Save the SVG shapes and their configuration to a JSON file.

### 2. Render Page (`render.html`)
- **Dynamic Masking**: Receives a `cameraShape` identifier via the SocketCluster `slide-state` channel.
- **GSAP Morphing**: Performs a smooth transition from the current SVG shape to the new one using GSAP MorphSVG.
- **Configuration**: Respects the duration and easing settings defined in the editor.

### 3. Studio Integration (`studio.html`)
- **Shape Discovery**: Merges camera shapes defined in the new JSON file with those found in OBS settings to populate the `cameraShape` dropdown in the Tabulator table.
- **Real-time Updates**: Automatically updates the dropdown when new shapes are saved in the editor.

## Technical Requirements
- **Storage**: Save configurations to `apps/slide-studio-app/camera_shapes.json`.
- **Libraries**:
  - **GSAP & MorphSVG**: Core animation and morphing engine (loaded from `lib/`).
  - **SocketCluster Client**: For real-time synchronization via the `slide-state` channel.
  - **Custom SVG Logic**: Lightweight, native SVG manipulation for the editor.
- **Protocol**: Listen to the `slide-state` channel for `cameraShape` updates during slide navigation.

## Acceptance Criteria
- [ ] Users can successfully load/paste an SVG and see it rendered in the preview canvas.
- [ ] Users can edit SVG paths and save the resulting shape to the JSON file.
- [ ] The `studio.html` dropdown correctly displays both existing and new (JSON-based) camera shapes.
- [ ] The Render page successfully morphs between two shapes when a `slide-changed` event with a new `cameraShape` is received.
- [ ] Morph transitions respect the configured duration and easing.

## Out of Scope
- Drawing tools for new shapes (rect, circle, etc.) - focus is on manipulating existing paths.
- Advanced SVG filter editing (beyond basic alpha masking).
- Multi-layer SVG support (single-path morphing focus).
