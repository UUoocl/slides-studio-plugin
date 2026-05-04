# Scene Configs

Use these JSON snippets in your OBS Text Sources named `SceneConfig-{SceneName}`.

## Slide position

### full screen
```json
{
  "slideComponent": 
  {"x": 0, "y": 0, "scaleX": 1, "scaleY": 1}
}
```

### Top Left Quarter
```json
{
  "slideComponent": 
  {"x": 0, "y": 0, "scaleX": 0.5, "scaleY": 0.5}
}
```

### Top Right Quarter
```json
{
  "slideComponent": 
  {"x": 960, "y": 0, "scaleX": 0.5, "scaleY": 0.5}
}
```

### Bottom Left Quarter
```json
{
  "slideComponent": 
  {"x": 0, "y": 540, "scaleX": 0.5, "scaleY": 0.5}
}
## Components

Define multiple UI elements or masked sources using the `components` array.

### 1. Browser Component (CSS-driven)
Position and scale elements directly via CSS. Ideal for slides or overlays where the browser source itself is full-screen in OBS.

```json
{
  "id": "MainSlide",
  "type": "browser",
  "transform": { "x": 0, "y": 0, "scale": 1.0, "rotation": 0 },
  "style": { "borderRadius": "20px" }
}
```

### 2. Mask Component (OBS-driven)
Apply a CSS mask while allowing OBS to handle the transformation (size/position) of a target source (e.g., a camera).

```json
{
  "id": "CameraMask",
  "type": "mask",
  "obsSource": "Main Camera",
  "maskSource": "CamMask_Browser",
  "path": "circle(50% at 50% 50%)"
}
```

## Move Transitions (Source Animation)

### 4. Move Transition (Animation)
Enable smooth lerping of sources between scenes. Add this to your `SceneConfig` to animate sources like "Main Camera". **Note: `moveTransition` must now be an array of objects.**

```json
{
  "moveTransition": [
    {
      "sources": ["Main Camera"],
      "duration": 500,
      "steps": 15,
      "ease": "bounce",
      "delay": 100
    },
    {
      "sources": ["Overlay"],
      "duration": 1000,
      "ease": "ease-in"
    }
  ]
}
```
- **sources**: List of source names to animate.
- **duration**: Animation time in milliseconds.
- **steps**: Number of intermediate frames (higher = smoother but more OBS load).
- **ease**: `linear`, `ease-in`, `ease-out`, or `bounce`.
- **delay**: (Optional) Milliseconds to wait after snapping before switching the scene. If multiple transitions are present, the **minimum** delay is used. Default is 300.

### Transition Sequence
The engine follows a specific sequence to ensure flicker-free movement:
1. **Hide**: The source is disabled in the target scene.
2. **Snap**: The source is moved to its starting position (previous scene position).
3. **Show**: The source is re-enabled at the starting position.
4. **Wait**: The engine waits for the smallest `delay` value specified.
5. **Switch**: OBS switches to the target scene.
6. **Lerp**: The sources animate to their target positions in parallel.

## Full Production Example
```json
{
  "components": [
    {
      "id": "MainSlide",
      "type": "browser",
      "transform": { "x": 96, "y": 108, "scale": 0.4, "rotation": 5 },
      "style": { "borderRadius": "24px" }
    },
    {
      "id": "CameraOne",
      "type": "mask",
      "obsSource": "Main Camera",
      "maskSource": "CameraMask",
      "path": "circle(50%)"
    }
  ],
  "moveTransition": [
    {
      "sources": ["MainSlide", "Main Camera"],
      "duration": 500,
      "ease": "bounce",
      "delay": 100
    }
  ]
}
```