# US044: Core Layout Components Implementation

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to implement the core layout components (Header, Footer, MainContent) in Ink,
so that I have a foundational UI structure that matches the existing Blessed layout architecture.

## Description
With the Ink environment now set up (US043), this story implements the three core layout components that form the foundation of Napoleon's UI. These components will replicate the existing Blessed layout structure using Ink's React-based component model. The Header will display the Napoleon branding and version, the Footer will show help text and status information, and the MainContent container will host the agent list and other dynamic content. This establishes the visual framework for all subsequent UI migration work.

## Priority
**HIGH** - Core layout components are essential for all other UI elements and must be completed early in the migration process.

## Acceptance Criteria

### AC1: Implement Header Component
- Create Header.tsx component that displays "Napoleon" branding
- Show version number from package.json
- Match existing Blessed header styling (colors, alignment)
- Use Ink's Box and Text components with appropriate props
- Header stays fixed at top of terminal

### AC2: Implement Footer Component  
- Create Footer.tsx component with help text
- Display keyboard shortcuts (same as current: q=quit, n=new agent, etc.)
- Show agent count status (e.g., "3 agents running")
- Match existing Blessed footer styling and positioning
- Footer stays fixed at bottom of terminal

### AC3: Create MainContent Container
- Create MainContent.tsx as a flexible container component
- Accept children props for dynamic content
- Handle terminal resize events properly
- Implement scrollable area between header and footer
- Maintain proper spacing and overflow handling

### AC4: Integrate Layout in App Component
- Update App.tsx to use all three layout components
- Implement flexbox layout with proper height distribution
- Ensure header and footer have fixed heights
- MainContent fills remaining space dynamically
- Test layout stability during terminal resize

### AC5: Style and Theme Consistency
- Match Blessed color scheme (blue borders, white text, etc.)
- Implement consistent padding/margins across components
- Use Ink's borderStyle prop to match Blessed borders
- Ensure text is readable on various terminal backgrounds
- Document any styling limitations or differences

## Tasks/Subtasks

- [ ] Create Header component (AC1)
  - [ ] Create src/ui/ink/components/Layout/Header.tsx
  - [ ] Read version from package.json
  - [ ] Style with Box and Text components
  - [ ] Add Napoleon ASCII art or branding
  - [ ] Test fixed positioning

- [ ] Create Footer component (AC2)
  - [ ] Create src/ui/ink/components/Layout/Footer.tsx
  - [ ] Define keyboard shortcuts display
  - [ ] Add agent count prop and display
  - [ ] Style to match Blessed footer
  - [ ] Test fixed positioning

- [ ] Create MainContent container (AC3)
  - [ ] Create src/ui/ink/components/Layout/MainContent.tsx
  - [ ] Implement children prop handling
  - [ ] Add overflow handling
  - [ ] Test with placeholder content
  - [ ] Handle terminal resize events

- [ ] Integrate in App component (AC4)
  - [ ] Update App.tsx with layout components
  - [ ] Implement flexbox structure
  - [ ] Test height calculations
  - [ ] Verify resize behavior
  - [ ] Add basic state for agent count

- [ ] Apply consistent styling (AC5)
  - [ ] Create theme constants file
  - [ ] Apply colors to all components
  - [ ] Test in different terminals
  - [ ] Document styling approach
  - [ ] Note any Ink limitations

## Dev Notes

### Component Structure References

#### Header Component Example
```typescript
import React from 'react';
import { Box, Text } from 'ink';

export const Header: React.FC = () => {
  const version = require('../../../../package.json').version;
  
  return (
    <Box borderStyle="single" borderColor="blue" paddingX={1}>
      <Text color="white" bold>
        Napoleon v{version}
      </Text>
    </Box>
  );
};
```

#### Layout Pattern from Migration Plan
From the architecture design document:
- Use Ink's flexbox for layout (no absolute positioning)
- Box component with flexDirection="column" for main structure
- Fixed height boxes for header/footer
- Flexible Box for main content area

### Styling Guidelines

Current Blessed styling to match:
- Border: Single line, blue color
- Text: White primary, gray for secondary info
- Padding: 1 character horizontal padding in boxes
- Focus state: Bright blue for selected items

Ink equivalents:
- `borderStyle="single"` 
- `borderColor="blue"`
- `color="white"` for primary text
- `color="gray"` for secondary text

### Terminal Considerations

- Test in multiple terminals (from migration plan testing requirements)
- Ensure proper clearing and redrawing
- Handle various terminal sizes (minimum 80x24)
- Consider terminals with limited color support

### State Management Notes

For the footer agent count, use a simple prop for now:
```typescript
interface FooterProps {
  agentCount: number;
}
```

This will later connect to the AppContext when we implement state management.

### Important Migration Notes

From the component mapping document:
- Box component is direct equivalent to blessed.box
- Text component replaces blessed.text
- Use flexbox instead of absolute positioning
- Native percentage support for width/height

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-19 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-19 | 1.1 | Story approved | Scrum Master Bob |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name and version]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_