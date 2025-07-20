# Debugging React Performance in Napoleon

This guide explains how to use why-did-you-render to identify and fix performance issues in Napoleon's Ink-based terminal UI.

## Overview

Napoleon uses [why-did-you-render](https://github.com/welldone-software/why-did-you-render) to track unnecessary re-renders in React components. This tool helps identify performance bottlenecks by logging when components re-render and why.

## Enabling Performance Debugging

### Quick Start

1. Enable performance debugging by setting the environment variable:
   ```bash
   NAPOLEON_DEBUG_RENDERS=true npm run dev
   ```

2. Alternatively, run in development mode:
   ```bash
   NODE_ENV=development npm run dev
   ```

3. Or use the general debug flag:
   ```bash
   NAPOLEON_DEBUG=true npm run dev
   ```

### Viewing Debug Logs

When performance debugging is enabled, Ink's debug mode is automatically activated. This allows you to see console logs alongside the UI:

- **Debug logs appear below the UI** - The terminal is split with the UI at the top and logs at the bottom
- **Logs are preserved** - You can scroll through the debug output to see all re-render logs
- **Real-time updates** - Logs appear immediately as components re-render

The debug mode is essential for seeing why-did-you-render output, as the normal Ink UI would otherwise hide console logs.

### What Gets Tracked

By default, the following components are tracked:
- **App** - Main application component
- **AgentList** - Agent list container
- **AgentItem** - Individual agent items
- **SpawnDialog** - New agent creation dialog
- **TerminationDialog** - Agent termination confirmation
- **Header** - Application header
- **Footer** - Control instructions footer
- **MainContent** - Main content wrapper
- **DetailView** - Agent detail view
- **ModalOverlay** - Modal overlay component

## Understanding the Output

When a component re-renders unnecessarily, you'll see output like this:

```
──────────────────────────────────────────────────────────
🔍 Re-render: AgentItem
📦 Props changed:
   agent.status: "running" → "completed"
   isSelected: false → true
──────────────────────────────────────────────────────────
```

### Output Symbols
- 🔍 **Re-render** - Component re-rendered
- 📦 **Props changed** - Properties that changed
- 📊 **State changed** - State values that changed
- 🪝 **Hooks changed** - Hook values that changed

## Common Performance Issues and Solutions

### 1. Unnecessary Re-renders from Inline Functions

**Problem:**
```tsx
<AgentItem onClick={() => handleClick(agent.id)} />
```

**Solution:**
```tsx
const handleAgentClick = useCallback((id) => {
  handleClick(id);
}, [handleClick]);

<AgentItem onClick={handleAgentClick} />
```

### 2. Object/Array Props Creating New References

**Problem:**
```tsx
<AgentList agents={agents.filter(a => a.active)} />
```

**Solution:**
```tsx
const activeAgents = useMemo(
  () => agents.filter(a => a.active),
  [agents]
);

<AgentList agents={activeAgents} />
```

### 3. Modal Flickering

**Problem:** Modals re-render when parent components update.

**Solution:** The ModalOverlay component uses memoization and absolute positioning to prevent flickering. Ensure child components also use React.memo when appropriate.

### 4. Frequent Updates in Lists

**Problem:** AgentItem components re-render when unrelated agents update.

**Solution:** AgentItem uses React.memo with a custom comparison function that only checks relevant props:
```tsx
React.memo(AgentItem, (prevProps, nextProps) => {
  return prevProps.agent.id === nextProps.agent.id
    && prevProps.agent.status === nextProps.agent.status
    && prevProps.isSelected === nextProps.isSelected
    && prevProps.isFocused === nextProps.isFocused;
})
```

## Disabling Performance Debugging

To disable performance debugging:
1. Don't set any of the environment variables mentioned above
2. Run in production mode (default)

## Adding Tracking to New Components

To track a new component:

```tsx
// At the bottom of your component file
MyComponent.whyDidYouRender = true;
```

For custom tracking options:
```tsx
MyComponent.whyDidYouRender = {
  logOnDifferentValues: true,
  customName: 'My Custom Component',
  checkExtraProps: (prevProps, nextProps) => {
    // Custom comparison logic
    return prevProps.customProp !== nextProps.customProp;
  }
};
```

## Troubleshooting

### No Output Appearing

1. Verify environment variables are set correctly
2. Check that the component has `whyDidYouRender = true`
3. Ensure the component is actually re-rendering (add a console.log in render)

### Too Much Output

1. Focus on specific components by commenting out `whyDidYouRender` on others
2. Use the exclude pattern in wdyr.ts configuration

### Performance Impact

why-did-you-render only runs in development mode and has no impact on production builds. The tool is automatically excluded from production bundles.

## Best Practices

1. **Fix the biggest offenders first** - Focus on components that re-render most frequently
2. **Use React DevTools** - Complement why-did-you-render with React DevTools Profiler
3. **Measure before optimizing** - Don't add memoization everywhere; only where needed
4. **Test after changes** - Ensure optimizations don't break functionality

## Related Documentation

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Ink Performance Tips](https://github.com/vadimdemedes/ink#performance)
- [why-did-you-render Documentation](https://github.com/welldone-software/why-did-you-render)