# UVC PTZ Protocol for Photo Sphere Viewer Sync

## Data Channel
- **Global Events**: `uvcResponse`
- **Device Polling**: `uvc_in_{device_name}`

## Message Structure (Poll Response)
The application expects the following structure in the `uvc_in_{device_name}` channel for PTZ data:

```json
{
  "action": "poll",
  "data": [
    {
      "name": "Pan (Absolute)",
      "current-value": 150,
      "min": -180,
      "max": 180
    },
    {
      "name": "Tilt (Absolute)",
      "current-value": 45,
      "min": -90,
      "max": 90
    },
    {
      "name": "Zoom (Absolute)",
      "current-value": 50,
      "min": 1,
      "max": 100
    }
  ]
}
```

## Mapping Strategy
The UVC values will be mapped to `PhotoSphereViewer` coordinates:
- **Pan**: Map `[min, max]` to `[0, 2π]` (radians).
- **Tilt**: Map `[min, max]` to `[-π/2, π/2]` (radians).
- **Zoom**: Map `[min, max]` to the Field of View (FOV) range `[30, 90]` (degrees), inverted (higher zoom = smaller FOV).

## Sensitivity
The `sensitivity` multipliers from the UI will scale the input range before mapping, allowing users to fine-tune how much camera movement translates to viewer movement.
