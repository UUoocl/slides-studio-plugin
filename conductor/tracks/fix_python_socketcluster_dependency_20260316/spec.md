# Specification: Fix Python SocketCluster Client Dependency & Path Diagnostic

## Overview
The Slides Studio plugin uses Python scripts for Mouse, Keyboard, and UVC monitoring. Despite these dependencies being installed by the user, the plugin reports `ModuleNotFoundError: No module named 'socketclusterclient'`. This track aims to diagnose and resolve this path mismatch while providing better status reporting and troubleshooting tools in the plugin UI.

## Functional Requirements
- **Requirements File:** Create a `pythonScripts/requirements.txt` file listing all necessary Python packages (`socketclusterclient`, `pynput`).
- **Python Path Diagnostic:**
    - Add a "Check Python Status" button/indicator in the settings tab.
    - This will execute a small diagnostic script using the configured `pythonPath` to report:
        - The absolute path of the Python interpreter (`sys.executable`).
        - The Python version and `sys.path`.
        - Whether `socketclusterclient` and `pynput` are successfully importable.
- **Improved Error Messaging:**
    - Detect `ModuleNotFoundError` in Python process stderr and show a Notice with the exact `pip` command using the *configured* Python path (e.g., `[pythonPath] -m pip install ...`).
- **Dependency Documentation:** Update README.md with troubleshooting steps for path mismatches on macOS/Windows.

## Non-Functional Requirements
- **No Side Effects:** The diagnostic check should not modify any user files or environment settings.
- **Clarity:** Ensure the user knows exactly which Python executable the plugin is attempting to use.

## Acceptance Criteria
- [x] `pythonScripts/requirements.txt` created.
- [ ] Settings tab shows the absolute path of the Python executable being used (e.g., `/usr/local/bin/python3`).
- [ ] The plugin can explicitly report which modules are missing from the configured Python environment.
- [ ] Clearer instructions provided when a module is missing, including the exact `pip` command using the current `pythonPath`.

## Out of Scope
- Automatic installation of Python packages.
- Automatic creation or management of Python virtual environments (venv).
