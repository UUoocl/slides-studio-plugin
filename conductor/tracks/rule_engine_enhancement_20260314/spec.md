# Specification: Rule Engine Enhancement

## Overview
This track focuses on completing and enhancing the `rule_engine` HTML app (`apps/rule_engine/index.html`). The goal is to evolve the rule engine into a more powerful tool with a modernized rule structure that supports complex matching, sequential actions, and automated lifecycle management.

## Functional Requirements

### 1. New Rule Data Structure
The rule format will be completely rewritten to be more flexible and easier to extend. Backward compatibility with older rule formats is NOT required.

**Proposed Format:**
```json
{
  "id": "string",
  "name": "string",
  "active": "boolean",
  "if": {
    "channel": "string",
    "payload": "string|object",
    "matchMode": "partial | exact | regex | wildcard"
  },
  "then": [
    {
      "channel": "string",
      "payload": "string|object",
      "delay": "number (ms)"
    }
  ],
  "throttle": {
    "mode": "always | change | interval",
    "value": "number (ms)"
  }
}
```

### 2. Advanced Matching
- **Regex/Wildcard Support**: Update `matchRule` logic to implement the `matchMode` options:
    - `partial`: Subset matching for objects, inclusion for strings.
    - `exact`: Strict equality.
    - `regex`: Regular expression matching for strings.
    - `wildcard`: Glob-like patterns (e.g., `*`, `?`).

### 3. Corrected Throttle Logic (State Clearing)
- **Problem**: The current "Once per Change" throttle only triggers if the matching payload itself changes. If a non-matching payload arrives on the same channel, the rule's state isn't reset, preventing subsequent triggers of the same matching payload.
- **Solution**: After a channel message is received, even if it doesn't trigger the "THEN" action, its value should update the rule's `_lastPayload`. This "clears" the previous state, allowing the rule to trigger again if the next matching message is identical to the one before the "clearing" message.

### 4. Sequential & Delayed Actions
- **Action Array**: A single trigger can execute multiple actions defined in the `then` array.
- **Action Delays**: Each action in the array can have an optional `delay`.
- **Execution Flow**: Actions are triggered in the order they appear in the array. Delays are relative to the initial trigger time.

### 5. Automation & Lifecycle
- **Autostart Parameter**: Support `?autostart=true` in the URL.
- **Startup Logic**: If autostarted, the app must:
    1. Load the rule set specified in another parameter `?file=filename.json` (or the last used file).
    2. Automatically activate all rules and start listening to channels.

### 6. HTML App UI/UX Enhancements
- **Rule Editor**: Redesign the HTML app's UI to support the new `if` structure and multiple `then` blocks.
- **Match Mode Selector**: Add a dropdown to choose the `matchMode`.
- **Dynamic Action List**: Allow adding/removing/reordering actions in the `then` list.
- **Persistence**: Rules are saved and loaded correctly using the new JSON schema via existing Slides-Studio file APIs.

## Non-Functional Requirements
- **Efficiency**: Maintain low latency for high-frequency message processing.
- **Clarity**: The UI should clearly distinguish between different matching modes and show action sequences.

## Acceptance Criteria
- [ ] The app uses the new hierarchical JSON format for all rules.
- [ ] Rules can have multiple "THEN" actions, each with its own delay.
- [ ] All four `matchMode` options (partial, exact, regex, wildcard) are functional.
- [ ] "Once per Change" throttling resets correctly when a different, non-matching payload is received on the same channel.
- [ ] Opening `rule_engine/index.html?autostart=true&file=myrules.json` successfully loads and activates the rules.
- [ ] The HTML app UI allows full management of the new rule structure.

## Out of Scope
- Support for legacy rule formats.
- Backend (Node/TypeScript) rule execution.
- Custom JavaScript scripting within rules.
- **Custom Obsidian Integration**: No changes to the Obsidian plugin's native UI (Ribbon, Sidebar, Settings Tab, etc.) are required.
