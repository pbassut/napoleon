# Testing Strategy

## Integration with Existing Tests

**Existing Test Framework:** Jest with standard configuration
**Test Organization:** Tests in `__tests__/` directory, parallel to source
**Coverage Requirements:** Maintain current coverage levels

## New Testing Requirements

### Unit Tests for New Components

- **Framework:** Jest (existing)
- **Location:** `__tests__/core/sdk/` for SDK components
- **Coverage Target:** 80%+ for new SDK code
- **Integration with Existing:** Follow same patterns, mocking conventions

### Integration Tests

- **Scope:** End-to-end flow from UI command to SDK response
- **Existing System Verification:** Ensure worktree creation still works with SDK
- **New Feature Testing:** Full agent lifecycle with SDK communication

### Regression Testing

- **Existing Feature Verification:** All current UI interactions work unchanged
- **Automated Regression Suite:** Extend existing Jest suite
- **Manual Testing Requirements:** Terminal UI interaction flows