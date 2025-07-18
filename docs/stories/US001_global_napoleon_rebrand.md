# Story 1.1: Global Napoleon Rebrand

## User Story

As a developer,
I want to rebrand ADD Manager to Napoleon across the entire codebase,
so that the new package has a distinct identity and avoids confusion with the CLI-based version.

## Acceptance Criteria

1. Package.json name field updated from "add-manager" to "napoleon"
2. CLI command changed from `add-manager` to `napoleon` in bin/
3. All references to "add-manager" in code, comments, and documentation updated to "napoleon"
4. Configuration directory renamed from ~/.add-manager/ to ~/.napoleon/
5. Any ADD_MANAGER_* environment variables renamed to NAPOLEON_*
6. All user-facing messages updated with new branding
7. README and documentation reflect new name consistently

## Integration Verification

- IV1: Existing git worktree functionality works with new directory structure
- IV2: Session persistence loads from new ~/.napoleon/ location
- IV3: All terminal UI elements display correctly with new branding