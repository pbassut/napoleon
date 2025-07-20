# US068: Virtual Scrolling Performance Implementation

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user working with agents that generate extensive logs,
**I want** the detail view to handle large log files efficiently,
**so that** the UI remains responsive even with thousands of log lines.

## Description
Implement virtual scrolling for the agent detail view to efficiently handle large log outputs. This includes rendering only visible portions of logs, implementing efficient scrolling mechanisms, and maintaining smooth performance with bounded memory usage.

## Priority
**HIGH** - Critical for production use with long-running agents

## Acceptance Criteria

### AC1: Virtual Scrolling Implementation
- Only render log lines visible in the current viewport
- Maintain smooth scrolling performance with 10,000+ log lines
- Memory usage remains bounded regardless of total log size
- Scroll position accurately maintained during viewport changes

### AC2: Scroll Performance
- Scrolling remains smooth (60 FPS) with large logs
- No lag when jumping to different positions (top/bottom)
- Page Up/Down operations complete instantly
- Search operations remain responsive

### AC3: Scroll Indicators
- Show "↓ More below ↓" when content extends below viewport
- Show "↑ More above ↑" when scrolled down from top
- Display current position (e.g., "Lines 250-300 of 5000")
- Update indicators in real-time during scrolling

### AC4: Dynamic Content Handling
- New log lines append without disrupting scroll position
- Auto-scroll (follow mode) works with virtual scrolling
- Buffer management for efficient memory usage
- Maintain performance during rapid log generation

## Tasks/Subtasks

- [ ] Implement Virtual List Component (AC1)
  - [ ] Create VirtualList component for log rendering
  - [ ] Calculate visible range based on viewport
  - [ ] Implement efficient line height calculations
  - [ ] Add buffer zones above/below viewport

- [ ] Optimize Scroll Performance (AC2)
  - [ ] Implement RAF-based scroll handling
  - [ ] Add scroll position caching
  - [ ] Optimize render cycle for scroll events
  - [ ] Implement jump-to-position optimization

- [ ] Create Scroll Indicators (AC3)
  - [ ] Design scroll indicator components
  - [ ] Calculate content overflow detection
  - [ ] Implement position counter logic
  - [ ] Add real-time indicator updates

- [ ] Handle Dynamic Content (AC4)
  - [ ] Implement circular buffer for log storage
  - [ ] Add efficient append operations
  - [ ] Maintain scroll position during updates
  - [ ] Handle follow mode with virtual scrolling

- [ ] Memory Management
  - [ ] Implement log line limit (configurable)
  - [ ] Add LRU cache for rendered lines
  - [ ] Create memory usage monitoring
  - [ ] Implement garbage collection strategy

- [ ] Testing and Optimization
  - [ ] Performance benchmarks with large datasets
  - [ ] Memory profiling tests
  - [ ] Stress tests with rapid updates
  - [ ] Cross-terminal performance validation

## Dev Notes

### UI Specification Context
[Source: docs/napoleon-ui-specification/8-accessibility-usability.md#performance]

The specification emphasizes:
- Virtual scrolling for efficient large log handling
- Minimal redraws (only update changed sections)
- Memory efficiency with bounded log storage

### Implementation Architecture

**Virtual Scrolling Structure:**
```
src/ui/ink/
├── components/
│   ├── VirtualList/
│   │   ├── VirtualList.tsx        # Main virtual list component
│   │   ├── VirtualListItem.tsx    # Individual line renderer
│   │   ├── ScrollIndicators.tsx   # Scroll position indicators
│   │   └── utils.ts               # Calculation utilities
│   └── DetailView/
│       └── VirtualDetailView.tsx  # Virtual scrolling integration
├── hooks/
│   ├── useVirtualScroll.ts        # Virtual scrolling logic
│   └── useScrollPosition.ts       # Scroll state management
└── utils/
    └── logBuffer.ts               # Circular buffer for logs
```

### Virtual List Algorithm

**Viewport Calculation:**
```typescript
interface ViewportInfo {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  visibleCount: number;
}

const calculateViewport = (
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  totalItems: number
): ViewportInfo => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight)
  );
  return {
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
    totalHeight: totalItems * itemHeight,
    visibleCount: endIndex - startIndex + 1
  };
};
```

### Memory Management Strategy

**Circular Buffer Implementation:**
```typescript
class LogBuffer {
  private buffer: string[];
  private maxSize: number;
  private head: number = 0;
  private size: number = 0;
  
  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }
  
  append(line: string): void {
    this.buffer[this.head] = line;
    this.head = (this.head + 1) % this.maxSize;
    this.size = Math.min(this.size + 1, this.maxSize);
  }
  
  getLines(start: number, end: number): string[] {
    // Efficient slice with circular buffer logic
  }
}
```

### Scroll Indicator Design

**Indicator Positioning:**
```
┌─────────────────────────────────────────────┐
│ ❮ agent-xyz              ↑ More above ↑     │  <- Top indicator
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                             │
│ [Visible log content area]                  │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Lines 250-300 of 5000    ↓ More below ↓    │  <- Bottom indicator
└─────────────────────────────────────────────┘
```

### Performance Optimizations

**Rendering Strategy:**
1. Use React.memo for line components
2. Implement shouldComponentUpdate logic
3. Batch DOM updates with RAF
4. Debounce scroll events (16ms)
5. Pre-calculate line heights

**Follow Mode Integration:**
- Check if at bottom: scrollTop + height >= totalHeight - threshold
- Auto-scroll only when follow mode enabled
- Maintain virtual list efficiency during auto-scroll

### Configuration Options

**Tunable Parameters:**
```typescript
interface VirtualScrollConfig {
  maxLogLines: number;      // Default: 10000
  bufferSize: number;       // Lines to render outside viewport
  scrollDebounce: number;   // Milliseconds (default: 16)
  lineHeight: number;       // Pixels per line
  followThreshold: number;  // Pixels from bottom to trigger follow
}
```

## Testing

### Testing Strategy
- Performance benchmarks at various log sizes
- Memory usage profiling
- Scroll smoothness measurements
- Integration tests with real agent logs

### Performance Benchmarks
1. Initial render time with 10,000 lines
2. Scroll FPS with continuous scrolling
3. Memory usage over time
4. Jump-to-position performance
5. Append performance during active scrolling

### Test Scenarios
1. Rapid log generation (100 lines/second)
2. Large initial log load (50,000 lines)
3. Search through large logs
4. Terminal resize during scrolling
5. Follow mode with fast updates

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial virtual scrolling performance story | Bob (Scrum Master) |

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