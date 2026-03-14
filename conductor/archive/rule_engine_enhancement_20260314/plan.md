# Implementation Plan: Rule Engine Enhancement

## Objective
Complete and enhance the `rule_engine` HTML app with a modernized JSON rule structure, advanced matching (regex/wildcard), sequential/delayed actions, and automated lifecycle management.

## Key Files & Context
- `apps/rule_engine/index.html`: Main UI and existing logic (to be refactored).
- `apps/rule_engine/ruleEngineCore.js`: New module for core rule logic (to be created).
- `apps/rule_engine/ruleEngine.test.js`: New Vitest suite for core logic (to be created).
- `apps/lib/socketcluster-client.min.js`: SocketCluster client library.

## Implementation Plan

### Phase 1: Core Logic Refactoring & Test Setup [checkpoint: ef4784d]
The goal is to move rule matching and trigger logic into a testable JavaScript module.

- [x] Task: Create `apps/rule_engine/ruleEngineCore.js` with the basic rule structure and export it. 7706878
- [x] Task: Move `matchRule`, `partialMatch`, and `processRuleTrigger` logic from `index.html` to `ruleEngineCore.js`. 7706878
- [x] Task: Set up `src/tests/ruleEngine.test.ts` to test the logic in `ruleEngineCore.js` using Vitest and JSDOM (if needed). 7706878
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) 620631c
### Phase 2: Advanced Matching (TDD)
Implement the 4 matching modes and fix the "Once per Change" throttle state clearing bug.

- [x] Task: Write failing tests for `matchMode` (exact, regex, wildcard). 315f72c
- [x] Task: Implement `matchMode` logic in `ruleEngineCore.js`. 315f72c
- [x] Task: Write failing tests for "Once per Change" state clearing. 2300823
- [x] Task: Implement state clearing logic (updating `_lastPayload` for all messages on a channel). 2300823
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) ee9cbd2


### Phase 3: Sequential & Delayed Actions (TDD)
Implement support for multiple `then` blocks with optional delays.

- [x] Task: Write failing tests for sequential actions in the `then` array. 02bb52f
- [x] Task: Write failing tests for action delays using Vitest's fake timers. 02bb52f
- [x] Task: Implement `executeActions` logic in `ruleEngineCore.js`. 02bb52f
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) 6252aac

### Phase 4: Automation & Lifecycle
Implement autostart and file loading via URL parameters.

- [x] Task: Implement `getRulesFromFile(filename)` utility using the Slides-Studio API. 0f5f7a0
- [x] Task: Implement URL parameter check for `autostart` and `file`. 0f5f7a0
- [x] Task: Implement `startEngine(rules)` lifecycle method in `ruleEngineCore.js`. 0f5f7a0
- [x] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md) a610411

### Phase 5: UI Redesign & Integration
Update the HTML app to use the new core module and redesign the editor UI.

- [x] Task: Update `index.html` to import and use `ruleEngineCore.js`. cf34e57
- [x] Task: Redesign the rule editor to support multiple `then` blocks (dynamic list). 55949f7
- [x] Task: Add UI controls for `active` toggle and fix loading bug. 620631c
- [x] Task: Add UI controls for `matchMode` selector and action `delay` inputs. ffc8676, 55949f7
- [x] Task: Update Save/Load logic to handle the new hierarchical JSON schema. 8114b23
- [x] Task: Fix bug where rules fail to trigger after loading from vault. 8f85d13
- [ ] Task: Final end-to-end manual verification in OBS/Obsidian.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)

## Verification & Testing
- **Automated**: Vitest suite for `ruleEngineCore.js` covering all matching modes, throttling, and sequential actions.
- **Manual**:
    1. Open `rule_engine/index.html`, create a regex rule, and verify it triggers on matching SocketCluster messages.
    2. Create a rule with multiple `then` actions and delays, and verify the order and timing of published messages.
    3. Verify that `index.html?autostart=true&file=test.json` loads and starts automatically.
    4. Verify that "Once per Change" rules reset correctly after a different message arrives.

## Phase: Review Fixes
- [x] Task: Apply review suggestions ce70d51
