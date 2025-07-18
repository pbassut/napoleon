const chalk = require('chalk');
const inquirer = require('inquirer');
const GitStatusChecker = require('./git-status-checker');
const logger = require('../utils/logger');

/**
 * Startup Warning Display System
 * Handles git working tree status warnings during application startup
 */
class StartupWarningDisplay {
  constructor() {
    this.chalk = chalk;
    this.inquirer = inquirer;
    this.gitChecker = new GitStatusChecker();
  }

  /**
   * Display git working tree warning with actionable guidance
   * @param {Object} statusResult - Result from GitStatusChecker.checkWorkingTreeStatus()
   * @returns {Promise<string>} User choice ('exit' or 'continue')
   */
  async displayGitWarning(statusResult) {
    try {
      // Clear screen and show warning header
      console.clear();
      this.displayWarningHeader();

      // Show status details
      this.displayStatusDetails(statusResult);

      // Show actionable guidance
      this.displayActionableGuidance(statusResult);

      // Show detailed file information if requested
      this.displayDetailedFileInfo(statusResult);

      // Show risk explanation
      this.displayRiskExplanation();

      // Prompt for user choice
      return await this.promptUserChoice();

    } catch (error) {
      logger.error('Failed to display git warning', { error: error.message });
      // Fallback to safe default
      return 'exit';
    }
  }

  /**
   * Display warning header with Napoleon branding
   */
  displayWarningHeader() {
    console.log(this.chalk.yellow('┌─────────────────────────────────────────────────────────────┐'));
    console.log(this.chalk.yellow('│') + this.chalk.bold.yellow('  ⚠️  Napoleon - Git Working Tree Status Warning  ⚠️   ') + this.chalk.yellow('│'));
    console.log(this.chalk.yellow('└─────────────────────────────────────────────────────────────┘'));
    console.log();
  }

  /**
   * Display specific git status issues detected
   * @param {Object} statusResult - Git status result
   */
  displayStatusDetails(statusResult) {
    console.log(this.chalk.red.bold('Git Issues Detected:'));
    console.log();

    const message = this.gitChecker.generateWarningMessage(statusResult);
    const lines = message.split('\n');
    
    lines.forEach(line => {
      if (line.trim()) {
        console.log(this.chalk.red(`  ${line}`));
      }
    });
    console.log();
  }

  /**
   * Display actionable guidance for resolving git issues
   * @param {Object} statusResult - Git status result
   */
  displayActionableGuidance(statusResult) {
    console.log(this.chalk.cyan.bold('Recommended Actions:'));
    console.log();

    const recommendations = this.generateRecommendations(statusResult);
    recommendations.forEach(rec => {
      console.log(this.chalk.cyan(`  ${rec.icon} ${rec.action}`));
      if (rec.command) {
        console.log(this.chalk.gray(`     ${rec.command}`));
      }
    });
    console.log();
  }

  /**
   * Generate specific recommendations based on git status
   * @param {Object} statusResult - Git status result
   * @returns {Array} Array of recommendation objects
   */
  generateRecommendations(statusResult) {
    const recommendations = [];

    if (statusResult.hasUncommittedChanges) {
      recommendations.push({
        icon: '📝',
        action: 'Commit your current changes:',
        command: 'git add . && git commit -m "WIP: save current work"'
      });
    }

    if (statusResult.hasUntrackedFiles) {
      recommendations.push({
        icon: '📁',
        action: 'Handle untracked files:',
        command: 'git add . (to track files) or add to .gitignore'
      });
    }

    if (statusResult.hasStagedChanges) {
      recommendations.push({
        icon: '✅',
        action: 'Commit your staged changes:',
        command: 'git commit -m "commit staged changes"'
      });
    }

    // Always add the general recommendation
    recommendations.push({
      icon: '🔧',
      action: 'Or stash your changes temporarily:',
      command: 'git stash push -m "temp stash before napoleon"'
    });

    return recommendations;
  }

  /**
   * Display detailed file information
   * @param {Object} statusResult - Git status result
   */
  displayDetailedFileInfo(statusResult) {
    const fileInfo = this.gitChecker.getDetailedFileInfo(statusResult);
    let hasFiles = false;

    console.log(this.chalk.white.bold('Affected Files:'));
    console.log();

    if (statusResult.hasUncommittedChanges && fileInfo.modified) {
      console.log(this.chalk.yellow('  Modified files:'));
      console.log(this.chalk.gray(fileInfo.modified));
      hasFiles = true;
    }

    if (statusResult.hasUntrackedFiles && fileInfo.untracked) {
      console.log(this.chalk.blue('  Untracked files:'));
      console.log(this.chalk.gray(fileInfo.untracked));
      hasFiles = true;
    }

    if (statusResult.hasStagedChanges && fileInfo.staged) {
      console.log(this.chalk.green('  Staged files:'));
      console.log(this.chalk.gray(fileInfo.staged));
      hasFiles = true;
    }

    if (hasFiles) {
      console.log();
    }
  }

