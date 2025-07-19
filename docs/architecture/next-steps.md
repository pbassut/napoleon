# Next Steps

## Story Manager Handoff

**Prompt for Story Manager:**

"I need to create implementation stories for the Napoleon project enhancement. This involves:

1. **Reference Architecture**: Review `/Users/patrickbassut/Programming/napoleon/docs/architecture.md` for the complete technical approach
2. **Key Integration Requirements** (validated):
   - Replace child process spawning with Claude Code SDK in `agent-manager.js`
   - Maintain exact same UI interface (no Terminal UI changes)
   - Preserve git worktree isolation mechanism
   - Keep session persistence compatible (with updated structure)

3. **Existing System Constraints**:
   - CommonJS module system (no ES modules)
   - Blessed-based terminal UI must remain unchanged
   - Jest testing framework in place
   - Node.js upgrade from 16 to 18 required

4. **First Story to Implement**:
   - Global rename from 'napoleon' to 'napoleon' throughout codebase
   - This includes package name, CLI command, directories, and all references
   - Must be completed before SDK integration begins

5. **Implementation Sequence**:
   - Story 1: Napoleon rebrand (global rename)
   - Story 2: Node.js 18 upgrade and SDK dependency addition
   - Story 3: SDK communication manager implementation
   - Story 4: Replace process spawning with SDK initialization
   - Story 5: Message transformation and UI integration
   - Story 6: Testing and validation

Emphasis on maintaining existing system integrity throughout implementation - each story must leave the system in a working state."

## Developer Handoff

**Prompt for Developers:**

"Starting implementation of Napoleon (formerly napoleon) enhancement:

1. **Architecture Reference**: See `/Users/patrickbassut/Programming/napoleon/docs/architecture.md` for complete technical design
2. **Coding Standards**: Follow existing patterns from `agent-manager.js`:
   - CommonJS modules (no ES modules)
   - 2-space indentation, semicolons required
   - ESLint with airbnb-base configuration
   - Jest for testing

3. **Key Technical Decisions**:
   - Claude Code SDK replaces CLI process spawning
   - Git worktree isolation remains unchanged
   - Terminal UI (blessed) stays exactly the same
   - Session JSON structure updated (no PID field)

4. **Integration Requirements**:
   - Only modify methods in `agent-manager.js`
   - Create new `src/core/sdk/` directory for SDK code
   - Maintain all existing method signatures
   - Transform SDK responses to match current UI format

5. **Implementation Sequence**:
   - First: Complete napoleon rebrand globally
   - Second: Add SDK dependency and update Node to v18
   - Third: Implement SDK communication in isolation
   - Fourth: Wire up SDK to replace process spawning
   - Finally: Comprehensive testing

6. **Verification Steps**:
   - All existing UI interactions work unchanged
   - Multiple agents can run concurrently
   - Session persistence and recovery functions
   - No regressions in terminal UI behavior

Remember: This is a surgical replacement - change only what's necessary for SDK integration."
