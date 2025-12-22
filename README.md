# Slides Studio (for Obsidian)

Slides Studio is the perfect companion for presenting Reveal.js slides from [Obsidian](https://obsidian.md) to [Open Broadcast Studio](https://obsproject.com/)

## Features

- Synchronize slide changes and OBS scenes
- Add tags to slides that control OBS
- Serve presentations from Obsidian or slides.com
- Control slides with MIDI or Open Sound Control(OSC) 

## Manual Installation

1. Download the latest release from [GitHub](https://github.com/uuoocl/slides-studio-plugin/releases).
   You need the files: `manifest.json`, `main.js`, `style.css` and `slides-studio.zip`.
2. In Obsidian, open your vault's root folder in your file explorer.
3. Navigate to the `.obsidian/plugins` directory. If it doesn't exist, create it.
4. Extract the contents of the downloaded `.zip` file into a new folder within the `plugins` directory.
5. Copy the file `manifest.json`, `main.js`, and `style.css` into the folder `slides-studio`.
5. Restart Obsidian or reload your vault.
6. Go to `Settings` > `Community Plugins` and make sure "Safe Mode" is turned off.
7. Click on `Browse` under `Community Plugins`, find `Slides Studio`, and enable it.

> [!NOTE]
> The plugin folder is named `slides-extended` and contains the `.zip`-contents, like `css`, `dist`, `plugin`, `template`,
> but also the additional files `mainfest.json`, `main.js`, and `style.css`.

## Acknowledgements

This plugin is inspired the plugin [Slides Extended](https://github.com/ebullient/obsidian-slides-extended). Use **Slides Extended** to create slides and **Slides Studio** to presenting. 

---

- MIT licensed | Copyright © 2025 Jonathan Wood