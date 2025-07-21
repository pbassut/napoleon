#!/bin/bash

# Napoleon NPM Package Publishing Script
# This script handles the complete publishing workflow for the napoleon-cli package

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="napoleon-cli"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"
DIST_TAG="${DIST_TAG:-latest}"
DRY_RUN="${DRY_RUN:-false}"

echo -e "${BLUE}Napoleon CLI Publishing Script${NC}"
echo "=================================="
echo "Package: $PACKAGE_NAME"
echo "Root Directory: $ROOT_DIR"
echo "Distribution Tag: $DIST_TAG"
echo "Dry Run: $DRY_RUN"
echo ""

# Change to project root
cd "$ROOT_DIR"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate environment
print_step "Validating environment..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. Please run from the project root."
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from the project root."
    exit 1
fi

# Check required commands
for cmd in npm git node; do
    if ! command_exists "$cmd"; then
        print_error "$cmd is required but not installed."
        exit 1
    fi
done

print_success "Environment validation passed"

# Check npm authentication
print_step "Checking npm authentication..."
if ! npm whoami >/dev/null 2>&1; then
    print_error "Not logged in to npm. Please run 'npm login' first."
    exit 1
fi

NPM_USER=$(npm whoami)
print_success "Logged in as: $NPM_USER"

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_step "Current version: $CURRENT_VERSION"

# Check git status
print_step "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory has uncommitted changes."
    echo "Changed files:"
    git status --porcelain
    echo ""
    
    if [ "$DRY_RUN" != "true" ]; then
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Aborting due to uncommitted changes."
            exit 1
        fi
    fi
fi

# Check if we're on main/master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    print_warning "Not on main/master branch (current: $CURRENT_BRANCH)"
    
    if [ "$DRY_RUN" != "true" ]; then
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Aborting. Please switch to main/master branch for releases."
            exit 1
        fi
    fi
fi

print_success "Git status check passed"

# Run tests
print_step "Running tests..."
if ! npm test; then
    print_error "Tests failed. Please fix tests before publishing."
    exit 1
fi
print_success "Tests passed"

# Run linting
print_step "Running linter..."
if ! npm run lint; then
    print_error "Linting failed. Please fix linting errors before publishing."
    exit 1
fi
print_success "Linting passed"

# Build the project (if build script exists)
if npm run build >/dev/null 2>&1; then
    print_step "Building project..."
    npm run build
    print_success "Build completed"
fi

# Check if version already exists on npm
print_step "Checking if version exists on npm..."
if npm view "$PACKAGE_NAME@$CURRENT_VERSION" version >/dev/null 2>&1; then
    print_error "Version $CURRENT_VERSION already exists on npm."
    echo "Please update the version in package.json before publishing."
    echo "You can use: npm version patch|minor|major"
    exit 1
fi
print_success "Version $CURRENT_VERSION is available for publishing"

# Show what will be published
print_step "Checking package contents..."
echo "Files that will be published:"
npm pack --dry-run | grep -E '^\s*\w' | sort
echo ""

# Show package info
echo "Package information:"
echo "  Name: $(node -p "require('./package.json').name")"
echo "  Version: $(node -p "require('./package.json').version")"
echo "  Description: $(node -p "require('./package.json').description")"
echo "  Main: $(node -p "require('./package.json').main")"
echo "  Bin: $(node -p "JSON.stringify(require('./package.json').bin, null, 2)")"
echo ""

# Final confirmation
if [ "$DRY_RUN" != "true" ]; then
    print_warning "Ready to publish $PACKAGE_NAME@$CURRENT_VERSION"
    read -p "Are you sure you want to publish? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Publishing cancelled."
        exit 1
    fi
fi

# Publish the package
if [ "$DRY_RUN" = "true" ]; then
    print_step "DRY RUN: Would publish package..."
    npm publish --dry-run --tag "$DIST_TAG"
    print_success "Dry run completed successfully"
else
    print_step "Publishing package..."
    npm publish --tag "$DIST_TAG"
    
    # Tag the commit
    git tag "v$CURRENT_VERSION"
    git push origin "v$CURRENT_VERSION"
    
    print_success "Package published successfully!"
    print_success "Tagged commit as v$CURRENT_VERSION"
    
    echo ""
    echo "Installation command:"
    echo "  npm install -g $PACKAGE_NAME@$CURRENT_VERSION"
    echo ""
    echo "Package URL:"
    echo "  https://www.npmjs.com/package/$PACKAGE_NAME"
fi

print_success "Publishing workflow completed!"