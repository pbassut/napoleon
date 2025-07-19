# Migration Guide: Napoleon to Napoleon

This guide helps you migrate from Napoleon to Napoleon, which replaces CLI-based process spawning with the Claude Code SDK for improved reliability and performance.

## Quick Migration Checklist

> **Estimated Time**: 10-15 minutes
>
> **Prerequisites**: ✓ Node.js 18.0.0+, ✓ Anthropic API key
>
> **Steps**:
>
> - [ ] Back up existing Napoleon data (`cp -r ~/.napoleon ~/.napoleon-backup`)
> - [ ] Install Napoleon (`npm install -g napoleon`)
> - [ ] Set up API key (`export ANTHROPIC_API_KEY="your-key"`)
> - [ ] Run migration (`napoleon migrate` or automatic on first run)
> - [ ] Verify agents appear in Napoleon dashboard
> - [ ] Test spawning a new agent
> - [ ] Uninstall Napoleon when comfortable (`npm uninstall -g napoleon`)
>
> **Need Help?** See [Getting Help](#getting-help) section below.

## Overview

Napoleon is the next evolution of Napoleon, offering:

- Direct SDK integration (no Claude CLI dependency)
- Better error handling and recovery
- Improved performance and reliability
- Same familiar terminal UI and workflow

## Prerequisites

Before migrating:

- Ensure you have Node.js 18.0.0 or higher installed
- Obtain an Anthropic API key from https://console.anthropic.com
- Back up your existing Napoleon session data (recommended)

## Migration Steps

### Step 1: Back Up Existing Data

```bash
# Create backup of your Napoleon data
cp -r ~/.napoleon ~/.napoleon-backup
```

### Step 2: Install Napoleon

```bash
# Install Napoleon globally
npm install -g napoleon

# Or use npx (no installation required)
npx napoleon
```

### Step 3: Set Up API Key

```bash
# Set your Anthropic API key as an environment variable
export ANTHROPIC_API_KEY="your-api-key-here"

# For permanent setup, add to your shell profile:
# ~/.bashrc, ~/.zshrc, or equivalent
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.zshrc
```

**For Development Projects**: If you're working on a specific project, you can create a `.env` file in your project directory for local development:

```bash
# Create .env file in your project root
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env

# Add .env to your .gitignore to keep API keys secure
echo ".env" >> .gitignore
```

### Step 4: Migrate Session Data

Napoleon includes automatic session migration. On first run, it will:

1. Detect existing Napoleon sessions
2. Convert session format (remove process IDs, add SDK fields)
3. Copy data to `~/.napoleon/`

For more control, use the dedicated migration script:

```bash
# Preview migration (dry run)
migrate-to-napoleon --dry-run

# Perform migration with verbose output
migrate-to-napoleon --verbose

# Force migration (overwrites existing Napoleon data)
migrate-to-napoleon --force
```

Migration script options:

- `--dry-run, -n`: Show what would be migrated without making changes
- `--force, -f`: Force migration even if Napoleon data exists
- `--verbose, -v`: Show detailed output
- `--help, -h`: Show help message

### Step 5: Uninstall Napoleon (Optional)

Once you've verified Napoleon is working correctly:

```bash
npm uninstall -g napoleon
```

## Command and Feature Comparison

| Napoleon               | Napoleon         | Notes                 |
| ---------------------- | ---------------- | --------------------- |
| `napoleon`             | `napoleon`       | Main command          |
| `~/.napoleon/`         | `~/.napoleon/`   | Config directory      |
| Claude CLI required    | API key required | Authentication method |
| Process-based agents   | SDK-based agents | Communication method  |
| All keyboard shortcuts | Same shortcuts   | No changes            |
| Terminal UI            | Same UI          | Identical experience  |

## Platform-Specific Notes

### macOS

- API key can be stored in Keychain for security
- Use `~/.zshrc` for environment variables (default shell)
- Homebrew formula coming soon

### Linux

- Add API key to `~/.bashrc` or `~/.bash_profile`
- SystemD service files compatible
- Works with all major distributions

### Windows

- Use System Environment Variables for API key
- PowerShell: `$env:ANTHROPIC_API_KEY = "your-key"`
- Windows Terminal fully supported

## Session Data Migration Details

The migration process handles:

- **Session files**: Converted from process-based to SDK-based format
- **Git worktrees**: Remain unchanged and fully compatible
- **Configuration**: Preferences carried over automatically

### Session Format Changes

```json
// Old format (Napoleon)
{
  "id": "agent-123",
  "pid": 12345,
  "status": "running",
  "workingDirectory": "/path/to/project"
}

// New format (Napoleon)
{
  "id": "agent-123",
  "sdkStatus": "active",
  "lastMessageId": "msg-xyz",
  "status": "running",
  "workingDirectory": "/path/to/project"
}
```

## Troubleshooting

### Common Issues

**API Key Not Found**

```bash
# Verify environment variable is set
echo $ANTHROPIC_API_KEY

# If empty, set it again
export ANTHROPIC_API_KEY="your-api-key"
```

**Session Migration Failed**

```bash
# Manual migration
cp ~/.napoleon/sessions.json ~/.napoleon/sessions.json

# Reset and try again
rm -rf ~/.napoleon
napoleon migrate
```

**Permission Errors**

```bash
# Fix permissions
chmod -R 755 ~/.napoleon
```

## Rollback Process

If you need to revert to Napoleon:

1. Your original data is preserved in `~/.napoleon-backup`
2. Reinstall Napoleon: `npm install -g napoleon`
3. Restore backup: `cp -r ~/.napoleon-backup ~/.napoleon`

## Getting Help

- **Documentation**: See README.md for full Napoleon documentation
- **Issues**: Report problems at https://github.com/pbassut/napoleon/issues
- **API Key Setup**: Detailed guide in API-KEY-SETUP.md

## Next Steps

After migration:

1. Verify all agents appear in Napoleon dashboard
2. Test spawning a new agent
3. Confirm git worktree integration works
4. Remove Napoleon once comfortable

Welcome to Napoleon! 🚀
