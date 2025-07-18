# US026: Anthropic API Key Validation Before App Startup

## Epic
**Phase 3: UX Improvements and Startup Reliability**

## Story
As a developer,
I want my Anthropic API key to be validated before Napoleon starts,
so that I can ensure the SDK integration will work properly and avoid runtime failures.

## Description
This story implements comprehensive API key validation during application startup that checks for the presence, format, and basic validity of the Anthropic API key before initializing the Napoleon application. The validation provides clear guidance on obtaining and configuring API keys properly.

## Priority
**High** - Essential for Napoleon SDK integration reliability

## Acceptance Criteria

### AC1: API Key Presence Detection
- System checks for ANTHROPIC_API_KEY environment variable
- System validates the API key is not empty or whitespace
- Clear error messages when API key is missing or invalid

### AC2: API Key Format Validation
- System validates API key follows expected Anthropic format patterns
- System checks for common API key format errors (truncation, extra characters)
- Validation occurs without making network requests to preserve security

### AC3: Configuration Guidance
- System provides clear instructions for setting up API keys
- Links to official Anthropic documentation for API key generation
- Different guidance for different shell environments (bash, zsh, etc.)

### AC4: Security-First Error Messages
- Error messages never expose the actual API key value
- Masked display of API key prefix for validation feedback
- No logging of API key values in any system logs

### AC5: Startup Integration
- API key validation occurs before main application initialization
- Failed validation prevents application startup with clear exit messages
- Successful validation allows normal application startup flow

## Technical Requirements

### API Key Validation System
```javascript
// API key validation and security
class ApiKeyValidator {
  constructor() {
    this.logger = require('../utils/logger');
    this.chalk = require('chalk');
  }
  
  async validateApiKey() {
    try {
      const apiKey = this.getApiKeyFromEnvironment();
      
      if (!apiKey) {
        throw new Error('API key not found in environment variables');
      }
      
      const validation = this.validateKeyFormat(apiKey);
      
      if (!validation.isValid) {
        throw new Error(`Invalid API key format: ${validation.reason}`);
      }
      
      // Log successful validation without exposing key
      this.logger.info(`API key validated successfully (${this.maskApiKey(apiKey)})`);
      
      return {
        isValid: true,
        maskedKey: this.maskApiKey(apiKey)
      };
      
    } catch (error) {
      this.logger.error(`API key validation failed: ${error.message}`);
      throw error;
    }
  }
  
  getApiKeyFromEnvironment() {
    // Check multiple possible environment variable names
    const possibleKeys = [
      'ANTHROPIC_API_KEY',
      'CLAUDE_API_KEY',
      'CLAUDE_CODE_API_KEY'
    ];
    
    for (const keyName of possibleKeys) {
      const value = process.env[keyName];
      if (value && value.trim()) {
        return value.trim();
      }
    }
    
    return null;
  }
  
  validateKeyFormat(apiKey) {
    // Basic format validation without network calls
    const validations = [
      {
        test: apiKey.length >= 50,
        reason: 'API key appears too short'
      },
      {
        test: apiKey.length <= 200,
        reason: 'API key appears too long'
      },
      {
        test: /^[a-zA-Z0-9\-_]+$/.test(apiKey),
        reason: 'API key contains invalid characters'
      },
      {
        test: !apiKey.includes(' '),
        reason: 'API key contains spaces'
      },
      {
        test: apiKey.startsWith('sk-ant-'),
        reason: 'API key does not start with expected prefix'
      }
    ];
    
    for (const validation of validations) {
      if (!validation.test) {
        return {
          isValid: false,
          reason: validation.reason
        };
      }
    }
    
    return { isValid: true };
  }
  
  maskApiKey(apiKey) {
    // Show first 7 characters (sk-ant-) and last 4, mask the middle
    if (apiKey.length < 12) {
      return 'sk-ant-***';
    }
    
    const start = apiKey.substring(0, 7);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.min(apiKey.length - 11, 20));
    
    return `${start}${middle}${end}`;
  }
}
```

