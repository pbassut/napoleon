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
- Anthropic API key - [Setup Guide](./API-KEY-SETUP.md)

## Usage

### Start the terminal interface
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

- Terminal-based user interface
- Multiple concurrent Claude Code SDK sessions
- Git worktree isolation for each agent
- Session persistence and recovery
- Cross-platform compatibility (macOS, Linux, Windows)
- Enhanced API key management and authentication
- Real-time agent communication and coordination

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