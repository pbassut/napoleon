// Mock ink-testing-library for tests
const render = jest.fn(() => ({
  lastFrame: () => '',
  frames: [],
  unmount: jest.fn(),
  stdin: {
    write: jest.fn()
  },
  stdout: {
    lastFrame: () => '',
    frames: []
  },
  clear: jest.fn(),
  rerender: jest.fn()
}));

module.exports = {
  render
};