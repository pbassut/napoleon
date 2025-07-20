# Napoleon Terminal Compatibility Matrix

## Overview
This document tracks terminal compatibility for Napoleon's Ink-based UI across different terminal emulators and operating systems.

## Test Date: 2025-07-20

## Terminal Emulators Tested

### macOS Terminals

#### iTerm2 (v3.4+)
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full RGB support |
| Unicode | ✅ Yes | Excellent rendering |
| Box Drawing | ✅ Yes | Perfect alignment |
| Mouse Support | ✅ Yes | Full mouse tracking |
| Alt Buffer | ✅ Yes | Clean screen switching |
| Italics | ✅ Yes | Native support |
| Hyperlinks | ✅ Yes | OSC 8 support |
| Performance | ⭐⭐⭐⭐⭐ | Excellent |

**Verdict**: Recommended terminal for macOS users

#### Terminal.app (macOS Built-in)
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ❌ No | 256 colors only |
| Unicode | ✅ Yes | Good support |
| Box Drawing | ✅ Yes | Works well |
| Mouse Support | ⚠️ Limited | Basic support only |
| Alt Buffer | ❌ No | Screen artifacts possible |
| Italics | ❌ No | Not supported |
| Hyperlinks | ❌ No | No OSC 8 support |
| Performance | ⭐⭐⭐ | Adequate |

**Verdict**: Functional but limited. Consider upgrading to iTerm2.

#### Alacritty
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full support |
| Unicode | ✅ Yes | Excellent |
| Box Drawing | ✅ Yes | Perfect |
| Mouse Support | ✅ Yes | Full support |
| Alt Buffer | ✅ Yes | Works well |
| Italics | ✅ Yes | Supported |
| Hyperlinks | ❌ No | Not yet implemented |
| Performance | ⭐⭐⭐⭐⭐ | GPU accelerated |

**Verdict**: Excellent performance, missing hyperlinks

### Windows Terminals

#### Windows Terminal
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full support |
| Unicode | ✅ Yes | Excellent with proper fonts |
| Box Drawing | ✅ Yes | Works well |
| Mouse Support | ✅ Yes | Full support |
| Alt Buffer | ✅ Yes | Clean switching |
| Italics | ✅ Yes | Supported |
| Hyperlinks | ✅ Yes | OSC 8 support |
| Performance | ⭐⭐⭐⭐ | Very good |

**Verdict**: Recommended for Windows users

#### Command Prompt (cmd.exe)
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ❌ No | 16 colors only |
| Unicode | ❌ No | Limited, ASCII fallback needed |
| Box Drawing | ❌ No | Use ASCII characters |
| Mouse Support | ❌ No | Not supported |
| Alt Buffer | ❌ No | Not supported |
| Italics | ❌ No | Not supported |
| Hyperlinks | ❌ No | Not supported |
| Performance | ⭐⭐ | Limited |

**Verdict**: Not recommended. Use Windows Terminal instead.

#### PowerShell (Legacy)
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ❌ No | 16 colors |
| Unicode | ⚠️ Limited | Some support |
| Box Drawing | ⚠️ Limited | Partial |
| Mouse Support | ❌ No | Not supported |
| Alt Buffer | ❌ No | Not supported |
| Italics | ❌ No | Not supported |
| Hyperlinks | ❌ No | Not supported |
| Performance | ⭐⭐ | Basic |

**Verdict**: Limited support. Upgrade to Windows Terminal.

### Cross-Platform Terminals

#### Hyper
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full support |
| Unicode | ✅ Yes | Good support |
| Box Drawing | ✅ Yes | Works well |
| Mouse Support | ✅ Yes | Supported |
| Alt Buffer | ✅ Yes | Works |
| Italics | ✅ Yes | Supported |
| Hyperlinks | ✅ Yes | OSC 8 support |
| Performance | ⭐⭐⭐ | Can be slow (Electron) |

**Verdict**: Feature-rich but performance varies

### Linux Terminals

#### GNOME Terminal
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full support |
| Unicode | ✅ Yes | Excellent |
| Box Drawing | ✅ Yes | Perfect |
| Mouse Support | ✅ Yes | Full support |
| Alt Buffer | ✅ Yes | Works well |
| Italics | ✅ Yes | Supported |
| Hyperlinks | ✅ Yes | OSC 8 support |
| Performance | ⭐⭐⭐⭐ | Good |

**Verdict**: Excellent default choice for GNOME users

#### Konsole (KDE)
| Feature | Support | Notes |
|---------|---------|-------|
| True Color (24-bit) | ✅ Yes | Full support |
| Unicode | ✅ Yes | Excellent |
| Box Drawing | ✅ Yes | Perfect |
| Mouse Support | ✅ Yes | Full support |
| Alt Buffer | ✅ Yes | Works well |
| Italics | ✅ Yes | Supported |
| Hyperlinks | ✅ Yes | OSC 8 support |
| Performance | ⭐⭐⭐⭐ | Good |

**Verdict**: Excellent for KDE users

## SSH Compatibility

When using Napoleon over SSH:
- Mouse support is often disabled by default
- Performance may be affected by network latency
- Character encoding issues may occur (ensure UTF-8)
- Use `-X` or `-Y` flags for X11 forwarding if needed

## Environment Variable Overrides

Napoleon respects these environment variables for compatibility:

```bash
# Force ASCII mode (no Unicode)
export NAPOLEON_FORCE_ASCII=true

# Disable colors
export NAPOLEON_NO_COLOR=true

# Disable mouse support
export NAPOLEON_NO_MOUSE=true
```

## Recommendations by OS

### macOS
1. **Best**: iTerm2 (full feature support)
2. **Good**: Alacritty (great performance)
3. **Basic**: Terminal.app (built-in, limited)

### Windows
1. **Best**: Windows Terminal (recommended)
2. **Basic**: PowerShell (limited)
3. **Avoid**: Command Prompt (too limited)

### Linux
1. **GNOME**: GNOME Terminal (excellent)
2. **KDE**: Konsole (excellent)
3. **Minimal**: Alacritty (fast, lightweight)

## Known Issues

1. **Terminal.app**: No alternate buffer support can cause screen artifacts
2. **Windows CMD**: Requires ASCII fallback mode
3. **SSH Sessions**: Mouse support often disabled
4. **Tmux/Screen**: May interfere with some key bindings
5. **Slow Terminals**: Electron-based terminals (Hyper) may have performance issues

## Testing Your Terminal

Run the terminal compatibility test:

```bash
node src/ui/ink/utils/terminal-test.js
```

This will show:
- Detected terminal and capabilities
- Color support level
- Unicode/box drawing rendering
- Text style support
- Performance recommendations