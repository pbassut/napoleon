// Mock for Claude Code SDK
const mockQuery = jest.fn().mockImplementation(async function* ({ prompt, abortController, options }) {
  // Mock async iterator that yields messages
  yield { type: 'response', content: 'Mock response from Claude SDK', timestamp: new Date().toISOString() };
  yield { type: 'status', content: 'Task completed', timestamp: new Date().toISOString() };
});

module.exports = {
  query: mockQuery,
};