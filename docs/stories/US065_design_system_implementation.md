# US065: Design System Implementation

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user,
**I want** consistent typography, colors, and spacing throughout the UI,
**so that** the interface is visually cohesive, professional, and easy to read.

## Description
Implement the complete design system as specified in the UI/UX specification document. This includes establishing the typography hierarchy, color palette, spacing system, and responsive behavior patterns that will be used consistently across all Napoleon UI components.

## Priority
**HIGH** - Foundation for all UI consistency

## Acceptance Criteria

### AC1: Typography System Implementation
- Implement bold white text for headers
- Regular white text for labels
- Yellow text for help messages
- Red text for error messages
- Green text for success messages
- Yellow text for system messages
- Dim white/gray for borders

### AC2: Color Palette Implementation
- Define and implement color constants for:
  - Primary: White (#FFFFFF)
  - Success: Green (#00FF00)
  - Warning: Yellow (#FFFF00)
  - Error: Red (#FF0000)
  - Info: Cyan (#00FFFF)
  - Muted: Gray (#808080)
  - Selection: Bright Blue (#0080FF)
- Ensure colors work across different terminal themes

### AC3: Spacing System
- Implement consistent padding of 1-2 lines between sections
- Ensure clean margins with consistent border spacing
- Single-spaced text with blank lines for separation
- Apply spacing consistently across all components

### AC4: Responsive Behavior
- Enforce minimum width of 80 characters
- Implement scalable content that adjusts to terminal size
- Add scroll indicators when content exceeds view
- Ensure modals are always centered regardless of terminal size

## Tasks/Subtasks

- [ ] Create Design System Constants Module (AC1, AC2)
  - [ ] Define typography constants and helper functions
  - [ ] Create color palette constants with terminal color codes
  - [ ] Add theme detection for light/dark terminal support
  - [ ] Create unit tests for color/typography helpers

- [ ] Implement Spacing System (AC3)
  - [ ] Create spacing constants and utilities
  - [ ] Define padding/margin helper functions
  - [ ] Create layout composition utilities
  - [ ] Add spacing unit tests

- [ ] Update Existing Components (AC1, AC2, AC3)
  - [ ] Update AgentList component to use design system
  - [ ] Update AgentItem component styling
  - [ ] Update DetailView component styling
  - [ ] Update Dialog components (SpawnDialog, LimitDialog)
  - [ ] Update Header/Footer components

- [ ] Implement Responsive Utilities (AC4)
  - [ ] Create terminal size detection utilities
  - [ ] Implement minimum width enforcement
  - [ ] Add content scaling logic
  - [ ] Create scroll indicator component
  - [ ] Implement modal centering utility

- [ ] Create Design System Documentation (AC1-4)
  - [ ] Document color usage guidelines
  - [ ] Document typography patterns
  - [ ] Document spacing conventions
  - [ ] Create example implementations

## Dev Notes

### UI Specification Context
[Source: docs/napoleon-ui-specification/7-design-system.md]

The design system provides the foundation for Napoleon's visual consistency. All UI components must adhere to these standards.

### Implementation Architecture

**File Structure:**
```
src/ui/ink/
├── design-system/
│   ├── colors.ts         # Color constants and utilities
│   ├── typography.ts     # Typography styles and helpers
│   ├── spacing.ts        # Spacing system and utilities
│   ├── responsive.ts     # Responsive behavior utilities
│   └── index.ts         # Main design system export
```

### Color Implementation Details

**Terminal Color Mapping:**
- Use Ink's color props for consistent cross-terminal support
- Map hex values to nearest terminal colors for compatibility
- Consider both 16-color and 256-color terminal support

**Example Color Constants:**
```typescript
export const COLORS = {
  primary: 'white',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'cyan',
  muted: 'gray',
  selection: 'blueBright'
};
```

### Typography Implementation

**Text Component Wrapper:**
Create a styled text component that applies typography rules:
```typescript
interface StyledTextProps {
  variant: 'header' | 'label' | 'help' | 'error' | 'success' | 'system';
  children: React.ReactNode;
}
```

### Spacing System

**Spacing Units:**
- Small: 0 lines (inline)
- Medium: 1 line
- Large: 2 lines
- Use Box component's padding/margin props

### Responsive Behavior

**Terminal Size Detection:**
- Use process.stdout.columns for width
- Use process.stdout.rows for height
- React to terminal resize events

**Scroll Indicators:**
- Show "↓ More below ↓" when content exceeds view
- Show "↑ More above ↑" when scrolled down
- Implement using Ink's measureElement hook

### Testing Requirements
[Source: Testing strategy would be in architecture docs]

- Unit tests for all design system utilities
- Visual regression tests for component styling
- Cross-terminal compatibility tests
- Responsive behavior tests at different terminal sizes

## Testing

### Testing Strategy
- Unit tests for all design system modules
- Integration tests for component styling application
- Manual testing across different terminal emulators
- Accessibility testing for color contrast

### Test Cases
1. Color constants return correct values
2. Typography helpers apply correct styles
3. Spacing utilities calculate correct values
4. Responsive utilities detect terminal size correctly
5. Components use design system consistently

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial design system implementation story | Bob (Scrum Master) |

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