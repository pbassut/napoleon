# US034: Update Documentation and Configuration for SDK Architecture

## Status
Approved

## Story
**As a** developer and stakeholder,
**I want** project documentation to accurately reflect the SDK-based architecture,
**so that** all references to process-based operations are removed and replaced with SDK terminology throughout the project.

## Acceptance Criteria
1. Remove PID field documentation from data model schemas
2. Update Napoleon brownfield PRD to reflect SDK architecture
3. Update migration script to handle SDK sessions instead of process references
4. All documentation internally consistent with SDK terminology
5. Existing documentation structure and formatting maintained
6. New SDK terminology follows existing documentation patterns
7. Integration with current development workflow preserved
8. Schema changes reflect new SDK-based data model
9. Migration script updated to handle SDK session structures

## Tasks / Subtasks
- [ ] Update data model schema documentation (AC: 1, 4, 8)
  - [ ] Remove PID field documentation from `/docs/prd/data-models-and-schema-changes.md:27`
  - [ ] Update session structure documentation to reflect SDK fields
  - [ ] Replace process terminology with SDK session terminology
  - [ ] Ensure schema consistency across all documentation references
- [ ] Update Napoleon brownfield PRD documentation (AC: 2, 5, 6)
  - [ ] Update session structure references at `/docs/napoleon-brownfield-prd.md:104,248`
  - [ ] Replace process-based architecture descriptions with SDK-based architecture
  - [ ] Maintain existing PRD formatting and structure patterns
  - [ ] Update technical implementation sections to reflect SDK approach
- [ ] Update migration script for SDK compatibility (AC: 3, 9)
  - [ ] Modify `/bin/migrate-to-napoleon.js:208,215` for SDK session handling
  - [ ] Remove PID handling logic from migration script
  - [ ] Add SDK session initialization for migrated agents
  - [ ] Ensure migration maintains backward compatibility for existing data
- [ ] Comprehensive documentation review and consistency check (AC: 4, 7)
  - [ ] Search and replace all process/PID terminology with SDK equivalents
  - [ ] Update architectural diagrams to show SDK-based flow
  - [ ] Verify all cross-references between documents remain valid
  - [ ] Ensure development workflow documentation reflects SDK changes

## Dev Notes

### Previous Story Insights
**US032 & US033 Context:** UI components and core agent management have been updated to use SDK sessions. Documentation must now accurately reflect these implementation changes and remove outdated process references.

### Documentation Structure Requirements
**Existing Documentation Patterns:** [Source: architecture/source-tree-integration.md#integration-guidelines]
- Follow existing kebab-case file naming conventions
- Maintain current folder organization in `/docs/` directory
- Preserve existing markdown formatting and section structures
- Keep cross-reference linking patterns consistent

**PRD Structure Maintenance:** [Source: architecture/coding-standards-and-conventions.md#documentation-style]
- JSDoc comments for public methods updated to reflect SDK
- Inline comments for complex logic updated
- README for user-facing documentation maintained
- Detailed error messages updated with SDK context

### Data Model Documentation Updates
**New Session Structure:** [Source: architecture/data-models-and-schema-changes.md#session-data-evolution]
```javascript
{
  id: "agent-xxx",
  instructions: "...",
  spawnTime: "ISO-8601",
  status: "running",       // Simplified: running, idle, error
  workingDirectory: "/path",
  worktreePath: "/path",
  worktreeName: "agent-xxx",
  gitRoot: "/path",
  lastActivity: "ISO-8601",
  logs: [],
  
  // SDK-specific fields:
  sdkStatus: "active",     // active, aborted, completed
  lastMessageId: "msg-xxx" // For recovery/resume
}
```

**Schema Changes Required:** [Source: architecture/data-models-and-schema-changes.md#schema-integration-strategy]
- Remove `pid` field entirely from all documentation
- Remove `process` reference documentation
- Add SDK session field documentation
- Update session validation logic documentation

### Migration Script Requirements
**Migration Strategy:** [Source: architecture/data-models-and-schema-changes.md#schema-integration-strategy]
- Clean break approach: new sessions use new structure
- No migration of existing process-based sessions required
- Existing session storage pattern maintained
- New SDK session initialization for fresh starts

**Compatibility Requirements:** [Source: architecture/coding-standards-and-conventions.md#critical-integration-rules]
- Session JSON structure remains readable for existing sessions
- New fields are additive only for backward compatibility
- Migration script handles mixed session environments gracefully

### File Locations
**Documentation Files:** [Source: architecture/source-tree-integration.md#existing-project-structure]
- `/docs/prd/data-models-and-schema-changes.md` - Schema documentation updates
- `/docs/napoleon-brownfield-prd.md` - Main PRD architectural updates
- `/bin/migrate-to-napoleon.js` - Migration script SDK compatibility
- `/docs/architecture/` - All architecture document consistency checks

### Technical Terminology Updates
**Global Rebrand Requirements:** [Source: architecture/coding-standards-and-conventions.md#critical-integration-rules-napoleon-rebrand]
- All references to "napoleon" → "napoleon" throughout documentation
- CLI command documentation: `napoleon` → `napoleon`
- Directory references: `.napoleon/` → `.napoleon/`
- Environment variable docs: ADD_MANAGER_* → NAPOLEON_*

**SDK Terminology Standardization:**
- "Process spawning" → "SDK session initialization"
- "Process termination" → "SDK session abort"
- "PID tracking" → "Session ID tracking"
- "Process validation" → "SDK session status checking"
- "CPU/Memory monitoring" → "SDK session metrics" (if applicable)

### Integration Workflow Preservation
**Development Workflow:** [Source: architecture/testing-strategy.md#integration-with-existing-tests]
- Jest testing framework documentation unchanged
- Test organization patterns maintained in documentation
- Coverage requirements documentation updated for SDK components
- CI/CD pipeline documentation reflects SDK changes

**Documentation Maintenance Patterns:**
- Keep existing review and approval processes
- Maintain documentation versioning approach
- Preserve stakeholder communication formats
- Continue using existing documentation tools and formats

### Testing

**Documentation Validation Requirements:**
- All code examples in documentation must reflect SDK implementation
- Cross-references between documents verified as functional
- Technical accuracy validated against actual SDK implementation
- Consistency check across all documentation files

**Testing Standards:** [Source: architecture/testing-strategy.md#regression-testing]
- Documentation examples should be testable where applicable
- Migration script changes tested with actual session data
- Schema documentation validated against actual data structures
- PRD technical sections verified against implementation

**Specific Testing Requirements:**
- Migration script testing with various session data scenarios
- Documentation link validation across all files
- Technical accuracy verification for all SDK references
- Consistency verification for terminology usage

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-19 | 1.0 | Initial story creation from Napoleon SDK Migration epic | Bob (Scrum Master) |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*This section will be populated by the QA Agent after story completion*