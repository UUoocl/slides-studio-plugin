# Specification: Fix Tabulator Table in Obsidian Webview (studio.html)

## Overview
This track addresses a bug where the Tabulator table within the `slide-studio-app/studio.html` page fails to render when loaded inside an Obsidian webview (via the Slides-Studio plugin), despite functioning correctly in standalone Chrome.

## Functional Requirements
- **Table Rendering**: The Tabulator table must be visible and correctly initialized when `studio.html` is loaded within the Obsidian webview.
- **Data Loading**: The table must successfully load and display the slide data (likely via its existing synchronization mechanism).
- **Environment Compatibility**: The solution must resolve any conflicts or environment-specific issues (e.g., CSS conflicts, iframe/webview sizing, or security restrictions) that prevent rendering in Obsidian.

## Non-Functional Requirements
- **No Side Effects**: The fix must not break existing SocketCluster connections or subscriptions (which were confirmed to be functional by the logs).
- **Lightweight**: The solution should avoid introducing heavy new dependencies.

## Acceptance Criteria
- [ ] Open the Slides-Studio "Tag View" or equivalent Obsidian view that loads `studio.html`.
- [ ] Confirm that the Tabulator table is fully rendered and populated with slide data.
- [ ] Verify that no new errors are introduced in the Obsidian Developer Tools console.

## Out of Scope
- Adding new columns or data fields to the table.
- Modifying the core Tabulator library code.
- Refactoring the entire `slide-studio-app` UI.
