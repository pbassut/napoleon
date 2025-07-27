// Mock for Claude Code SDK
const mockQuery = jest.fn();

// Default implementation that tests can override
mockQuery.mockImplementation(({ prompt, abortController, options }) => {
  // Return an async iterable object with Symbol.asyncIterator method
  return {
    async* [Symbol.asyncIterator]() {
      yield { type: 'response', content: 'Mock response from Claude SDK', timestamp: new Date().toISOString() };
      yield { type: 'status', content: 'Task completed', timestamp: new Date().toISOString() };
    }
  };
});

module.exports = {
  query: mockQuery,
};

// Add a dummy test to prevent Jest from complaining about no tests
describe('Claude Code SDK Mock', () => {
  it('should provide mock query function', () => {
    expect(mockQuery).toBeDefined();
    expect(typeof mockQuery).toBe('function');
  });
});