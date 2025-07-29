const fs = jest.createMockFromModule('fs');

// Mock default behaviors
fs.existsSync = jest.fn(() => true);
fs.mkdirSync = jest.fn();
fs.writeFileSync = jest.fn();
fs.readFileSync = jest.fn(() => '{}');
fs.rmSync = jest.fn();
fs.stat = jest.fn((path, callback) => {
  callback(null, { isDirectory: () => false });
});

// Mock promises API
fs.promises = {
  stat: jest.fn(() => Promise.resolve({ isDirectory: () => false })),
  readFile: jest.fn(() => Promise.resolve('{}')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve())
};

module.exports = fs;