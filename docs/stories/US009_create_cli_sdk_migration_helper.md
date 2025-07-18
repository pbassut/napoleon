# Story 1.9: Create CLI to SDK Migration Helper Script

## User Story

As a developer migrating from ADD Manager to Napoleon,
I want an automated migration script that handles data transfer,
So that I can migrate my sessions and configuration without manual steps.

## Story Context

**Existing System Integration:**
- Integrates with: Session storage system, configuration management
- Technology: Node.js script, file system operations, JSON manipulation
- Follows pattern: Existing utility script patterns in utils/
- Touch points: ~/.add-manager/, ~/.napoleon/, session.json files

## Acceptance Criteria

**Functional Requirements:**
1. Script detects existing ADD Manager installation and data
2. Safely copies session data from ~/.add-manager/ to ~/.napoleon/
3. Transforms session format if needed (remove pid, add SDK fields)
4. Provides dry-run mode to preview changes5. Creates backup of original data before migration
6. Validates migrated data structure

**Integration Requirements:**
7. Script uses existing configuration loading patterns
8. Follows error handling conventions from utils/
9. Integrates with existing logger for output
10. Compatible with both package installations

**Quality Requirements:**
11. Script handles missing directories gracefully
12. Clear progress messages during migration
13. Detailed error messages for troubleshooting
14. Success confirmation with summary

## Technical Notes

- **Integration Approach:** Create bin/migrate-to-napoleon.js as standalone script
- **Existing Pattern Reference:** Follow patterns from utils/logger.js and config.js
- **Key Constraints:** Must not modify original ADD Manager data

## Definition of Done

- [ ] Migration script created and tested
- [ ] Dry-run mode implemented and verified
- [ ] Backup functionality tested
- [ ] Session format transformation working
- [ ] Error handling for edge cases complete
- [ ] Script added to package.json bin entries
- [ ] Migration guide updated to reference script

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk:** Data corruption during migration
- **Mitigation:** Automatic backup, dry-run mode, validation checks
- **Rollback:** Restore from automatic backup

**Compatibility Verification:**
- [ ] Works with different session.json formats
- [ ] Handles missing or corrupted data files
- [ ] Cross-platform file operations tested
- [ ] No dependencies on ADD Manager code

## Status: ✅ Approved - Ready for Implementation

**Priority**: MEDIUM  
**Approved by**: Scrum Master Bob  
**Date**: 2025-07-18

## Dev Agent Record

### Status
- **Current Status:** Ready for Review
- **Last Updated:** 2025-07-18

### Tasks
- [x] Create bin/migrate-to-napoleon.js migration script
- [x] Implement dry-run mode with preview functionality
- [x] Implement backup functionality before migration
- [x] Implement session format transformation (remove pid, add SDK fields)
- [x] Add comprehensive error handling for edge cases
- [x] Add script to package.json bin entries
- [x] Create tests for migration script
- [x] Update migration guide to reference script

### Agent Model Used
- Claude 3.5 Sonnet (Sonnet 4)

### Debug Log References
- Session: 2025-07-18

### Completion Notes
- [x] Migration script follows existing patterns from utils/
- [x] All acceptance criteria validated
- [x] Cross-platform compatibility verified
- [x] Error handling comprehensive

### File List
- [x] bin/migrate-to-napoleon.js (new)
- [x] __tests__/migrate-to-napoleon.test.js (new)
- [x] package.json (modified)
- [x] MIGRATION.md (modified)

### Change Log
- 2025-07-18: Added Dev Agent Record sections to story
- 2025-07-18: Started implementation of migration helper script
- 2025-07-18: Created comprehensive migration script with dry-run, backup, and validation features
- 2025-07-18: Added script to package.json bin entries for global access
- 2025-07-18: Created extensive test suite covering all migration scenarios
- 2025-07-18: Updated migration guide with detailed script usage instructions
- 2025-07-18: Completed all acceptance criteria and marked story ready for review

## QA Results

### Review Date: 2025-07-18
### Reviewed By: Quinn (Senior Developer QA)

### Code Quality Assessment
The migration script implementation is excellent and well-architected. The code follows modern Node.js patterns with proper error handling, comprehensive CLI argument parsing, and thorough validation. The separation of concerns is clean with factory functions for path generation, dedicated transformation functions, and proper async/await patterns throughout.

### Refactoring Performed
No refactoring was needed. The code is well-structured and follows best practices:
- **File**: bin/migrate-to-napoleon.js
  - **Change**: No changes needed - code is already well-structured
  - **Why**: The implementation follows excellent patterns with proper separation of concerns
  - **How**: Factory functions for paths, dedicated transformation logic, comprehensive error handling

### Compliance Check
- Coding Standards: ✓ Follows ESLint airbnb-base configuration, proper indentation and formatting
- Project Structure: ✓ Correctly placed in bin/ directory with proper shebang and module exports
- Testing Strategy: ✓ Comprehensive test suite with 24 passing tests covering all scenarios
- All ACs Met: ✓ All 14 acceptance criteria fully implemented and verified

### Improvements Checklist
All items handled successfully by the developer:

- [x] Comprehensive CLI argument parsing with help system
- [x] Robust error handling with detailed error messages
- [x] Cross-platform compatibility verified in tests
- [x] Proper file permissions (0o600/0o700) for security
- [x] Backup functionality with timestamped backups
- [x] Session and config transformation logic
- [x] Dry-run mode for safe testing
- [x] Validation of migrated data structure
- [x] Integration with package.json bin entries
- [x] Comprehensive test coverage (24 tests)
- [x] Updated migration guide with detailed usage

### Security Review
✓ Security considerations properly handled:
- File permissions set to 0o600 for sensitive files (sessions/config)
- Directory permissions set to 0o700 for .napoleon directory
- No hardcoded secrets or sensitive data
- Proper backup creation before any modifications
- Validation of data structure prevents corruption

### Performance Considerations
✓ Performance is appropriate for the migration task:
- Efficient file operations with proper error handling
- Minimal memory usage through streaming operations
- Proper async/await patterns prevent blocking
- No unnecessary file system operations

### Final Status
✓ Approved - Ready for Done

The migration script is production-ready with excellent code quality, comprehensive testing, and proper security measures. The implementation exceeds requirements with thoughtful features like timestamped backups, verbose logging, and robust error handling.