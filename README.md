# ADD Manager

Agent Driven Development Manager - CLI tool for managing multiple Claude CLI sessions with git worktree isolation.

> **Note**: ADD Manager is being superseded by [Napoleon](https://github.com/your-org/napoleon), which uses the Claude Code SDK instead of CLI processes. See the [Migration Guide](./MIGRATION.md) for upgrade instructions.

## Installation

### Global Installation
```bash
npm install -g add-manager
```

### Direct Usage (NPX)
```bash
npx add-manager
```

## Requirements

- Node.js >= 16.0.0
- Git >= 2.20.0
- Claude CLI (optional, for full functionality)
- Anthropic API key - [Setup Guide](./API-KEY-SETUP.md)

## Usage

### Start the terminal interface
```bash
add-manager start
```

### Check agent status
```bash
add-manager status
```

### Show help
```bash
add-manager --help
```

## Features

- Terminal-based user interface
- Multiple concurrent Claude CLI sessions
- Git worktree isolation for each agent
- Session persistence and recovery
- Cross-platform compatibility (macOS, Linux, Windows)

## Configuration

Configuration files are stored in `~/.add-manager/`:
- `config.json` - Application configuration
- `sessions.json` - Active session data
- `logs/` - Application logs

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