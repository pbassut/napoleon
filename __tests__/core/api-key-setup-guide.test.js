const ApiKeySetupGuide = require('../../src/core/api-key-setup-guide');

describe('ApiKeySetupGuide', () => {
  let guide;
  let originalEnv;
  let consoleSpy;

  beforeEach(() => {
    guide = new ApiKeySetupGuide();
    originalEnv = { ...process.env };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with chalk and os', () => {
      expect(guide.chalk).toBeDefined();
      expect(guide.os).toBeDefined();
    });
  });

  describe('detectShell', () => {
    it('should detect zsh shell', () => {
      process.env.SHELL = '/bin/zsh';
      
      const result = guide.detectShell();
      
      expect(result).toBe('zsh');
    });

    it('should detect bash shell', () => {
      process.env.SHELL = '/bin/bash';
      
      const result = guide.detectShell();
      
      expect(result).toBe('bash');
    });

    it('should detect fish shell', () => {
      process.env.SHELL = '/usr/local/bin/fish';
      
      const result = guide.detectShell();
      
      expect(result).toBe('fish');
    });

    it('should return unknown for unrecognized shell', () => {
      process.env.SHELL = '/bin/csh';
      
      const result = guide.detectShell();
      
      expect(result).toBe('unknown');
    });

    it('should return unknown when SHELL is not set', () => {
      delete process.env.SHELL;
      
      const result = guide.detectShell();
      
      expect(result).toBe('unknown');
    });
  });

  describe('getShellCommand', () => {
    it('should return zsh command for zsh shell', () => {
      const result = guide.getShellCommand('zsh');
      
      expect(result).toBe('echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.zshrc');
    });

    it('should return bash command for bash shell', () => {
      const result = guide.getShellCommand('bash');
      
      expect(result).toBe('echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.bashrc');
    });

    it('should return fish command for fish shell', () => {
      const result = guide.getShellCommand('fish');
      
      expect(result).toBe('set -Ux ANTHROPIC_API_KEY "your-key-here"');
    });

    it('should return generic command for unknown shell', () => {
      const result = guide.getShellCommand('unknown');
      
      expect(result).toBe('export ANTHROPIC_API_KEY="your-key-here"');
    });
  });

  describe('getInstructionText', () => {
    it('should return instruction text object', () => {
      const result = guide.getInstructionText();
      
      expect(result).toEqual({
        setupTitle: '❌ Anthropic API Key Required',
        getKeyStep: '1. Get your API key:',
        anthropicUrl: 'https://console.anthropic.com/account/keys',
        setEnvStep: '2. Set the environment variable:',
        verifyStep: '3. Verify the setup:',
        securityNote: '⚠️  Security Note:',
        helpLink: 'docs/API-KEY-SETUP.md'
      });
    });
  });

  describe('getFormatErrorText', () => {
    it('should return format error text object', () => {
      const result = guide.getFormatErrorText();
      
      expect(result).toEqual({
        errorTitle: '❌ API Key Format Error',
        commonIssues: [
          'API key copied with extra spaces or characters',
          'API key truncated during copy/paste',
          'Wrong environment variable name',
          'API key enclosed in quotes when not needed'
        ],
        tips: [
          'Copy the entire API key from console.anthropic.com',
          'Ensure no extra spaces before or after the key',
          'Use ANTHROPIC_API_KEY as the environment variable name',
          'API key should start with "sk-ant-"'
        ]
      });
    });
  });

  describe('displaySetupInstructions', () => {
    it('should display complete setup instructions', () => {
      process.env.SHELL = '/bin/zsh';
      
      guide.displaySetupInstructions();
      
      // Verify key components were logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Anthropic API Key Required')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Napoleon requires an Anthropic API key')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://console.anthropic.com/account/keys')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('docs/API-KEY-SETUP.md')
      );
    });

    it('should include shell-specific instructions', () => {
      process.env.SHELL = '/bin/bash';
      
      guide.displaySetupInstructions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.bashrc')
      );
    });
  });

  describe('displayShellSpecificInstructions', () => {
    it('should display zsh instructions', () => {
      process.env.SHELL = '/bin/zsh';
      
      guide.displayShellSpecificInstructions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.zshrc')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('source ~/.zshrc')
      );
    });

    it('should display bash instructions', () => {
      process.env.SHELL = '/bin/bash';
      
      guide.displayShellSpecificInstructions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.bashrc')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('source ~/.bashrc')
      );
    });

    it('should display fish instructions', () => {
      process.env.SHELL = '/usr/local/bin/fish';
      
      guide.displayShellSpecificInstructions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('set -Ux ANTHROPIC_API_KEY')
      );
    });

    it('should display generic instructions for unknown shell', () => {
      process.env.SHELL = '/bin/csh';
      
      guide.displayShellSpecificInstructions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('export ANTHROPIC_API_KEY')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Add to your shell profile')
      );
    });
  });

  describe('displayFormatError', () => {
    it('should display format error guidance', () => {
      const reason = 'API key appears too short';
      
      guide.displayFormatError(reason);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ API Key Format Error')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(reason)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Common issues:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Tips for fixing:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('docs/API-KEY-SETUP.md')
      );
    });

    it('should include all common issues in format error display', () => {
      guide.displayFormatError('test error');
      
      const formatErrorText = guide.getFormatErrorText();
      formatErrorText.commonIssues.forEach(issue => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(issue)
        );
      });
    });

    it('should include all tips in format error display', () => {
      guide.displayFormatError('test error');
      
      const formatErrorText = guide.getFormatErrorText();
      formatErrorText.tips.forEach(tip => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(tip)
        );
      });
    });
  });

  describe('integration', () => {
    it('should work with different shell environments', () => {
      const shells = ['zsh', 'bash', 'fish', 'unknown'];
      
      shells.forEach(shell => {
        process.env.SHELL = shell === 'unknown' ? '/bin/csh' : `/bin/${shell}`;
        consoleSpy.mockClear();
        
        guide.displayShellSpecificInstructions();
        
        expect(consoleSpy).toHaveBeenCalled();
      });
    });
  });
});