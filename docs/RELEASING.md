# Release and Publishing Guide

## Overview

Napoleon CLI uses automated continuous deployment with two release channels:

- **Stable releases** (`@latest`) - Production-ready versions
- **Pre-releases** (`@next`) - Development builds from main branch

## Release Channels

### Stable Releases (`napoleon-cli@latest`)

Stable releases are created through tags and published automatically:

1. **Create a release** using the GitHub Actions workflow:
   - Go to Actions → Create Release
   - Select version type (patch/minor/major)
   - This creates a PR with version bump

2. **Merge the PR** to main

3. **Create and push a tag**:
   ```bash
   git checkout main
   git pull
   git tag v1.0.13  # Use the version from the PR
   git push origin v1.0.13
   ```

4. The tag push triggers automatic publishing to npm with `@latest` tag

### Pre-releases (`napoleon-cli@next`)

Pre-releases are automatically published on every push to main that changes source files:

- Triggered by changes to `src/`, `bin/`, or `package.json`
- Version format: `{version}-next.{timestamp}.{commit}`
- Example: `1.0.12-next.20240130120000.abc123f`

Users can install with:
```bash
npm install napoleon-cli@next
```

## Manual Version Bumping

Use npm scripts for version management:

```bash
npm run version:patch   # 1.0.12 → 1.0.13
npm run version:minor   # 1.0.12 → 1.1.0
npm run version:major   # 1.0.12 → 2.0.0
```

## Required Secrets

Ensure these secrets are configured in GitHub repository settings:

- `NPM_TOKEN` - npm automation token for publishing
- `GITHUB_TOKEN` - Already provided by GitHub Actions

## Workflow Files

- `.github/workflows/publish-stable.yml` - Publishes stable releases on tags
- `.github/workflows/publish-next.yml` - Publishes pre-releases from main
- `.github/workflows/release.yml` - Creates release PRs with version bumps

## Publishing Checklist

Before creating a stable release:

1. ✓ All tests passing on main
2. ✓ No linting errors
3. ✓ Update CHANGELOG if needed
4. ✓ Review and merge any pending PRs
5. ✓ Run the release workflow
6. ✓ Review and merge the release PR
7. ✓ Create and push the version tag