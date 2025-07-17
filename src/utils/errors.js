/**
 * Custom error classes for ADD Manager
 */
/* eslint-disable max-classes-per-file */

class EnvironmentValidationError extends Error {
  constructor(message, code, suggestion) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.name = 'EnvironmentValidationError';
  }
}

class ConfigurationError extends Error {
  constructor(message, code, suggestion) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.name = 'ConfigurationError';
  }
}

class FileSystemError extends Error {
  constructor(message, code, suggestion) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.name = 'FileSystemError';
  }
}

module.exports = {
  EnvironmentValidationError,
  ConfigurationError,
  FileSystemError,
};
