const {
  SDKStatus,
  SDKMessageType,
  SDKErrorType,
  createSDKSessionConfig,
  createSDKMessage,
  createSDKError,
  validateSDKSessionConfig,
  validateSDKMessage,
  generateMessageId,
  generateSDKSessionId,
  transformLegacySessionToSDK,
  checkSDKEnvironment
} = require('../../../src/core/sdk/sdk-types');

describe('SDK Types', () => {
  describe('Enums', () => {
    test('SDKStatus should have correct values', () => {
      expect(SDKStatus.INACTIVE).toBe('inactive');
      expect(SDKStatus.CONNECTING).toBe('connecting');
      expect(SDKStatus.ACTIVE).toBe('active');
      expect(SDKStatus.ERROR).toBe('error');
      expect(SDKStatus.DISCONNECTED).toBe('disconnected');
    });

    test('SDKMessageType should have correct values', () => {
      expect(SDKMessageType.QUERY).toBe('query');
      expect(SDKMessageType.RESPONSE).toBe('response');
      expect(SDKMessageType.ERROR).toBe('error');
      expect(SDKMessageType.STATUS).toBe('status');
    });

    test('SDKErrorType should have correct values', () => {
      expect(SDKErrorType.CONNECTION_ERROR).toBe('connection_error');
      expect(SDKErrorType.AUTHENTICATION_ERROR).toBe('authentication_error');
      expect(SDKErrorType.RATE_LIMIT_ERROR).toBe('rate_limit_error');
      expect(SDKErrorType.VALIDATION_ERROR).toBe('validation_error');
      expect(SDKErrorType.INTERNAL_ERROR).toBe('internal_error');
    });
  });

  describe('createSDKSessionConfig', () => {
    test('should create config with required API key', () => {
      const config = createSDKSessionConfig({ apiKey: 'test-api-key' });
      
      expect(config.apiKey).toBe('test-api-key');
      expect(config.model).toBe('claude-3-sonnet-20240229');
      expect(config.maxTokens).toBe(4096);
      expect(config.temperature).toBe(0.7);
      expect(config.metadata.source).toBe('napoleon-agent-manager');
      expect(config.metadata.version).toBe('2.0.0');
      expect(config.metadata.timestamp).toBeDefined();
    });

    test('should accept custom configuration options', () => {
      const config = createSDKSessionConfig({
        apiKey: 'custom-key',
        model: 'claude-3-haiku-20240307',
        maxTokens: 2048,
        temperature: 0.3
      });
      
      expect(config.model).toBe('claude-3-haiku-20240307');
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.3);
    });

    test('should throw error when API key is missing', () => {
      expect(() => {
        createSDKSessionConfig({});
      }).toThrow('API key is required for SDK session configuration');
    });
  });

  describe('createSDKMessage', () => {
    test('should create message with required fields', () => {
      const message = createSDKMessage(SDKMessageType.QUERY, 'Test content');
      
      expect(message.id).toBeDefined();
      expect(message.type).toBe(SDKMessageType.QUERY);
      expect(message.content).toBe('Test content');
      expect(message.timestamp).toBeDefined();
      expect(message.metadata.source).toBe('napoleon-agent-manager');
    });

    test('should include custom metadata', () => {
      const customMetadata = { userId: 'test-user', sessionId: 'test-session' };
      const message = createSDKMessage(SDKMessageType.RESPONSE, 'Test response', customMetadata);
      
      expect(message.metadata.userId).toBe('test-user');
      expect(message.metadata.sessionId).toBe('test-session');
      expect(message.metadata.source).toBe('napoleon-agent-manager');
    });
  });

  describe('createSDKError', () => {
    test('should create error with required fields', () => {
      const error = createSDKError(SDKErrorType.CONNECTION_ERROR, 'Connection failed');
      
      expect(error.type).toBe(SDKErrorType.CONNECTION_ERROR);
      expect(error.message).toBe('Connection failed');
      expect(error.timestamp).toBeDefined();
      expect(error.originalError).toBeNull();
    });

    test('should wrap original error', () => {
      const originalError = new Error('Original error message');
      const error = createSDKError(SDKErrorType.INTERNAL_ERROR, 'Wrapped error', originalError);
      
      expect(error.originalError).toBeDefined();
      expect(error.originalError.name).toBe('Error');
      expect(error.originalError.message).toBe('Original error message');
      expect(error.originalError.stack).toBeDefined();
    });
  });

  describe('validateSDKSessionConfig', () => {
    test('should validate correct configuration', () => {
      const config = {
        apiKey: 'valid-api-key-123',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4096,
        temperature: 0.7
      };
      
      expect(validateSDKSessionConfig(config)).toBe(true);
    });

    test('should throw error for invalid configuration object', () => {
      expect(() => validateSDKSessionConfig(null)).toThrow('SDK session configuration must be an object');
      expect(() => validateSDKSessionConfig('string')).toThrow('SDK session configuration must be an object');
    });

    test('should throw error for missing API key', () => {
      expect(() => validateSDKSessionConfig({})).toThrow('SDK session configuration must include a valid API key');
      expect(() => validateSDKSessionConfig({ apiKey: '' })).toThrow('SDK session configuration must include a valid API key');
    });

    test('should throw error for invalid API key', () => {
      expect(() => validateSDKSessionConfig({ apiKey: 'short' })).toThrow('SDK API key appears to be invalid (too short)');
    });

    test('should throw error for invalid maxTokens', () => {
      expect(() => validateSDKSessionConfig({ 
        apiKey: 'valid-api-key-123',
        maxTokens: 0 
      })).toThrow('SDK maxTokens must be a positive number');
      
      expect(() => validateSDKSessionConfig({ 
        apiKey: 'valid-api-key-123',
        maxTokens: 'invalid' 
      })).toThrow('SDK maxTokens must be a positive number');
    });

    test('should throw error for invalid temperature', () => {
      expect(() => validateSDKSessionConfig({ 
        apiKey: 'valid-api-key-123',
        temperature: -0.1 
      })).toThrow('SDK temperature must be a number between 0 and 1');
      
      expect(() => validateSDKSessionConfig({ 
        apiKey: 'valid-api-key-123',
        temperature: 1.1 
      })).toThrow('SDK temperature must be a number between 0 and 1');
    });
  });

  describe('validateSDKMessage', () => {
    test('should validate correct message', () => {
      const message = {
        id: 'msg_123',
        type: SDKMessageType.QUERY,
        content: 'Test message content',
        timestamp: new Date().toISOString()
      };
      
      expect(validateSDKMessage(message)).toBe(true);
    });

    test('should throw error for invalid message object', () => {
      expect(() => validateSDKMessage(null)).toThrow('SDK message must be an object');
      expect(() => validateSDKMessage('string')).toThrow('SDK message must be an object');
    });

    test('should throw error for missing ID', () => {
      expect(() => validateSDKMessage({ type: SDKMessageType.QUERY, content: 'test' }))
        .toThrow('SDK message must have a valid ID');
    });

    test('should throw error for invalid type', () => {
      expect(() => validateSDKMessage({ 
        id: 'msg_123',
        type: 'invalid_type',
        content: 'test' 
      })).toThrow('SDK message type must be one of: query, response, error, status');
    });

    test('should throw error for missing content', () => {
      expect(() => validateSDKMessage({ 
        id: 'msg_123',
        type: SDKMessageType.QUERY 
      })).toThrow('SDK message must have valid content');
    });
  });

  describe('generateMessageId', () => {
    test('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateSDKSessionId', () => {
    test('should generate unique session IDs', () => {
      const id1 = generateSDKSessionId();
      const id2 = generateSDKSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sdk_session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^sdk_session_\d+_[a-z0-9]+$/);
    });
  });

  describe('transformLegacySessionToSDK', () => {
    test('should transform legacy session to SDK format', () => {
      const legacySession = {
        id: 'legacy-session-1',
        pid: 12345,
        status: 'running',
        workingDirectory: '/test/dir'
      };
      
      const transformed = transformLegacySessionToSDK(legacySession);
      
      expect(transformed.id).toBe('legacy-session-1');
      expect(transformed.pid).toBe(12345);
      expect(transformed.status).toBe('running');
      expect(transformed.workingDirectory).toBe('/test/dir');
      expect(transformed.sdkStatus).toBe(SDKStatus.INACTIVE);
      expect(transformed.sdkSessionId).toBeDefined();
      expect(transformed.lastMessageId).toBeNull();
      expect(transformed.sdkConfig).toBeNull();
      expect(transformed.sdkMetadata.migratedFrom).toBe('legacy-session');
      expect(transformed.sdkMetadata.version).toBe('2.0.0');
    });

    test('should throw error for invalid legacy session', () => {
      expect(() => transformLegacySessionToSDK(null)).toThrow('Legacy session data must be an object');
      expect(() => transformLegacySessionToSDK('string')).toThrow('Legacy session data must be an object');
    });
  });

  describe('checkSDKEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should check Node.js version', () => {
      const result = checkSDKEnvironment();
      
      expect(result.nodeVersion).toBe(process.version);
      expect(result.nodeVersionValid).toBe(true); // Should be true since we're running Node 18+
    });

    test('should check API key presence', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const result = checkSDKEnvironment();
      
      expect(result.apiKeyPresent).toBe(true);
    });

    test('should detect missing API key', () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      const result = checkSDKEnvironment();
      
      expect(result.apiKeyPresent).toBe(false);
      expect(result.errors).toContain('ANTHROPIC_API_KEY environment variable is not set');
    });

    test('should check SDK package presence', () => {
      const result = checkSDKEnvironment();
      
      expect(result.sdkPackagePresent).toBe(true); // Should be true since we have it installed
    });

    test('should handle Node.js version check errors', () => {
      // Mock process.version to simulate old Node version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.14.0',
        writable: true,
        configurable: true
      });
      
      const result = checkSDKEnvironment();
      
      expect(result.nodeVersionValid).toBe(false);
      expect(result.errors).toContain('Node.js version v16.14.0 is not supported. Requires >= 18.0.0');
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true
      });
    });

    test.skip('should handle require.resolve errors for SDK package', () => {
      // Clear require cache to ensure fresh module load
      const modulePath = require.resolve('../../../src/core/sdk/sdk-types');
      delete require.cache[modulePath];
      
      // Mock require.resolve to throw error
      const originalResolve = require.resolve;
      require.resolve = jest.fn().mockImplementation((id) => {
        if (id === '@anthropic-ai/claude-code') {
          throw new Error('Cannot find module');
        }
        return originalResolve(id);
      });
      
      // Re-require the module with mocked require.resolve
      const { checkSDKEnvironment: mockedCheckSDKEnvironment } = require('../../../src/core/sdk/sdk-types');
      const result = mockedCheckSDKEnvironment();
      
      expect(result.sdkPackagePresent).toBe(false);
      expect(result.errors).toContain('@anthropic-ai/claude-code package is not installed');
      
      // Restore original require.resolve and cache
      require.resolve = originalResolve;
      require.cache[modulePath] = require(modulePath);
    });

    test('should handle process.version parsing errors', () => {
      // Mock process.version to simulate error condition
      const originalVersion = process.version;
      const originalSplit = String.prototype.split;
      
      Object.defineProperty(process, 'version', {
        value: 'invalid-version',
        writable: true,
        configurable: true
      });
      
      // Mock split to throw error
      String.prototype.split = jest.fn().mockImplementation(() => {
        throw new Error('Split failed');
      });
      
      const result = checkSDKEnvironment();
      
      expect(result.errors.some(error => error.includes('Failed to check Node.js version'))).toBe(true);
      
      // Restore mocks
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true
      });
      String.prototype.split = originalSplit;
    });
  });
});