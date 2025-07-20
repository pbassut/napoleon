# US066: Search Functionality Implementation

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user,
**I want** to search for agents and log content,
**so that** I can quickly find specific agents or debug information without manual scrolling.

## Description
Implement search functionality for both the main agent list view and the detail log view. This includes a search mode activated by `/`, navigation between matches, and visual highlighting of search results.

## Priority
**MEDIUM** - Enhances productivity for users with many agents

## Acceptance Criteria

### AC1: Agent List Search
- Pressing `/` in main view activates search mode
- Search input appears at bottom of screen
- Real-time filtering of agents as user types
- Case-insensitive search through agent names
- `Esc` cancels search and shows all agents
- `Enter` selects the first matching agent

### AC2: Detail View Log Search
- Pressing `/` in detail view activates search mode
- Search input shows at bottom with format: `🔍 Search: "query" 3/7`
- Shows current match position (e.g., 3/7 for third of seven matches)
- Highlights all matches in viewport
- Currently selected match has different highlight color

### AC3: Search Navigation
- `n` moves to next search match
- `N` moves to previous search match
- Wrap around when reaching end/beginning of matches
- Auto-scroll to show matched content
- Maintain match position when new logs arrive

### AC4: Search UI/UX
- Clear visual indicator when in search mode
- Show match count in search bar
- Highlight matches with appropriate color (yellow background)
- Current match uses different highlight (cyan background)
- Smooth scrolling between matches

## Tasks/Subtasks

- [ ] Create Search State Management (AC1, AC2)
  - [ ] Add search state to App component
  - [ ] Create search context for sharing state
  - [ ] Implement search mode toggle logic
  - [ ] Add search query state management

- [ ] Implement Agent List Search (AC1)
  - [ ] Add search input component for agent list
  - [ ] Implement real-time agent filtering
  - [ ] Add keyboard shortcut handler for `/`
  - [ ] Handle search mode activation/deactivation
  - [ ] Update agent list rendering for filtered results

- [ ] Implement Detail View Search (AC2, AC3)
  - [ ] Create search input component for detail view
  - [ ] Implement log content search algorithm
  - [ ] Add match highlighting logic
  - [ ] Calculate and display match count
  - [ ] Track current match position

- [ ] Add Search Navigation (AC3)
  - [ ] Implement next/previous match navigation
  - [ ] Add wrap-around logic for matches
  - [ ] Create auto-scroll to match functionality
  - [ ] Handle dynamic content updates during search

- [ ] Enhance Search UI (AC4)
  - [ ] Style search input components
  - [ ] Implement match highlighting with colors
  - [ ] Add current match distinction
  - [ ] Create smooth scrolling animations
  - [ ] Add search status indicators

- [ ] Testing and Integration
  - [ ] Unit tests for search algorithms
  - [ ] Integration tests for search UI
  - [ ] Performance tests with large datasets
  - [ ] Cross-terminal compatibility testing

## Dev Notes

### UI Specification Context
[Source: docs/napoleon-ui-specification/1-main-dashboard-agent-list-view.md#navigation-controls]
[Source: docs/napoleon-ui-specification/3-agent-detail-view-log-viewer.md#navigation-controls]

Search functionality is specified for both main agent list and detail view, with `/` as the universal search activation key.

### Implementation Architecture

**Search Components Structure:**
```
src/ui/ink/
├── components/
│   ├── Search/
│   │   ├── SearchInput.tsx       # Reusable search input component
│   │   ├── SearchHighlight.tsx   # Text highlighting component
│   │   ├── SearchStatus.tsx      # Match count display
│   │   └── index.ts
│   ├── AgentList/
│   │   └── AgentListSearch.tsx   # Agent list search integration
│   └── DetailView/
│       └── DetailViewSearch.tsx  # Detail view search integration
```

### Search State Management

**Search Context Structure:**
```typescript
interface SearchState {
  isSearchMode: boolean;
  searchQuery: string;
  matches: SearchMatch[];
  currentMatchIndex: number;
  totalMatches: number;
}

interface SearchMatch {
  lineIndex: number;
  columnStart: number;
  columnEnd: number;
  content: string;
}
```

### Agent List Search Implementation

**Filtering Logic:**
- Use Array.filter() with case-insensitive comparison
- Search through agent.name field
- Maintain original agent order when displaying filtered results
- Show "No matches found" message when no results

### Detail View Search Implementation

**Log Search Algorithm:**
- Parse log content line by line
- Use RegExp with 'gi' flags for case-insensitive global search
- Store match positions for highlighting
- Handle ANSI escape codes in terminal output

**Match Highlighting:**
- Use Ink's Transform component for text manipulation
- Apply background color to matched text
- Different color for current vs other matches
- Preserve original text formatting

### Keyboard Handling

**Input Interception:**
- Use Ink's useInput hook for keyboard events
- Check if not in text input mode before processing shortcuts
- Handle `/`, `n`, `N`, `Esc`, `Enter` appropriately

### Performance Considerations

**Large Log Optimization:**
- Implement virtual scrolling for search results
- Limit visible matches to viewport
- Use debouncing for real-time search
- Cache search results when possible

### Visual Design

**Search Input Styling:**
```
┌─────────────────────────────────────────────┐
│ 🔍 Search: authentication   3/7  [Esc] cancel │
└─────────────────────────────────────────────┘
```

**Match Highlighting Colors:**
- Regular match: Yellow background (#FFFF00)
- Current match: Cyan background (#00FFFF)
- Maintain text readability with appropriate foreground colors

## Testing

### Testing Strategy
- Unit tests for search algorithms and state management
- Integration tests for UI components
- Performance benchmarks with large datasets
- Manual testing across different terminals

### Test Cases
1. Search mode activates/deactivates correctly
2. Agent filtering works with various queries
3. Log search finds all matches accurately
4. Navigation between matches works correctly
5. Highlighting displays properly
6. Performance acceptable with 1000+ log lines

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial search functionality story | Bob (Scrum Master) |

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