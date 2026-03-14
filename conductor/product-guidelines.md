# Product Guidelines: Slides Studio

## Prose Style
- **Technical & Direct**: All documentation, UI labels, and error messages must prioritize precision and technical accuracy.
- **Action-Oriented**: Focus on what the user can do and how to achieve specific technical outcomes.
- **Terminology**: Use standard industry terms for OBS, MIDI, OSC, and networking (e.g., "scenes," "sources," "CC," "notes," "payload," "port").

## UX Principles
- **Power User Focused**: Design for advanced users who require deep, granular control over their production environment.
- **Efficiency First**: Ensure that common, repetitive tasks (like switching scenes or adjusting audio) are fast and require minimal interaction.
- **Discoverability**: Advanced features should be accessible to those who need them without cluttering the interface for simpler workflows.

## Design Language
- **Obsidian Native**: The UI should blend seamlessly with the default Obsidian aesthetic. Use Obsidian's CSS variables for colors, fonts, and spacing.
- **Clean Layouts**: Avoid unnecessary visual clutter. Use clear headers and concise labels to organize complex configuration options.
- **Responsive Components**: Ensure that UI elements (like the tag view or settings panels) are usable across different sidebar widths and window sizes.

## Feedback & Alerts
- **Contextual Cues**: Use subtle UI indicators—such as icon changes, status bar colors, or inline success/failure messages—to communicate system state.
- **Non-Intrusive Notifications**: Avoid modal dialogs or disruptive alerts unless a critical, unrecoverable error occurs.
- **Error Transparency**: When an error occurs, provide enough technical detail (e.g., specific port conflicts or connection timeouts) to allow for effective troubleshooting.