### Configuration Guidance System
```javascript
// API key setup guidance
class ApiKeySetupGuide {
  constructor() {
    this.chalk = require('chalk');
    this.os = require('os');
  }
  
  displaySetupInstructions() {
    console.log(this.chalk.red('\n❌ Anthropic API Key Required\n'));
    
    console.log(this.chalk.white('Napoleon requires an Anthropic API key to function.'));
    console.log(this.chalk.white('Please follow these steps to set up your API key:\n'));
    
    console.log(this.chalk.cyan('1. Get your API key:'));
    console.log(this.chalk.white('   Visit: https://console.anthropic.com/account/keys'));
    console.log(this.chalk.white('   Create a new API key if you don\'t have one\n'));
    
    console.log(this.chalk.cyan('2. Set the environment variable:'));
    this.displayShellSpecificInstructions();
    
    console.log(this.chalk.cyan('3. Verify the setup:'));
    console.log(this.chalk.white('   echo $ANTHROPIC_API_KEY | head -c 10'));
    console.log(this.chalk.white('   (Should display: sk-ant-***)\n'));
    
    console.log(this.chalk.yellow('⚠️  Security Note:'));
    console.log(this.chalk.yellow('   Never commit API keys to version control'));
    console.log(this.chalk.yellow('   Consider using a .env file for local development\n'));
    
    console.log(this.chalk.green('💡 Need help? Check our setup guide:'));
    console.log(this.chalk.green('   docs/API-KEY-SETUP.md\n'));
  }
  
  displayShellSpecificInstructions() {
    const shell = this.detectShell();
    
    switch (shell) {
      case 'zsh':
        console.log(this.chalk.white('   echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.zshrc'));
        console.log(this.chalk.white('   source ~/.zshrc'));
        break;
      case 'bash':
        console.log(this.chalk.white('   echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.bashrc'));
        console.log(this.chalk.white('   source ~/.bashrc'));
        break;
      case 'fish':
        console.log(this.chalk.white('   set -Ux ANTHROPIC_API_KEY "your-key-here"'));
        break;
      default:
        console.log(this.chalk.white('   export ANTHROPIC_API_KEY="your-key-here"'));
        console.log(this.chalk.white('   (Add to your shell profile for persistence)'));
    }
    console.log();
  }
  
  detectShell() {
    const shell = process.env.SHELL || '';
    
    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('bash')) return 'bash';
    if (shell.includes('fish')) return 'fish';
    
    return 'unknown';
  }
  
  displayFormatError(reason) {
    console.log(this.chalk.red('\n❌ API Key Format Error\n'));
    console.log(this.chalk.white(`Issue detected: ${reason}`));
    console.log(this.chalk.white('Please check your API key and try again.\n'));
    
    console.log(this.chalk.cyan('Common issues:'));
    console.log(this.chalk.white('• API key copied with extra spaces or characters'));
    console.log(this.chalk.white('• API key truncated during copy/paste'));
    console.log(this.chalk.white('• Wrong environment variable name'));
    console.log(this.chalk.white('• API key enclosed in quotes when not needed\n'));
  }
}
```

### Integration with Startup Validation
```javascript
// Enhanced startup validation with API key check
class StartupValidator {
  constructor() {
    this.apiKeyValidator = new ApiKeyValidator();
    this.setupGuide = new ApiKeySetupGuide();
    this.logger = require('../utils/logger');
  }
  
  async validateEnvironment() {
    try {
      // Existing validations
      await this.validateNodeVersion();
      await this.validateGitInstallation();
      await this.validateGitWorkingTree(); // From US025
      
      // New: API key validation
      await this.validateApiKey();
      
      // All validations passed
      this.logger.info('All startup validations passed');
      return true;
      
    } catch (error) {
      this.handleValidationError(error);
      process.exit(1);
    }
  }
  
  async validateApiKey() {
    try {
      const result = await this.apiKeyValidator.validateApiKey();
      
      console.log(this.chalk.green(`✅ API key validated (${result.maskedKey})`));
      
      return result;
      
    } catch (error) {
      if (error.message.includes('not found in environment')) {
        this.setupGuide.displaySetupInstructions();
      } else if (error.message.includes('Invalid API key format')) {
        this.setupGuide.displayFormatError(error.message);
      } else {
        console.error(this.chalk.red(`❌ API key validation failed: ${error.message}`));
      }
      
      throw error;
    }
  }
  
  handleValidationError(error) {
    this.logger.error(`Startup validation failed: ${error.message}`);
    console.log(this.chalk.red('\n❌ Napoleon startup failed'));
    console.log(this.chalk.white('Please resolve the above issues and try again.\n'));
  }
}
```

### Security Integration
```javascript
// Enhanced logging with API key security
class SecureLogger {
  constructor() {
    this.winston = require('winston');
    this.sensitivePatterns = [
      /sk-ant-[a-zA-Z0-9\-_]+/gi,  // Anthropic API keys
      /ANTHROPIC_API_KEY[=:]\s*[^\s]+/gi  // Environment variable assignments
    ];
    
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          // Sanitize sensitive information
          const sanitized = this.sanitizeMessage(message);
          return `${timestamp} [${level.toUpperCase()}] ${sanitized}`;
        })
      ),
      transports: [
        new winston.transports.File({ filename: 'debug.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  sanitizeMessage(message) {
    let sanitized = message;
    
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
  }
  
  info(message) {
    this.logger.info(message);
  }
  
  error(message) {
    this.logger.error(message);
  }
}
```

