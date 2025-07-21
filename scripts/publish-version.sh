#!/bin/bash

# Napoleon Combined Version Bump and Publish Script
# This script bumps version and publishes in one command

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"
DRY_RUN="${DRY_RUN:-false}"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
    echo "Usage: $0 <patch|minor|major|prerelease> [prerelease-identifier]"
    echo ""
    echo "This script will:"
    echo "1. Bump the version"
    echo "2. Run tests and linting"
    echo "3. Create git commit and tag"
    echo "4. Publish to npm"
    echo "5. Push git changes"
    echo ""
    echo "Examples:"
    echo "  $0 patch      # 1.0.0 -> 1.0.1 and publish"
    echo "  $0 minor      # 1.0.0 -> 1.1.0 and publish"  
    echo "  $0 major      # 1.0.0 -> 2.0.0 and publish"
    echo ""
    echo "Environment variables:"
    echo "  DRY_RUN=true  Show what would happen without making changes"
}

# Parse arguments
VERSION_TYPE="$1"
PRERELEASE_ID="$2"

if [[ -z "$VERSION_TYPE" || "$VERSION_TYPE" == "--help" ]]; then
    print_usage
    exit 0
fi

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major|prerelease)$ ]]; then
    print_error "Invalid version type: $VERSION_TYPE"
    print_usage
    exit 1
fi

# Change to project root
cd "$ROOT_DIR"

echo -e "${BLUE}Napoleon Combined Version Bump & Publish${NC}"
echo "========================================"
echo "Version type: $VERSION_TYPE"
if [[ -n "$PRERELEASE_ID" ]]; then
    echo "Prerelease ID: $PRERELEASE_ID"
fi
echo "Dry run: $DRY_RUN"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_step "Current version: $CURRENT_VERSION"

# Calculate new version
if [[ "$VERSION_TYPE" == "prerelease" && -n "$PRERELEASE_ID" ]]; then
    NEW_VERSION=$(npm version "$VERSION_TYPE" --preid="$PRERELEASE_ID" --no-git-tag-version --dry-run 2>/dev/null | grep -o 'v.*' | sed 's/v//')
else
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version --dry-run 2>/dev/null | grep -o 'v.*' | sed 's/v//')
fi

print_step "New version will be: $NEW_VERSION"

# Check git status
print_step "Checking git status..."
if [[ -n "$(git status --porcelain)" ]]; then
    print_error "Working directory has uncommitted changes. Please commit or stash them first."
    if [[ "$DRY_RUN" != "true" ]]; then
        exit 1
    fi
fi

# Check npm authentication
print_step "Checking npm authentication..."
if ! npm whoami >/dev/null 2>&1; then
    print_error "Not logged in to npm. Please run 'npm login' first."
    if [[ "$DRY_RUN" != "true" ]]; then
        exit 1
    fi
else
    NPM_USER=$(npm whoami)
    print_success "Logged in as: $NPM_USER"
fi

# Run tests
print_step "Running tests..."
if [[ "$DRY_RUN" != "true" ]]; then
    npm test
    print_success "Tests passed"
else
    echo "Would run: npm test"
fi

# Run linting
print_step "Running linter..."
if [[ "$DRY_RUN" != "true" ]]; then
    npm run lint
    print_success "Linting passed"
else
    echo "Would run: npm run lint"
fi

# Check if new version already exists on npm
print_step "Checking if new version exists on npm..."
PACKAGE_NAME=$(node -p "require('./package.json').name")
if npm view "$PACKAGE_NAME@$NEW_VERSION" version >/dev/null 2>&1; then
    print_error "Version $NEW_VERSION already exists on npm."
    exit 1
fi
print_success "Version $NEW_VERSION is available for publishing"

# Update version in package.json
print_step "Updating version in package.json..."
if [[ "$DRY_RUN" != "true" ]]; then
    if [[ "$VERSION_TYPE" == "prerelease" && -n "$PRERELEASE_ID" ]]; then
        npm version "$VERSION_TYPE" --preid="$PRERELEASE_ID" --no-git-tag-version
    else
        npm version "$VERSION_TYPE" --no-git-tag-version
    fi
    print_success "Version updated to $NEW_VERSION"
else
    echo "Would update package.json version to: $NEW_VERSION"
fi

# Create git commit and tag
print_step "Creating git commit and tag..."
if [[ "$DRY_RUN" != "true" ]]; then
    git add package.json
    git commit -m "chore: bump version to $NEW_VERSION

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    git tag "v$NEW_VERSION"
    print_success "Created commit and tag v$NEW_VERSION"
else
    echo "Would create commit: 'chore: bump version to $NEW_VERSION'"
    echo "Would create tag: v$NEW_VERSION"
fi

# Publish to npm
print_step "Publishing to npm..."
if [[ "$DRY_RUN" != "true" ]]; then
    npm publish
    print_success "Published $PACKAGE_NAME@$NEW_VERSION to npm"
else
    echo "Would run: npm publish"
fi

# Push to git
print_step "Pushing to git..."
if [[ "$DRY_RUN" != "true" ]]; then
    git push origin $(git rev-parse --abbrev-ref HEAD)
    git push origin "v$NEW_VERSION"
    print_success "Pushed commit and tag to git"
else
    echo "Would push commit and tag to git"
fi

echo ""
print_success "🎉 Successfully published $PACKAGE_NAME@$NEW_VERSION!"

if [[ "$DRY_RUN" != "true" ]]; then
    echo ""
    echo "📦 Package URL: https://www.npmjs.com/package/$PACKAGE_NAME"
    echo "📥 Install command: npm install -g $PACKAGE_NAME@$NEW_VERSION"
    echo ""
    echo "✅ Complete workflow finished:"
    echo "   1. ✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"  
    echo "   2. ✅ Tests and linting passed"
    echo "   3. ✅ Git commit and tag created"
    echo "   4. ✅ Published to npm"
    echo "   5. ✅ Pushed to git repository"
fi