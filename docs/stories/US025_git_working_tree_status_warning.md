# US025: Git Working Tree Status Warning on Startup

## Epic
**Phase 3: UX Improvements and Startup Reliability**

## Story
As a developer,
I want to be warned about dirty git working tree state when starting Napoleon,
so that I can ensure a clean starting state and avoid potential conflicts with agent work.

## Description
This story implements a git working tree status check during application startup that warns users if their current working directory has uncommitted changes, untracked files, or other git state issues that could interfere with agent operations. The warning provides clear guidance on resolving the issues before proceeding.

## Priority
**High** - Critical UX improvement that prevents common workflow issues

## Acceptance Criteria

### AC1: Working Tree Status Detection
- System detects uncommitted changes in the current working directory
- System identifies untracked files that could interfere with agent operations
- System checks for staged changes that haven't been committed

### AC2: Clear Warning Display
- Warning message displays in terminal before main UI loads
- Warning includes specific details about what git issues were detected
- Warning message uses clear, actionable language for developers

### AC3: Actionable Guidance
- Warning provides specific commands to resolve detected issues
- Different guidance for different types of git state issues
- Option to continue anyway with explicit risk acknowledgment

### AC4: User Choice on Proceeding
- User can choose to continue despite warnings (with explicit confirmation)
- User can choose to exit to resolve issues first
- Default behavior is to wait for user input rather than auto-proceed

### AC5: Git Repository Context Validation
- System validates that current directory is in a git repository
- Clear error message if not in a git repository context
- Guidance on proper usage within git repositories

## Technical Requirements

### Git Status Check Implementation
```javascript
// Git status validation on startup
class GitStatusChecker {
  constructor() {
    this.statusCache = null;
    this.cacheTimeout = 5000; // 5 seconds
  }
  
  async checkWorkingTreeStatus() {
    try {
      // Check if in git repository
      const gitDir = await this.findGitDirectory();
      if (!gitDir) {
        throw new Error('Not in a git repository');
      }
      
      // Get git status
      const status = await this.getGitStatus();
      
      return {
        isClean: status.isClean,
        hasUncommittedChanges: status.modified.length > 0,
        hasUntrackedFiles: status.untracked.length > 0,
        hasStagedChanges: status.staged.length > 0,
        details: status
      };
    } catch (error) {
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }
  
  async getGitStatus() {
    const { execAsync } = require('../utils/process-helpers');
    
    // Get porcelain status for parsing
    const result = await execAsync('git status --porcelain');
    
    const modified = [];
    const untracked = [];
    const staged = [];
    
    result.stdout.split('\n').forEach(line => {
      if (line.trim()) {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status.startsWith('M') || status.startsWith('D')) {
          modified.push(file);
        } else if (status.startsWith('??')) {
          untracked.push(file);
        } else if (status.startsWith('A') || status.startsWith('M')) {
          staged.push(file);
        }
      }
    });
    
    return {
      isClean: modified.length === 0 && untracked.length === 0 && staged.length === 0,
      modified,
      untracked,
      staged
    };
  }
  
  generateWarningMessage(status) {
    const warnings = [];
    
    if (status.hasUncommittedChanges) {
      warnings.push(`• ${status.details.modified.length} file(s) have uncommitted changes`);
    }
    
    if (status.hasUntrackedFiles) {
      warnings.push(`• ${status.details.untracked.length} untracked file(s) present`);
    }
    
    if (status.hasStagedChanges) {
      warnings.push(`• ${status.details.staged.length} file(s) staged for commit`);
    }
    
    return warnings.join('\n');
  }
}
```

### Warning Display System
```javascript
// Terminal warning display
class StartupWarningDisplay {
  constructor() {
    this.chalk = require('chalk');
  }
  
  async displayGitWarning(statusResult) {
    console.log(this.chalk.yellow('\n⚠️  Git Working Tree Warning\n'));
    
    const message = new GitStatusChecker().generateWarningMessage(statusResult);
    console.log(this.chalk.yellow(message));
    
    console.log(this.chalk.cyan('\nRecommended actions:'));
    
    if (statusResult.hasUncommittedChanges) {
      console.log(this.chalk.cyan('  git add . && git commit -m "WIP: save current work"'));
    }
    
    if (statusResult.hasUntrackedFiles) {
      console.log(this.chalk.cyan('  git add . (to track files) or add to .gitignore'));
    }
    
    if (statusResult.hasStagedChanges) {
      console.log(this.chalk.cyan('  git commit -m "commit staged changes"'));
    }
    
    console.log(this.chalk.white('\nThis ensures agents work in clean isolated branches.'));
    
    return await this.promptUserChoice();
  }
  
  async promptUserChoice() {
    const inquirer = require('inquirer');
    
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'How would you like to proceed?',
      choices: [
        {
          name: 'Exit to resolve git issues first (recommended)',
          value: 'exit'
        },
        {
          name: 'Continue anyway (I understand the risks)',
          value: 'continue'
        }
      ],
      default: 'exit'
    }]);
    
    return answer.action;
  }
}
```