  /**
   * Display risk explanation for proceeding with dirty working tree
   */
  displayRiskExplanation() {
    console.log(this.chalk.white.bold('Why This Matters:'));
    console.log();
    
    const risks = [
      'Napoleon agents work in isolated git worktrees',
      'Dirty working tree can cause worktree creation conflicts',
      'Uncommitted changes may interfere with agent operations',
      'Clean state ensures reliable agent isolation'
    ];

    risks.forEach(risk => {
      console.log(this.chalk.white(`  • ${risk}`));
    });
    console.log();
  }

  /**
   * Prompt user for their choice on how to proceed
   * @returns {Promise<string>} User choice ('exit' or 'continue')
   */
  async promptUserChoice() {
    try {
      const answer = await this.inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: [
          {
            name: '🚪 Exit to resolve git issues first (recommended)',
            value: 'exit',
            short: 'Exit (recommended)'
          },
          {
            name: '⚠️  Continue anyway (I understand the risks)',
            value: 'continue',
            short: 'Continue with risks'
          }
        ],
        default: 'exit'
      }]);

      return answer.action;
    } catch (error) {
      logger.error('Failed to prompt user choice', { error: error.message });
      // Default to safe choice
      return 'exit';
    }
  }

  /**
   * Display exit message when user chooses to resolve issues
   */
  displayExitMessage() {
    console.log();
    console.log(this.chalk.green.bold('✅ Excellent choice!'));
    console.log(this.chalk.white('Please resolve the git issues above and run Napoleon again.'));
    console.log(this.chalk.gray('This ensures the best experience with agent worktree isolation.'));
    console.log();
  }

  /**
   * Display continue message when user chooses to proceed anyway
   */
  displayContinueMessage() {
    console.log();
    console.log(this.chalk.yellow.bold('⚠️  Proceeding with dirty working tree...'));
    console.log(this.chalk.white('Napoleon will continue, but you may encounter issues with:'));
    console.log(this.chalk.gray('  • Git worktree creation conflicts'));
    console.log(this.chalk.gray('  • Agent isolation problems'));
    console.log(this.chalk.gray('  • Merge conflicts with agent changes'));
    console.log();
    
    // Brief pause to let user read the warning
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(this.chalk.cyan('Starting Napoleon in 3 seconds...'));
        setTimeout(resolve, 3000);
      }, 1000);
    });
  }

  /**
   * Display non-git repository error message
   */
  displayNonGitRepoError() {
    console.clear();
    console.log(this.chalk.red.bold('❌ Git Repository Required'));
    console.log();
    console.log(this.chalk.white('Napoleon must be run from within a git repository.'));
    console.log(this.chalk.gray('This is required for agent worktree isolation.'));
    console.log();
    console.log(this.chalk.cyan.bold('To fix this:'));
    console.log(this.chalk.cyan('  1. Navigate to your project directory'));
    console.log(this.chalk.cyan('  2. Initialize git: git init'));
    console.log(this.chalk.cyan('  3. Add initial commit: git add . && git commit -m "initial commit"'));
    console.log(this.chalk.cyan('  4. Run Napoleon again'));
    console.log();
  }

  /**
   * Display git not available error message
   */
  displayGitNotAvailableError() {
    console.clear();
    console.log(this.chalk.red.bold('❌ Git Not Available'));
    console.log();
    console.log(this.chalk.white('Git is not installed or not available in your PATH.'));
    console.log();
    console.log(this.chalk.cyan.bold('To fix this:'));
    console.log(this.chalk.cyan('  • Install git from https://git-scm.com/'));
    console.log(this.chalk.cyan('  • Ensure git is in your system PATH'));
    console.log(this.chalk.cyan('  • Restart your terminal after installation'));
    console.log();
  }

  /**
   * Display comprehensive git validation error based on validation result
   * @param {Object} validationResult - Result from GitStatusChecker.validateGitRepository()
   */
  async displayGitValidationError(validationResult) {
    switch (validationResult.error) {
      case 'GIT_NOT_AVAILABLE':
        this.displayGitNotAvailableError();
        break;
      case 'NOT_IN_GIT_REPO':
        this.displayNonGitRepoError();
        break;
      case 'GIT_DIR_NOT_ACCESSIBLE':
        console.clear();
        console.log(this.chalk.red.bold('❌ Git Directory Not Accessible'));
        console.log();
        console.log(this.chalk.white('The git directory exists but is not accessible.'));
        console.log(this.chalk.gray('This may be due to permissions or corruption.'));
        console.log();
        break;
      default:
        console.clear();
        console.log(this.chalk.red.bold('❌ Git Validation Failed'));
        console.log();
        console.log(this.chalk.white(validationResult.message || 'Unknown git validation error'));
        console.log();
    }
  }
}

module.exports = StartupWarningDisplay;