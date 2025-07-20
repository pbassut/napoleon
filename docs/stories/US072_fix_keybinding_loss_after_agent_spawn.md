# US072: Fix Keybinding Loss After Agent Spawn

## Status
**Status:** Draft  
**Priority:** High  
**Type:** Bug  
**Assignee:** Unassigned  
**Estimated Effort:** Small (1-2 hours)

## Description
After spawning the first agent successfully using the 'n' key, subsequent attempts to spawn additional agents fail because the keybinding stops working. The 'n' key becomes unresponsive after the first agent is spawned.

## Acceptance Criteria
- [ ] The 'n' key continues to work after spawning the first agent
- [ ] Users can spawn multiple agents in succession without keybinding issues
- [ ] All other keybindings remain functional after agent spawn
- [ ] Focus is properly restored to the main app after closing the spawn dialog

## Technical Context
The issue likely stems from focus management in the Ink framework. When the SpawnDialog closes after spawning an agent, focus may not be properly restored to the main app component, causing the useInput hook to stop receiving keyboard events.

## Potential Root Causes
1. Focus not being restored to the main app after dialog closes
2. useInput hook being deactivated or not re-activated
3. Event listener conflicts between components
4. State management issue preventing proper re-rendering

## Implementation Notes
- Check focus management in SpawnDialog component
- Verify useInput hook activation in App.tsx
- Consider using useFocus() hook to manage focus states
- Test with Ink's focus debugging tools

## Testing
- Spawn an agent using 'n' key
- Verify agent spawns successfully
- Press 'n' again to spawn second agent
- Verify spawn dialog opens
- Repeat for third agent
- Test other keybindings (q, d, i) after spawning

## Definition of Done
- [ ] Root cause identified and documented
- [ ] Fix implemented and tested
- [ ] Can spawn multiple agents without keybinding loss
- [ ] All keybindings remain functional throughout app lifecycle
- [ ] No regression in other UI functionality