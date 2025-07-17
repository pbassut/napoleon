const {
  EnvironmentValidationError,
  ConfigurationError,
  FileSystemError,
} = require('../src/utils/errors');

describe('Error Classes', () => {
  describe('EnvironmentValidationError', () => {
    it('should create error with message, code, and suggestion', () => {
      const error = new EnvironmentValidationError(
        'Test message',
        'TEST_CODE',
        'Test suggestion'
      );

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.suggestion).toBe('Test suggestion');
      expect(error.name).toBe('EnvironmentValidationError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with message, code, and suggestion', () => {
      const error = new ConfigurationError(
        'Config test message',
        'CONFIG_TEST_CODE',
        'Config test suggestion'
      );

      expect(error.message).toBe('Config test message');
      expect(error.code).toBe('CONFIG_TEST_CODE');
      expect(error.suggestion).toBe('Config test suggestion');
      expect(error.name).toBe('ConfigurationError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('FileSystemError', () => {
    it('should create error with message, code, and suggestion', () => {
      const error = new FileSystemError(
        'FS test message',
        'FS_TEST_CODE',
        'FS test suggestion'
      );

      expect(error.message).toBe('FS test message');
      expect(error.code).toBe('FS_TEST_CODE');
      expect(error.suggestion).toBe('FS test suggestion');
      expect(error.name).toBe('FileSystemError');
      expect(error instanceof Error).toBe(true);
    });
  });
});