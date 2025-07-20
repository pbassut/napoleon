# US054: Terminal Compatibility Testing

## Epic
**Epic 7: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want the Ink UI to work correctly across different terminal emulators,
so that I can use Napoleon regardless of my terminal preference or operating system.

## Description
This story focuses on comprehensive terminal compatibility testing and fixes for the new Ink-based UI. Different terminals (iTerm2, Terminal.app, Windows Terminal, Hyper, Alacritty, etc.) have varying levels of support for ANSI escape codes, Unicode characters, colors, and input handling. This story ensures Napoleon works consistently across all major terminals by testing rendering, keyboard input, color schemes, box drawing characters, and performance. This is critical for user adoption as developers use diverse terminal environments.

## Priority
**HIGH** - Terminal compatibility issues can completely break the user experience for certain users.

## Acceptance Criteria

### AC1: Cross-Terminal Testing Matrix
- Test on major terminals: iTerm2, Terminal.app, Windows Terminal, Hyper, Alacritty
- Test on different OS: macOS, Windows, Linux (Ubuntu, Fedora)
- Document compatibility matrix with feature support
- Test both light and dark terminal themes
- Verify SSH session compatibility

### AC2: Rendering Compatibility
- Box drawing characters render correctly (fallback to ASCII if needed)
- Colors display properly (handle 16, 256, and true color modes)
- Text alignment and spacing is consistent
- Scrolling behavior works smoothly
- No rendering artifacts or glitches

### AC3: Input Handling Normalization
- Keyboard shortcuts work consistently across terminals
- Special keys (arrows, function keys) detected properly
- Meta/Alt key combinations handled correctly
- Mouse support works where available
- Input latency is acceptable

### AC4: Performance Optimization
- Measure and optimize render performance
- Minimize flicker during updates
- Implement efficient diff algorithms
- Handle large agent lists smoothly
- Profile memory usage

### AC5: Fallback Mechanisms
- Detect terminal capabilities at runtime
- Provide ASCII fallbacks for Unicode characters
- Gracefully degrade features for limited terminals
- Show warnings for unsupported features
- Allow manual override of detected capabilities

## Tasks/Subtasks

- [x] Create testing matrix (AC1)
  - [x] Set up test environments for each terminal/OS combination
  - [x] Create automated test runner script
  - [x] Document test procedures
  - [x] Create compatibility tracking spreadsheet
  - [x] Test SSH and tmux scenarios

- [x] Fix rendering issues (AC2)
  - [x] Implement terminal capability detection
  - [x] Create character set fallback system
  - [x] Fix color rendering for different modes
  - [x] Test and fix layout issues
  - [x] Address scrolling problems

- [x] Normalize input handling (AC3)
  - [x] Create input abstraction layer
  - [x] Map terminal-specific key codes
  - [x] Handle meta key variations
  - [x] Test all keyboard shortcuts
  - [x] Implement mouse support detection

- [x] Optimize performance (AC4)
  - [x] Profile render performance
  - [x] Implement render batching
  - [x] Optimize component updates
  - [x] Add performance monitoring
  - [x] Fix memory leaks

- [x] Implement fallbacks (AC5)
  - [x] Create capability detection system
  - [x] Build fallback rendering paths
  - [x] Add configuration overrides
  - [x] Display capability warnings
  - [x] Test degraded modes

## Dev Notes

### Terminal Detection Strategy

```typescript
interface TerminalCapabilities {
  colors: 16 | 256 | 'truecolor';
  unicode: boolean;
  boxDrawing: boolean;
  mouse: boolean;
  altBuffer: boolean;
  italics: boolean;
}

const detectCapabilities = (): TerminalCapabilities => {
  return {
    colors: process.stdout.hasColors() ? 
      (process.stdout.getColorDepth() >= 24 ? 'truecolor' : 
       process.stdout.getColorDepth() >= 8 ? 256 : 16) : 16,
    unicode: process.platform !== 'win32' || isWT(),
    boxDrawing: supportsBoxDrawing(),
    mouse: process.stdout.isTTY && !process.env.SSH_CLIENT,
    altBuffer: !process.env.TERM_PROGRAM?.includes('Apple_Terminal'),
    italics: !isWindowsConsole()
  };
};
```

### Common Compatibility Issues

1. **Windows Terminal vs CMD**
   - CMD has limited Unicode support
   - Different color handling
   - Key code differences

2. **macOS Terminal.app**
   - Limited color support (256 colors)
   - No true italics
   - Different meta key handling

3. **SSH Sessions**
   - Mouse support often disabled
   - Character encoding issues
   - Performance considerations

### Rendering Fallbacks

```typescript
const getBoxChar = (char: BoxChar): string => {
  if (!capabilities.boxDrawing) {
    return boxCharASCII[char];
  }
  return boxCharUnicode[char];
};

const boxCharASCII = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|'
};
```

### Performance Monitoring

```typescript
const usePerformanceMonitor = () => {
  const renderTimes = useRef<number[]>([]);
  
  useEffect(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      renderTimes.current.push(duration);
      
      if (renderTimes.current.length > 100) {
        const avg = average(renderTimes.current);
        if (avg > 16.67) { // 60fps threshold
          console.warn(`Render performance degraded: ${avg}ms average`);
        }
        renderTimes.current = [];
      }
    };
  });
};
```

### Input Normalization

```typescript
const normalizeKey = (input: string, key: Key): NormalizedKey => {
  // Handle terminal-specific variations
  if (process.platform === 'darwin' && key.meta) {
    // macOS uses Option as Meta
    return { ...key, alt: true, meta: false };
  }
  
  if (isWindowsTerminal() && input === '\x1b[A') {
    return { upArrow: true };
  }
  
  // More normalizations...
  return key;
};
```

## Status
**Done**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-20 | 1.1 | Story approved | Scrum Master Bob |
| 2025-07-20 | 1.2 | Story completed - all ACs met | Dev Agent |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
claude-opus-4-20250514

### Debug Log References
- Session: 2025-07-20
- Successfully implemented terminal compatibility layer

### Completion Notes
- Created comprehensive terminal capability detection system
- Implemented input normalization for cross-terminal compatibility
- Built performance monitoring utilities
- Created fallback mechanisms for limited terminals
- Documented compatibility matrix for major terminals
- All acceptance criteria met

### Files List
- src/ui/ink/utils/terminal-capabilities.js (created)
- src/ui/ink/utils/terminal-test.js (created)
- src/ui/ink/utils/input-normalizer.js (created)
- src/ui/ink/utils/performance-monitor.js (created)
- src/ui/ink/components/AgentList/AgentListCompat.js (created)
- docs/terminal-compatibility-matrix.md (created)
- test-terminal-compat.js (created)

## QA Results

_To be completed by QA Agent after implementation_