# Napoleon

Agent Driven Development Manager - CLI tool for managing multiple Claude Code SDK sessions with git worktree isolation.

Napoleon is a powerful development tool that leverages the Claude Code SDK to manage multiple AI agents working on different parts of your project simultaneously, each in their own isolated git worktree.

## Installation

### Global Installation
```bash
npm install -g napoleon
```

### Direct Usage (NPX)
```bash
npx napoleon
```

## Requirements

- Node.js >= 18.0.0
- Git >= 2.20.0
- Claude Code SDK (automatically managed)

## Usage

### Start the terminal interface
```bash
napoleon
```

The terminal interface will launch by default. You can also explicitly use:
```bash
napoleon start
```

### Check agent status
```bash
napoleon status
```

### Show help
```bash
napoleon --help
```

## Features

- **Modern React-based Terminal UI** - Built with Ink for better performance and reliability
- Multiple concurrent Claude Code SDK sessions
- Git worktree isolation for each agent
- Session persistence and recovery
- Cross-platform compatibility (macOS, Linux, Windows)
- Enhanced API key management and authentication
- Terminal compatibility across iTerm2, Windows Terminal, GNOME Terminal, and more
- Real-time agent communication and coordination

## Modern UI 🎉

Napoleon features a modern React-based terminal UI built with Ink! This provides excellent performance, broad terminal compatibility, and a responsive user experience across all supported platforms.

## Configuration

Configuration files are stored in `~/.napoleon/`:
- `config.json` - Application configuration
- `sessions.json` - Active session data
- `logs/` - Application logs
- `api-keys.json` - Encrypted API key storage

## Development

### Install dependencies
```bash
npm install
```

### Run tests
```bash
npm test
```

### Lint code
```bash
npm run lint
```

### Format code
```bash
npm run format
```

## License

MIT