## Dev Notes

### Previous Story Insights
- US025 established startup validation patterns that this story extends
- US008 created API key setup tutorial that this story references
- US003 implemented SDK communication manager that requires valid API keys

### Technical Implementation Details
- **Environment Variable Security**: Never logs or displays actual API key values [Source: architecture/security-integration.md#api-key-security]
- **Format Validation**: Uses pattern matching without network requests for security [Source: architecture/security-integration.md#validation-approach]
- **Startup Integration**: Builds on existing validation patterns from Node.js and git checks [Source: architecture/tech-stack-alignment.md#validation]
- **Error Handling**: Provides actionable guidance rather than generic error messages [Source: architecture/coding-standards-and-conventions.md#error-handling]

### File Locations
- New implementation: `src/core/api-key-validator.js` [Source: architecture/source-tree-integration.md#core-directory]
- Setup guidance: `src/core/api-key-setup-guide.js` [Source: architecture/source-tree-integration.md#core-directory]
- Security logging: `src/utils/secure-logger.js` [Source: architecture/source-tree-integration.md#utils-directory]
- Startup integration: `src/core/startup-validator.js` [Source: architecture/source-tree-integration.md#core-directory]

### Testing Requirements
- Unit tests for API key format validation [Source: architecture/testing-strategy.md#unit-testing]
- Security tests ensuring no key leakage in logs [Source: architecture/security-integration.md#security-testing]
- Integration tests for startup validation flow [Source: architecture/testing-strategy.md#integration-testing]
- Mock environment variable scenarios [Source: architecture/testing-strategy.md#mocking]

### Technical Constraints
- Must validate before SDK initialization [Source: architecture/component-architecture.md#sdk-integration]
- Compatible with existing security requirements [Source: architecture/security-integration.md#requirements]
- Maintains fast startup performance (<2 seconds) [Source: docs/prd.md#non-functional-requirements]
- No network requests during validation for security [Source: architecture/security-integration.md#validation-approach]

## Tasks / Subtasks

1. **Implement API Key Validator Module** (AC: 1, 2, 4)
   - Create `src/core/api-key-validator.js` with format validation logic
   - Add environment variable detection for multiple possible names
   - Implement secure API key masking for display/logging
   - Add unit tests for various API key format scenarios

2. **Create Setup Guidance System** (AC: 3, 4)
   - Implement `ApiKeySetupGuide` class with shell-specific instructions
   - Add links to official Anthropic documentation
   - Create format error guidance with common issue solutions
   - Add unit tests for guidance message generation

3. **Enhance Security Logging** (AC: 4)
   - Create `src/utils/secure-logger.js` with sensitive data sanitization
   - Add pattern matching for API key detection in logs
   - Implement message sanitization for all log outputs
   - Add security tests to verify no API key leakage

4. **Integrate with Startup Validation** (AC: 5)
   - Enhance `StartupValidator` to include API key validation
   - Add proper error handling and user feedback
   - Implement graceful exit on validation failures
   - Add integration tests for complete startup flow

5. **Testing and Security Validation** (AC: All)
   - Create test fixtures for various API key scenarios
   - Add security tests for log sanitization
   - Test error handling and user guidance flows
   - Validate no sensitive data exposure in any outputs

## Definition of Done
- [ ] API key presence is validated before application startup
- [ ] API key format is validated without network requests
- [ ] Clear setup instructions are provided for missing API keys
- [ ] Error messages never expose actual API key values
- [ ] Failed validation prevents application startup with clear guidance
- [ ] Startup time remains under 2 seconds despite additional validation
- [ ] Security tests confirm no API key leakage in logs or outputs
- [ ] Integration tests cover complete API key validation flow

## Notes
- This story is critical for Napoleon SDK integration reliability
- Implements security-first approach to API key handling
- Provides educational value through clear setup guidance
- Prevents runtime failures by catching issues at startup
- Maintains fast startup while adding essential validation

## Related Stories
- US025: Git Working Tree Status Warning (extends startup validation)
- US008: Create API Key Setup Tutorial (references setup documentation)
- US003: SDK Communication Manager Implementation (requires valid API keys)
- US002: Basic Terminal UI Foundation (startup validation patterns)

## Approval Status

**Status:** 🔄 Draft - Awaiting Review

**Priority:** High - Essential for Napoleon SDK integration

**Created by:** Development Team

**Date:** 2025-07-18

**Notes:**
- Critical for preventing SDK initialization failures
- Security-focused implementation prevents key exposure
- Provides clear guidance for developer setup
- Integrates cleanly with existing startup validation flow