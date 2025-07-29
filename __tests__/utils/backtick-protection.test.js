const { protectBackticks, isInputSafe } = require('../../src/utils/backtick-protection');

describe('Backtick Protection', () => {
  describe('protectBackticks', () => {
    it('should return string input unchanged', () => {
      const input = 'console.log(`Hello ${name}`)';
      const result = protectBackticks(input);
      expect(result).toBe(input);
    });

    it('should handle regular strings without backticks', () => {
      const input = 'Hello world';
      const result = protectBackticks(input);
      expect(result).toBe(input);
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = protectBackticks(input);
      expect(result).toBe('');
    });

    it('should handle non-string inputs by returning them unchanged', () => {
      const inputs = [null, undefined, 123, {}, [], true];
      
      inputs.forEach(input => {
        const result = protectBackticks(input);
        expect(result).toBe(input);
      });
    });

    it('should preserve code formatting with backticks', () => {
      const codeString = `
        const template = \`
          Hello \${user.name}!
          Welcome to \${app.name}
        \`;
      `;
      const result = protectBackticks(codeString);
      expect(result).toBe(codeString);
    });

    it('should handle multiple backticks and template literals', () => {
      const input = '`first template` and `second template` with `${variable}`';
      const result = protectBackticks(input);
      expect(result).toBe(input);
    });
  });

  describe('isInputSafe', () => {
    it('should return true for safe string input', () => {
      const input = 'Hello world';
      const result = isInputSafe(input);
      expect(result).toBe(true);
    });

    it('should return true for strings with backticks', () => {
      const input = 'console.log(`Hello ${name}`)';
      const result = isInputSafe(input);
      expect(result).toBe(true);
    });

    it('should return false for empty strings', () => {
      const input = '';
      const result = isInputSafe(input);
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only strings', () => {
      const inputs = ['   ', '\t', '\n', '\r\n', ' \t \n '];
      
      inputs.forEach(input => {
        const result = isInputSafe(input);
        expect(result).toBe(false);
      });
    });

    it('should return false for non-string inputs', () => {
      const inputs = [null, undefined, 123, {}, [], true, false];
      
      inputs.forEach(input => {
        const result = isInputSafe(input);
        expect(result).toBe(false);
      });
    });

    it('should return true for strings with meaningful content after trimming', () => {
      const inputs = [
        '  hello  ',
        '\tworld\t',
        '\n  test  \n',
        '   `template literal`   '
      ];
      
      inputs.forEach(input => {
        const result = isInputSafe(input);
        expect(result).toBe(true);
      });
    });

    it('should handle large strings', () => {
      const largeString = 'a'.repeat(10000);
      const result = isInputSafe(largeString);
      expect(result).toBe(true);
    });

    it('should handle special characters and unicode', () => {
      const inputs = [
        'Hello 世界',
        'Testing 🚀 emojis',
        'Special chars: @#$%^&*()',
        'Quotes: "double" and \'single\'',
        'Newlines\nand\ttabs'
      ];
      
      inputs.forEach(input => {
        const result = isInputSafe(input);
        expect(result).toBe(true);
      });
    });
  });
});