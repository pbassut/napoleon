# US059: Fix Story Numbering Conflicts

## Epic
**Technical Debt**

## Story
As a Napoleon developer,
I want to resolve story numbering conflicts in the documentation,
so that each story has a unique identifier and the project documentation is consistent.

## Description
This story addresses critical numbering conflicts discovered in the story documentation. Multiple stories are using the same US number, which creates confusion and makes it impossible to track progress accurately. Specifically, US044, US047, and US051 have multiple files, and US051 appears twice in the STORY_INDEX with different descriptions. This cleanup will ensure each story has a unique identifier and all documentation is consistent.

## Priority
**HIGH** - Documentation integrity is essential for project management and developer clarity.

## Acceptance Criteria

### AC1: Resolve US044 Conflict
- Keep `US044_core_layout_components.md` as the official US044
- Archive or remove `US044_core_layout_components_dod.md`
- Verify US044 appears only once in STORY_INDEX
- Ensure no other references to the duplicate file
- Update any links or references

### AC2: Resolve US047 Conflict
- Keep `US047_spawn_dialog_implementation.md` as the official US047
- Archive or remove `US047_spawn_dialog_implementation_dod.md`
- Verify US047 appears only once in STORY_INDEX
- Ensure no other references to the duplicate file
- Update any links or references

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

- [ ] Fix US044 conflict (AC1)
  - [ ] Archive US044_core_layout_components_dod.md
  - [ ] Update any references
  - [ ] Verify STORY_INDEX accuracy
  - [ ] Test no broken links
  - [ ] Document decision

- [ ] Fix US047 conflict (AC2)
  - [ ] Archive US047_spawn_dialog_implementation_dod.md
  - [ ] Update any references
  - [ ] Verify STORY_INDEX accuracy
  - [ ] Test no broken links
  - [ ] Document decision

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

### Current Conflicts

```
US044:
- US044_core_layout_components_dod.md (5037 bytes)
- US044_core_layout_components.md (10661 bytes) ✓ KEEP

US047:
- US047_spawn_dialog_implementation_dod.md (4865 bytes)
- US047_spawn_dialog_implementation.md (11124 bytes) ✓ KEEP

US051:
- US051_spawn_dialog_multiline_input_enhancement.md (6787 bytes)
- US051_spawn_dialog_multiline_input.md (6234 bytes)
- US051_typescript_build_configuration.md (4865 bytes) → RENAME TO US060
```

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