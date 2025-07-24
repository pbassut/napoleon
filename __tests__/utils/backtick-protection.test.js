const { protectBackticks, isInputSafe } = require('../../src/utils/backtick-protection.js');

describe('protectBackticks', () => {
  it('should return the input unchanged for normal text', () => {
    const input = 'Normal text without backticks';
    expect(protectBackticks(input)).toBe(input);
  });

  it('should preserve backticks for code formatting', () => {
    const input = 'Use `console.log()` to debug';
    expect(protectBackticks(input)).toBe(input);
  });

  it('should preserve multi-line code blocks with backticks', () => {
    const input = '```javascript\nconst x = 5;\nconsole.log(x);\n```';
    expect(protectBackticks(input)).toBe(input);
  });

  it('should handle mixed content with backticks', () => {
    const input = 'Please fix this `bug` in the code:\n```\nif (x > 0) {\n  return true;\n}\n```';
    expect(protectBackticks(input)).toBe(input);
  });

  it('should handle empty string', () => {
    expect(protectBackticks('')).toBe('');
  });

  it('should handle non-string input', () => {
    expect(protectBackticks(null)).toBe(null);
    expect(protectBackticks(undefined)).toBe(undefined);
    expect(protectBackticks(123)).toBe(123);
  });

  it('should handle nested backticks', () => {
    const input = '`Use \\`nested\\` backticks like this`';
    expect(protectBackticks(input)).toBe(input);
  });

  it('should handle backticks with special characters', () => {
    const input = '`echo $HOME && ls -la`';
    expect(protectBackticks(input)).toBe(input);
  });
});

describe('isInputSafe', () => {
  it('should return true for normal text', () => {
    expect(isInputSafe('Normal text')).toBe(true);
  });

  it('should return true for text with backticks', () => {
    expect(isInputSafe('Use `console.log()` to debug')).toBe(true);
  });

  it('should return true for multi-line text with backticks', () => {
    const input = '```javascript\nconst x = 5;\n```';
    expect(isInputSafe(input)).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isInputSafe('')).toBe(false);
  });

  it('should return false for whitespace-only string', () => {
    expect(isInputSafe('   \n\t   ')).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(isInputSafe(null)).toBe(false);
    expect(isInputSafe(undefined)).toBe(false);
    expect(isInputSafe(123)).toBe(false);
    expect(isInputSafe({})).toBe(false);
  });

  it('should return true for text with special characters and backticks', () => {
    expect(isInputSafe('`echo $HOME && ls -la`')).toBe(true);
  });
});