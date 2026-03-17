# Implementation Plan: Fix Python SocketCluster Client Dependency & Path Diagnostic

## Objective
Resolve the Python `ModuleNotFoundError` by providing clear diagnostics and instructions to the user. This involves creating a requirements file, implementing a diagnostic script to check the Python environment, and updating the plugin's UI to show the current Python status and actionable error messages.

## Key Files & Context
- `src/main.ts`: Plugin initialization and lifecycle.
- `src/settings.ts`: Settings tab UI.
- `src/utils/serverLogic.ts`: Logic for launching Python processes.
- `pythonScripts/mouse_monitor.py`: Mouse monitor script.
- `pythonScripts/keyboard_monitor.py`: Keyboard monitor script.
- `pythonScripts/uvc-util/uvc_util_bridge.py`: UVC bridge script.

## Implementation Steps

### Phase 1: Requirements & Documentation
- [ ] **Task:** Create `pythonScripts/requirements.txt` listing `socketclusterclient` and `pynput`.
- [ ] **Task:** Update `README.md` with a "Python Setup" section including instructions on how to install dependencies manually using `pip`.
- [ ] **Task:** Conductor - User Manual Verification 'Requirements & Documentation' (Protocol in workflow.md)

### Phase 2: Python Diagnostic Tooling
- [ ] **Task:** Create a diagnostic Python script `pythonScripts/check_dependencies.py` that reports the absolute path of the interpreter (`sys.executable`), the Python version, `sys.path`, and checks if `socketclusterclient` and `pynput` are importable.
- [ ] **Task:** Write tests for a new utility `src/utils/pythonLogic.ts` that will be responsible for running the diagnostic script and parsing its JSON output.
- [ ] **Task:** Implement `src/utils/pythonLogic.ts` with a `checkPythonStatus()` function that can be called by the settings tab or during plugin startup.
- [ ] **Task:** Update `src/main.ts` to log the absolute path of the Python interpreter being used when the plugin starts.
- [ ] **Task:** Conductor - User Manual Verification 'Python Diagnostic Tooling' (Protocol in workflow.md)

### Phase 3: Settings Tab UI & Error Messaging
- [ ] **Task:** Update `src/settings.ts` to include a "Python Status" section in the settings tab that displays the absolute path of the interpreter and the status of required modules (Loaded/Missing).
- [ ] **Task:** Write tests for the improved error detection logic in `ServerManager`.
- [ ] **Task:** Update `ServerManager.setupProcessLogging()` in `src/utils/serverLogic.ts` to detect `ModuleNotFoundError` in the stderr of Python processes and display an actionable Notice to the user with the exact `pip install` command for the *configured* Python path.
- [ ] **Task:** Conductor - User Manual Verification 'Settings Tab UI & Error Messaging' (Protocol in workflow.md)

### Phase 4: Final Verification
- [ ] **Task:** Run all tests and verify full integration across Mouse, Keyboard, and UVC components.
- [ ] **Task:** Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
