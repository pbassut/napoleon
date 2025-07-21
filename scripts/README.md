# Napoleon Publishing Scripts

This directory contains scripts for managing the Napoleon CLI package publishing workflow.

## Scripts Overview

### `publish.sh` - NPM Publishing Script

Handles the complete publishing workflow for the napoleon-cli package.

**Features:**
- Environment validation (git, npm, node)
- Authentication check
- Git status verification  
- Test and lint execution
- Version conflict detection
- Package content preview
- Safe publishing with confirmations
- Automatic git tagging

**Usage:**
```bash
# Standard publish
npm run publish:prepare

# Dry run (preview only)
npm run publish:dry-run

# Direct script usage
./scripts/publish.sh

# With environment variables
DRY_RUN=true DIST_TAG=beta ./scripts/publish.sh
```

**Environment Variables:**
- `DRY_RUN=true` - Preview changes without publishing
- `DIST_TAG=<tag>` - NPM distribution tag (default: `latest`)

### `version.sh` - Version Management Script

Manages version bumps and changelog updates following semantic versioning.

**Usage:**
```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Minor version (1.0.0 -> 1.1.0)  
npm run version:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:major

# Prerelease (1.0.0 -> 1.0.1-0)
npm run version:prerelease

# Custom prerelease (1.0.0 -> 1.0.1-alpha.0)
./scripts/version.sh prerelease alpha

# Dry run
./scripts/version.sh patch --dry-run

# Skip git operations
./scripts/version.sh patch --no-git
```

**Options:**
- `--dry-run` - Preview changes without making them
- `--no-git` - Skip git commit and tagging
- `--help` - Show help message

## Complete Publishing Workflow

1. **Make your changes and commit them**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

2. **Update version**
   ```bash
   npm run version:patch  # or minor/major
   ```

3. **Push changes**
   ```bash
   git push origin main
   git push origin v<new-version>
   ```

4. **Publish to NPM**
   ```bash
   npm run publish:prepare
   ```

## Pre-publish Checks

The scripts automatically perform these checks:

- ✅ Git repository validation
- ✅ NPM authentication
- ✅ Working directory cleanliness
- ✅ Branch verification (main/master recommended)
- ✅ Test execution
- ✅ Linting validation
- ✅ Version conflict detection
- ✅ Package content preview

## Safety Features

- **Dry run mode** - Preview all changes before execution
- **Interactive confirmations** - Multiple confirmation prompts
- **Git status checks** - Warns about uncommitted changes
- **Version validation** - Prevents publishing existing versions
- **Rollback safety** - Git operations are atomic

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run publish:prepare` | Full publishing workflow |
| `npm run publish:dry-run` | Preview publishing changes |
| `npm run version:patch` | Bump patch version |
| `npm run version:minor` | Bump minor version |
| `npm run version:major` | Bump major version |
| `npm run version:prerelease` | Bump prerelease version |

## Troubleshooting

### "Not logged in to npm"
```bash
npm login
# Follow the prompts to authenticate
```

### "Version already exists"
```bash
# Update the version first
npm run version:patch
# Then publish
npm run publish:prepare
```

### "Tests failing"
```bash
# Fix the tests first
npm test
# Then try publishing again
```

### "Working directory has uncommitted changes"
```bash
# Commit your changes
git add .
git commit -m "your commit message"
# Or stash them temporarily
git stash
```

## Security Notes

- Scripts validate NPM authentication before publishing
- Git operations are performed safely with proper error handling
- Dry run mode allows safe testing of the workflow
- No sensitive information is logged or exposed

## Development

To modify these scripts:

1. Test with dry run mode first
2. Validate on a test package before using on production
3. Follow bash best practices (set -e, proper quoting, etc.)
4. Add appropriate logging and error handling