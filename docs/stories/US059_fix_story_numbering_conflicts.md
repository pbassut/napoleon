# US059: Fix Story Numbering Conflicts

## Epic
**Technical Debt**

## Story
As a Napoleon developer,
I want to resolve story numbering conflicts in the documentation,
so that each story has a unique identifier and the project documentation is consistent.

## Description
This story addresses numbering conflicts and clarifies documentation structure. The investigation revealed that US044 and US047 have companion "_dod.md" files which are Definition of Done checklists (not duplicates), while US051 has a genuine numbering conflict - appearing twice in STORY_INDEX with different descriptions. This cleanup will ensure each story has a unique identifier, document the purpose of _dod.md files, and resolve the actual US051 conflict.

## Priority
**HIGH** - Documentation integrity is essential for project management and developer clarity.

## Acceptance Criteria

### AC1: Clarify US044 Files
- Keep both `US044_core_layout_components.md` (story) and `US044_core_layout_components_dod.md` (completion tracking)
- Document that _dod.md files are Definition of Done checklists, not duplicates
- Verify US044 appears only once in STORY_INDEX
- Update documentation to explain _dod.md file purpose
- No action needed - files serve different purposes

### AC2: Clarify US047 Files  
- Keep both `US047_spawn_dialog_implementation.md` (story) and `US047_spawn_dialog_implementation_dod.md` (completion tracking)
- Document that _dod.md files are Definition of Done checklists, not duplicates
- Verify US047 appears only once in STORY_INDEX
- Update documentation to explain _dod.md file purpose
- No action needed - files serve different purposes

### AC3: Resolve US051 Triple Conflict
- Determine which US051 to keep (appears to be multi-line input)
- Rename "TypeScript Build Configuration" story to next available number
- Remove any duplicate multi-line input stories
- Update STORY_INDEX to have only one US051
- Ensure Technical Debt section uses new number

### AC4: Prevent Future Conflicts
- Create a story number registry or validation script
- Document the process for claiming story numbers
- Add pre-commit hook to check for duplicates
- Update contributor guidelines
- Create numbered story template

### AC5: Verify Documentation Integrity
- All story files have unique numbers
- STORY_INDEX has no duplicate entries
- All story references are correct
- No broken links to renamed stories
- Clear audit trail of changes

## Tasks/Subtasks

- [ ] Analyze conflicts (All ACs)
  - [ ] Document all duplicate files
  - [ ] Check for references to duplicates
  - [ ] Determine which files to keep
  - [ ] Plan renumbering strategy
  - [ ] Create backup of current state

- [ ] Document DOD files (AC1, AC2)
  - [ ] Add README explaining _dod.md file purpose
  - [ ] Update contributor guidelines
  - [ ] Verify no actual conflicts for US044
  - [ ] Verify no actual conflicts for US047
  - [ ] Document DOD file convention

- [ ] Fix US051 conflict (AC3)
  - [ ] Identify next available number (likely US060)
  - [ ] Rename typescript build story
  - [ ] Remove duplicate multiline stories
  - [ ] Update STORY_INDEX entries
  - [ ] Fix all references

- [ ] Implement prevention (AC4)
  - [ ] Create validation script
  - [ ] Add pre-commit hook
  - [ ] Update documentation
  - [ ] Create story template
  - [ ] Test validation works

## Dev Notes

### File Analysis

```
US044:
- US044_core_layout_components_dod.md (5037 bytes) → Definition of Done checklist ✓ KEEP
- US044_core_layout_components.md (10661 bytes) → Main story file ✓ KEEP

US047:
- US047_spawn_dialog_implementation_dod.md (4865 bytes) → Definition of Done checklist ✓ KEEP
- US047_spawn_dialog_implementation.md (11124 bytes) → Main story file ✓ KEEP

US051: ACTUAL CONFLICT
- US051_spawn_dialog_multiline_input_enhancement.md (6787 bytes)
- US051_spawn_dialog_multiline_input.md (6234 bytes) → Possible duplicate
- US051_typescript_build_configuration.md (4865 bytes) → RENAME TO US060
```

### Definition of Done Files

The _dod.md files are completion tracking documents that contain:
- Requirements met checklist
- Coding standards compliance
- Testing status
- Functionality verification
- Story administration
- Dependencies and build status

These are NOT duplicates but important project tracking documents.

### STORY_INDEX Conflicts

Line 105: US051 as "Spawn Dialog Multi-line Input Enhancement"
Line 131: US051 as "TypeScript Build Configuration" (Technical Debt)

### Renumbering Strategy

1. Keep US051 for multi-line input (it's in main story flow)
2. Rename TypeScript Build Configuration to US060
3. Check if US052 (Test Suite Component Relocation) should be US061

### Archive Strategy

Create `docs/stories/archive/` directory for:
- Duplicate files
- Definition of Done files (if they're separate)
- Superseded stories

### Validation Script Example

```bash
#!/bin/bash
# check-story-numbers.sh

cd docs/stories
duplicates=$(ls US*.md | cut -d'_' -f1 | sort | uniq -d)

if [ -n "$duplicates" ]; then
  echo "ERROR: Duplicate story numbers found:"
  echo "$duplicates"
  exit 1
fi

echo "✓ No duplicate story numbers"
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for story number conflicts
if ! ./scripts/check-story-numbers.sh; then
  echo "Commit aborted due to story number conflicts"
  exit 1
fi
```

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_