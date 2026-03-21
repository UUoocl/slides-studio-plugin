# Custom CSS Layout Editor

The **Custom CSS Layout Editor** is a visual tool for Slides-Studio that allows users to design and persist complex iframe layouts for their slide decks. It bridges the gap between static CSS classes and dynamic, per-scene positioning within OBS.

## Description

The editor provides a "What You See Is What You Get" (WYSIWYG) interface for styling the Reveal.js iframe. Users can adjust dimensions, positions, and advanced CSS properties (like transforms, filters, and blend modes) while seeing a real-time preview scaled to a simulated OBS canvas. These layouts are saved as named presets that can be automatically triggered by OBS scene changes.

## Usage

1.  **Open the Editor**: Navigate to `apps/layout_editor/index.html` within your Slides-Studio environment.
2.  **Configure Parent Canvas**: Set the "Parent Window" dimensions (e.g., 1920x1080) to match your OBS Canvas resolution.
3.  **Design the Layout**:
    *   **Direct Manipulation**: Click and drag the iframe preview to move it. Use the handle in the bottom-right corner to resize.
    *   **Fine-Tuning**: Use the sidebar controls to adjust specific values like `z-index`, `aspect-ratio`, `border-radius`, and `opacity`.
    *   **Advanced Styles**: Apply CSS transforms (Scale, Rotate, Skew) and Mix Blend Modes for creative overlays.
4.  **Save the Layout**: Enter a unique name (e.g., `Sidebar-Right`) and click **Save Layout**. This persists the data to `apps/slide-studio-app/layouts.json`.
5.  **Load/Edit**: Click any layout in the "Existing Layouts" list to load its settings back into the editor for modification.

## Technical Explanation

### Data Architecture
The editor treats layouts as a collection of CSS properties mapped to a specific parent resolution. 

*   **Storage**: Layouts are stored in a central JSON file: `apps/slide-studio-app/layouts.json`.
*   **Schema**:
    ```json
    {
      "Layout-Name": {
        "parent": { "width": "1920", "height": "1080" },
        "styles": {
          "top": "100px",
          "left": "50%",
          "transform": "scale(1.2) rotate(5deg)",
          "mixBlendMode": "screen",
          "...": "..."
        }
      }
    }
    ```

### Communication Layer
The editor uses **SocketCluster** to interact with the Slides-Studio Obsidian plugin:
*   **`readFile` / `writeFile`**: The editor invokes these plugin-level methods to persist data directly to the Obsidian vault, bypassing browser filesystem restrictions.
*   **Real-time Preview**: The preview uses `Object.assign(element.style, styles)` to apply CSS properties dynamically as sliders and inputs change.

## Layout Application in Slide-View

The integration between the Editor, the Studio "Brain," and the Slide-View follows a reactive pattern:

1.  **Trigger (Studio)**:
    *   The `studio.html` monitors OBS scene changes.
    *   It uses `parseLayoutName(sceneName)` to identify layouts. The system looks for the word **"slides"** as a delimiter in the scene name (e.g., `Scene 1 slides Sidebar-Right`).
    *   If a scene name follows this convention and the extracted name (e.g., `Sidebar-Right`) matches a key in `layouts.json`, it fetches the associated styles.

2.  **Broadcast (SocketCluster)**:
    *   The Studio publishes a message to the `apply-custom-layout` channel containing the layout's CSS styles.

3.  **Application (Slide-View)**:
    *   `slides_studio_slide_view.html` (the OBS browser source) subscribes to the `apply-custom-layout` channel.
    *   Upon receiving a layout:
        1.  It clears all existing inline styles on the iframe (`iframe.style = ''`).
        2.  It resets the `className` to a base state to prevent legacy CSS conflicts.
        3.  It applies the new CSS object directly to the iframe's `style` property.
    *   **Result**: The slide iframe instantly moves and transforms to the exact coordinates designed in the editor.

## Development & Testing

*   **Unit Tests**: `app.test.js` uses **Vitest** to verify the serialization and formatting logic, ensuring that raw numeric inputs are correctly converted to valid CSS strings (e.g., adding `px` units where appropriate).
*   **Validation**: Run `npm test` to execute the layout logic test suite.
