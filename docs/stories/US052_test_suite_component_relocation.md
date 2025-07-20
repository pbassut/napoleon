# US052: Test Suite Component Relocation Updates

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to update the test suite to reflect the new component locations,
So that all tests pass and accurately test the refactored codebase.

## Description
Following the Ink environment setup (US043), many UI components were moved from `src/ui/components/` to `src/ui/blessed/components/`. This relocation has broken existing tests that reference the old paths. This story will update all test files to use the correct import paths and ensure the test suite passes completely.

## Priority
**LOW** - Tests are failing but not blocking development

## Acceptance Criteria

### AC1: Identify Affected Tests
- Run full test suite and document all failures
- Categorize failures by type (import errors, missing modules, etc.)
- Create comprehensive list of tests needing updates
- Identify any tests that may need deeper refactoring
- Document test coverage gaps if any

### AC2: Update Import Paths
- Update all test imports to use new component locations
- Fix references to `src/ui/components/*` → `src/ui/blessed/components/*`
- Update any mock paths or test utilities
- Ensure all imports resolve correctly
- Verify no runtime import errors

### AC3: Fix Test Compatibility
- Update tests for any API changes in moved components
- Fix any broken mocks or stubs
- Ensure test utilities work with new structure
- Update snapshot tests if needed
- Maintain same level of test coverage

### AC4: Verify Test Suite
- All tests must pass (`npm test`)
- No console errors or warnings during test runs
- Coverage reports generate correctly
- CI/CD test pipeline works
- Document any new test patterns established

## Tasks/Subtasks

- [ ] Analyze test failures (AC1)
  - [ ] Run npm test and capture all errors
  - [ ] Create list of affected test files
  - [ ] Categorize failure types
  - [ ] Identify complex fixes needed

- [ ] Update import paths (AC2)
  - [ ] Update blessed component test imports
  - [ ] Fix utility and helper imports
  - [ ] Update mock configurations
  - [ ] Search and replace old paths

- [ ] Fix test compatibility (AC3)
  - [ ] Update tests for API changes
  - [ ] Fix mock implementations
  - [ ] Update snapshot tests
  - [ ] Ensure proper test isolation

- [ ] Verify and document (AC4)
  - [ ] Run full test suite
  - [ ] Check coverage reports
  - [ ] Test in CI environment
  - [ ] Document any new patterns

## Dev Notes

### Current Test Structure
The project uses Jest for testing with the following structure:
```
__tests__/
├── unit/
│   ├── commands/
│   ├── services/
│   └── ui/
├── integration/
└── fixtures/
```

### Common Import Updates Needed
```javascript
// Old imports
const Component = require('../../src/ui/components/SomeComponent');

// New imports
const Component = require('../../src/ui/blessed/components/SomeComponent');
```

### Test Configuration
Current Jest config may need updates:
- Module name mapper for new paths
- Transform ignore patterns for TypeScript files
- Coverage collection patterns

### Potential Issues
1. **Circular Dependencies**: Moving files might expose circular dependencies
2. **Mock Boundaries**: Mocks may need restructuring for new boundaries
3. **Integration Tests**: May need updates for new UI initialization
4. **TypeScript Tests**: New .tsx files might need test configuration

### Testing Best Practices
- Keep tests close to the code they test
- Use consistent mocking patterns
- Ensure tests are deterministic
- Mock external dependencies appropriately

## Testing
- Run `npm test` - all tests should pass
- Run `npm test:coverage` - coverage should meet standards
- Verify no flaky tests introduced
- Ensure tests run quickly

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-19 | 1.0 | Initial technical debt story creation | Quinn (QA) |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_TBD_

### Debug Log References
_TBD_

### Completion Notes
_TBD_

### Files List
_TBD_

## QA Results

_To be completed by QA Agent after implementation_