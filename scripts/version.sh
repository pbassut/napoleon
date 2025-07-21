#!/bin/bash

# Napoleon Version Management Script
# Helps manage version bumps and changelog updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"

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
    echo "Examples:"
    echo "  $0 patch      # 1.0.0 -> 1.0.1"
    echo "  $0 minor      # 1.0.0 -> 1.1.0"  
    echo "  $0 major      # 1.0.0 -> 2.0.0"
    echo "  $0 prerelease # 1.0.0 -> 1.0.1-0"
    echo "  $0 prerelease alpha # 1.0.0 -> 1.0.1-alpha.0"
    echo ""
    echo "Options:"
    echo "  --dry-run     Show what would happen without making changes"
    echo "  --no-git     Skip git operations (commit and tag)"
    echo "  --help       Show this help message"
}

# Parse arguments
VERSION_TYPE=""
PRERELEASE_ID=""
DRY_RUN=false
NO_GIT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        patch|minor|major|prerelease)
            VERSION_TYPE="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-git)
            NO_GIT=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            if [[ "$VERSION_TYPE" == "prerelease" && -z "$PRERELEASE_ID" ]]; then
                PRERELEASE_ID="$1"
            else
                print_error "Unknown argument: $1"
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$VERSION_TYPE" ]]; then
    print_error "Version type is required"
    print_usage
    exit 1
fi

# Change to project root
cd "$ROOT_DIR"

echo -e "${BLUE}Napoleon Version Management${NC}"
echo "=========================="
echo "Version type: $VERSION_TYPE"
if [[ -n "$PRERELEASE_ID" ]]; then
    echo "Prerelease ID: $PRERELEASE_ID"
fi
echo "Dry run: $DRY_RUN"
echo "Skip git: $NO_GIT"
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
if [[ "$NO_GIT" != "true" ]]; then
    print_step "Checking git status..."
    if [[ -n "$(git status --porcelain)" ]]; then
        print_error "Working directory has uncommitted changes. Please commit or stash them first."
        exit 1
    fi
    print_success "Working directory is clean"
fi

# Run tests before version bump
print_step "Running tests..."
if [[ "$DRY_RUN" != "true" ]]; then
    npm test
    print_success "Tests passed"
else
    echo "Would run: npm test"
fi

# Update version
print_step "Updating version..."
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

# Git operations
if [[ "$NO_GIT" != "true" ]]; then
    print_step "Creating git commit and tag..."
    if [[ "$DRY_RUN" != "true" ]]; then
        git add package.json
        git commit -m "chore: bump version to $NEW_VERSION"
        git tag "v$NEW_VERSION"
        print_success "Created commit and tag v$NEW_VERSION"
        
        echo ""
        print_step "To push the changes:"
        echo "  git push origin main"
        echo "  git push origin v$NEW_VERSION"
    else
        echo "Would create commit: 'chore: bump version to $NEW_VERSION'"
        echo "Would create tag: v$NEW_VERSION"
    fi
fi

echo ""
print_success "Version management completed!"
if [[ "$DRY_RUN" != "true" ]]; then
    echo ""
    echo "Next steps:"
    echo "1. Review the changes"
    echo "2. Push to remote: git push origin main && git push origin v$NEW_VERSION"
    echo "3. Publish to npm: npm run publish:prepare"
fi