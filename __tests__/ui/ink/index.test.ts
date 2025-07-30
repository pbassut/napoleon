import logger from '../../../src/utils/logger';

// Mock logger functions
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
}));

// Mock Ink
const mockClear = jest.fn();
const mockRender = jest.fn(() => ({ clear: mockClear }));
jest.mock('ink', () => ({
  render: mockRender
}));

// Mock App component
jest.mock('../../../src/ui/ink/App', () => ({
  default: 'MockedApp'
}));

// Mock AgentManager
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const MockAgentManager = jest.fn().mockImplementation(() => ({
  initialize: mockInitialize
}));
jest.mock('../../../src/core/agent-manager', () => MockAgentManager);

// Mock wdyr
jest.mock('../../../src/ui/ink/wdyr', () => ({}));

describe('UI Ink Index Module', () => {
  const originalExit = process.exit;
  const originalOn = process.on;
  const originalEnv = process.env;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn() as any;
    process.on = jest.fn() as any;
    console.error = jest.fn();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.exit = originalExit;
    process.on = originalOn;
    process.env = originalEnv;
    console.error = originalConsoleError;
  });

  it('should start Ink UI successfully', async () => {
    // Mock the module that automatically starts the UI
    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    // Give time for async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(MockAgentManager).toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalled();
  });

  it('should handle debug mode from NAPOLEON_DEBUG_RENDERS', async () => {
    process.env.NAPOLEON_DEBUG_RENDERS = 'true';

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockRender).toHaveBeenCalledWith(expect.anything(), { debug: true });
  });

  it('should handle debug mode from NODE_ENV development', async () => {
    process.env.NODE_ENV = 'development';

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockRender).toHaveBeenCalledWith(expect.anything(), { debug: true });
  });

  it('should handle normal mode when debug flags are false', async () => {
    process.env.NAPOLEON_DEBUG_RENDERS = 'false';
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockRender).toHaveBeenCalledWith(expect.anything(), { debug: false });
  });

  it('should register exit handler', async () => {
    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function));

    // Test the exit handler
    const exitHandler = (process.on as jest.Mock).mock.calls.find(call => call[0] === 'exit')[1];
    exitHandler();
    expect(mockClear).toHaveBeenCalled();
  });

  it('should handle AgentManager initialization error', async () => {
    mockInitialize.mockRejectedValueOnce(new Error('Init failed'));

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(console.error).toHaveBeenCalledWith('Failed to initialize Ink UI:', 'Init failed');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle startInkUI error', async () => {
    MockAgentManager.mockImplementationOnce(() => {
      throw new Error('Constructor failed');
    });

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(console.error).toHaveBeenCalledWith('Failed to initialize Ink UI:', 'Constructor failed');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log success messages', async () => {
    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.info).toHaveBeenCalledWith('Real AgentManager initialized for testing');
    expect(logger.info).toHaveBeenCalledWith('Ink UI started successfully with real AgentManager');
  });

  it('should log error messages', async () => {
    const testError = new Error('Test error message');
    mockInitialize.mockRejectedValueOnce(testError);

    jest.isolateModules(() => {
      require('../../../src/ui/ink/index');
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(logger.error).toHaveBeenCalledWith('Failed to start Ink UI', { error: 'Test error message' });
  });

  it('should use correct debug conditions', async () => {
    // Test various combinations of debug flags
    const testCases = [
      { NAPOLEON_DEBUG_RENDERS: 'true', NODE_ENV: 'production', expected: true },
      { NAPOLEON_DEBUG_RENDERS: 'false', NODE_ENV: 'development', expected: true },
      { NAPOLEON_DEBUG_RENDERS: 'false', NODE_ENV: 'production', expected: false },
      { NAPOLEON_DEBUG_RENDERS: undefined, NODE_ENV: 'development', expected: true },
      { NAPOLEON_DEBUG_RENDERS: undefined, NODE_ENV: undefined, expected: false },
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();
      
      if (testCase.NAPOLEON_DEBUG_RENDERS !== undefined) {
        process.env.NAPOLEON_DEBUG_RENDERS = testCase.NAPOLEON_DEBUG_RENDERS;
      } else {
        delete process.env.NAPOLEON_DEBUG_RENDERS;
      }
      
      if (testCase.NODE_ENV !== undefined) {
        process.env.NODE_ENV = testCase.NODE_ENV;
      } else {
        delete process.env.NODE_ENV;
      }

      jest.isolateModules(() => {
        require('../../../src/ui/ink/index');
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRender).toHaveBeenCalledWith(expect.anything(), { debug: testCase.expected });
    }
  });
});