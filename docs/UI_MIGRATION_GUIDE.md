# Napoleon UI Migration Guide

## Welcome to the New Napoleon UI! 🎉

We're excited to announce that Napoleon has been upgraded to a modern, React-based terminal interface using Ink. This migration brings significant improvements in performance, reliability, and user experience.

## What's New?

### ✨ Key Improvements

- **Better Performance**: Faster rendering and more responsive interactions
- **Enhanced Compatibility**: Works consistently across all major terminals
- **Improved Navigation**: Smoother scrolling and keyboard shortcuts
- **Modern Architecture**: Built on React for better maintainability
- **Smart Rendering**: Only updates changed portions of the screen

### 🎯 Feature Parity

All features from the classic UI are available in the new UI:
- Agent management (spawn, terminate, view)
- Log viewing and searching
- Keyboard navigation
- Status indicators
- Multi-agent support

## Getting Started

### First Run

When you start Napoleon after the update, you'll see a welcome message introducing the new UI. Simply press any key to continue.

```bash
napoleon start
```

### Keyboard Shortcuts

The keyboard shortcuts remain the same:

| Action | Keys |
|--------|------|
| Navigate Up | `↑` or `k` |
| Navigate Down | `↓` or `j` |
| Select/Enter | `Enter` or `Space` |
| Go Back | `Escape` or `Backspace` |
| Spawn Agent | `n` or `a` |
| Terminate Agent | `t` or `x` |
| View Logs | `l` |
| Quit | `q` or `Ctrl+C` |
| Help | `?` or `h` |

## Terminal Compatibility

The new UI has been tested on:

### macOS
- ✅ iTerm2 (recommended)
- ✅ Terminal.app
- ✅ Alacritty
- ✅ Hyper

### Windows
- ✅ Windows Terminal (recommended)
- ⚠️ PowerShell (limited features)
- ❌ Command Prompt (use Windows Terminal instead)

### Linux
- ✅ GNOME Terminal
- ✅ Konsole
- ✅ xterm
- ✅ Alacritty

## Configuration

### UI Preferences

Your UI preferences are stored in `~/.napoleon/ui-config.json`:

```json
{
  "theme": {
    "primary": "#0969da",
    "background": "#0d1117"
  },
  "ui": {
    "animations": true,
    "compactMode": false
  }
}
```

### Environment Variables

Control UI behavior with environment variables:

```bash
# Disable animations
export NAPOLEON_NO_ANIMATIONS=true

# Force ASCII mode (for limited terminals)
export NAPOLEON_FORCE_ASCII=true

# Disable colors
export NAPOLEON_NO_COLOR=true
```

## Troubleshooting

### Temporary Switch to Classic UI

If you experience issues, you can temporarily use the classic UI:

```bash
# One-time use
napoleon start --use-legacy-ui

# Set as default (temporary)
export NAPOLEON_UI=blessed
```

**Note**: The classic UI will be removed on December 31, 2025.

### Common Issues

#### UI Doesn't Render Correctly

1. **Check Terminal**: Ensure you're using a supported terminal
2. **Force ASCII Mode**: 
   ```bash
   export NAPOLEON_FORCE_ASCII=true
   napoleon start
   ```
3. **Update Terminal**: Make sure your terminal emulator is up to date

#### Performance Issues

1. **Disable Animations**:
   ```bash
   export NAPOLEON_NO_ANIMATIONS=true
   ```
2. **Check Terminal Settings**: Disable transparency or visual effects
3. **Use Native Terminal**: Avoid terminal multiplexers if possible

#### Keyboard Shortcuts Not Working

1. **Check Terminal Settings**: Some terminals intercept certain keys
2. **Use Alternative Keys**: Most actions have multiple key bindings
3. **Raw Mode Issues**: Ensure your terminal supports raw mode

### SSH Sessions

When using Napoleon over SSH:

```bash
# Ensure UTF-8 encoding
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# If experiencing issues, force ASCII
export NAPOLEON_FORCE_ASCII=true
```

## Migration Timeline

- **Now - December 30, 2025**: Both UIs available
- **December 31, 2025**: Classic UI removed
- **January 1, 2026**: Only new UI available

## Feedback and Support

We want to hear from you! Please report any issues or feedback:

- **GitHub Issues**: https://github.com/pbassut/napoleon/issues
- **Feature Requests**: Tag with `ink-ui`
- **Bug Reports**: Include terminal type and OS

### Reporting Issues

When reporting issues, please include:

1. Terminal emulator and version
2. Operating system
3. Error messages or screenshots
4. Steps to reproduce

Example:
```
Terminal: iTerm2 3.4.19
OS: macOS 13.5
Issue: Scrolling jumps when using mouse
Steps: 1. Start Napoleon 2. Spawn 20+ agents 3. Try to scroll with mouse
```

## FAQ

### Q: Can I keep using the old UI?

A: Yes, until December 31, 2025. Use `napoleon start --use-legacy-ui`.

### Q: Will my settings be migrated?

A: Yes, your configuration will be automatically migrated on first run.

### Q: Is the new UI slower?

A: No, the new UI is actually faster in most cases. If you experience slowness, check the troubleshooting section.

### Q: Do all features work the same?

A: Yes, all features work the same way with the same keyboard shortcuts.

### Q: What if I find a bug?

A: Please report it on GitHub! We're committed to fixing any issues quickly.

## Thank You!

Thank you for using Napoleon and for your patience during this transition. We believe the new UI provides a much better experience and sets the foundation for exciting new features to come!

Happy coding! 🚀