### Integration with Startup Flow
```javascript
// Modified application startup
class ApplicationStartup {
  constructor() {
    this.gitChecker = new GitStatusChecker();
    this.warningDisplay = new StartupWarningDisplay();
  }
  
  async validateEnvironment() {
    try {
      // Existing validations (Node.js version, etc.)
      await this.validateNodeVersion();
      await this.validateGitInstallation();
      
      // New: Git working tree status check
      const gitStatus = await this.gitChecker.checkWorkingTreeStatus();
      
      if (!gitStatus.isClean) {
        const userChoice = await this.warningDisplay.displayGitWarning(gitStatus);
        
        if (userChoice === 'exit') {
          console.log('\n✅ Good choice! Please resolve the git issues and try again.');
          process.exit(0);
        } else {
          console.log('\n⚠️  Proceeding with dirty working tree...\n');
          // Continue with startup
        }
      }
      
      return true;
    } catch (error) {
      if (error.message.includes('Not in a git repository')) {
        console.error('❌ Napoleon must be run from within a git repository.');
        console.error('Please navigate to your project directory and try again.');
        process.exit(1);
      }
      
      throw error;
    }
  }
}
```

## Dev Notes

### Previous Story Insights
- US024 completed keyboard shortcuts, establishing robust terminal UI patterns
- US013 implemented agent spawning with git worktree isolation
- US016-US018 established git integration patterns for worktree management

### Technical Implementation Details
- **Git Status Integration**: Uses `git status --porcelain` for reliable parsing [Source: architecture/existing-project-analysis.md#git-integration]
- **Startup Validation**: Integrates with existing Node.js and git validation in startup flow [Source: architecture/tech-stack-alignment.md#validation]
- **Terminal UI**: Uses chalk for colored output before blessed UI loads [Source: architecture/tech-stack-alignment.md#ui-framework]
- **User Interaction**: Uses inquirer for startup prompts before main UI [Source: architecture/coding-standards-and-conventions.md#user-interaction]

### File Locations
- New implementation: `src/core/git-status-checker.js` [Source: architecture/source-tree-integration.md#core-directory]
- Startup integration: `src/core/startup-validator.js` [Source: architecture/source-tree-integration.md#core-directory]
- CLI integration: `bin/napoleon.js` [Source: architecture/source-tree-integration.md#cli-entry-point]

### Testing Requirements
- Unit tests for git status parsing logic [Source: architecture/testing-strategy.md#unit-testing]
- Integration tests for startup validation flow [Source: architecture/testing-strategy.md#integration-testing]
- Mock git repository states for testing various scenarios [Source: architecture/testing-strategy.md#mocking]

### Technical Constraints
- Must work before blessed UI initialization [Source: architecture/tech-stack-alignment.md#ui-framework]
- Compatible with existing git version requirements (2.20.0+) [Source: architecture/existing-project-analysis.md#constraints]
- Maintains fast startup performance (<2 seconds) [Source: docs/prd.md#non-functional-requirements]

## Tasks / Subtasks

1. **Implement Git Status Checker Module** (AC: 1, 5)
   - Create `src/core/git-status-checker.js` with git status detection logic
   - Add git repository validation and error handling
   - Implement status parsing for modified, untracked, and staged files
   - Add unit tests for git status parsing scenarios

2. **Create Warning Display System** (AC: 2, 3)
   - Implement `StartupWarningDisplay` class with chalk formatting
   - Create actionable warning messages for different git states
   - Add user choice prompt system using inquirer
   - Add unit tests for warning message generation

3. **Integrate with Application Startup** (AC: 4, 5)
   - Modify `ApplicationStartup` to include git status validation
   - Add error handling for non-git repository contexts
   - Implement user choice handling (exit vs continue)
   - Add integration tests for startup validation flow

4. **Update CLI Entry Point** (AC: 1, 2, 4)
   - Modify `bin/napoleon.js` to call startup validation
   - Ensure proper error handling and user feedback
   - Add graceful exit handling for user choice to resolve issues
   - Test CLI integration with various git states

5. **Testing and Validation** (AC: All)
   - Create test fixtures for various git repository states
   - Add integration tests for complete startup flow
   - Test user interaction scenarios (exit vs continue)
   - Validate performance impact on startup time

## Definition of Done
- [ ] Git working tree status is checked on application startup
- [ ] Clear warnings are displayed for dirty working tree states
- [ ] Users receive actionable guidance for resolving git issues
- [ ] User can choose to exit or continue with explicit risk acknowledgment
- [ ] System validates git repository context before proceeding
- [ ] Startup time remains under 2 seconds despite additional checks
- [ ] Unit tests validate git status parsing logic
- [ ] Integration tests cover complete startup validation flow

## Notes
- This story addresses a critical UX issue that prevents common workflow problems
- Implements proactive validation rather than reactive error handling
- Maintains consistency with existing git integration patterns
- Provides educational value by teaching proper git hygiene
- Balances safety with user autonomy (can still proceed if needed)

## Related Stories
- US013: Agent Spawning Core Functionality (git repository context)
- US016: Git Worktree Creation (git isolation requirements)
- US017: Branch Isolation Management (clean branch creation)
- US002: Basic Terminal UI Foundation (startup validation patterns)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** HIGH

**Approved by:** Scrum Master Bob

**Date:** 2025-07-18

**Approval Notes:**
- Critical UX improvement that prevents common workflow friction
- Comprehensive implementation with proper git status detection
- Excellent user guidance with actionable resolution steps
- Maintains user autonomy while promoting git hygiene best practices
- Clean integration with existing startup validation patterns
- Performance-conscious design maintaining fast startup times