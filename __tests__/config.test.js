jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home'),
}));

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  initializeSessionStorage,
  loadConfig,
  saveConfig,
  CONFIG_DIR,
  CONFIG_FILE,
  SESSIONS_FILE,
} = require('../src/core/config');

describe('Configuration Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    os.homedir.mockReturnValue('/mock/home');
  });

  beforeAll(() => {
    os.homedir.mockReturnValue('/mock/home');
  });

  describe('initializeSessionStorage', () => {
    it('should create config directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
      fs.statSync.mockReturnValue({ mode: 0o700 });

      await initializeSessionStorage();

      expect(fs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { mode: 0o700 });
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(CONFIG_DIR, 'logs'), { mode: 0o700 });
    });

    it('should create default config file if it does not exist', async () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === CONFIG_FILE) return false;
        return true;
      });
      fs.writeFileSync.mockImplementation(() => {});
      fs.statSync.mockReturnValue({ mode: 0o700 });

      await initializeSessionStorage();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"version": "1.0.0"'),
        { mode: 0o600 }
      );
    });

    it('should create default sessions file if it does not exist', async () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath === SESSIONS_FILE) return false;
        return true;
      });
      fs.writeFileSync.mockImplementation(() => {});
      fs.statSync.mockReturnValue({ mode: 0o700 });

      await initializeSessionStorage();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        SESSIONS_FILE,
        expect.stringContaining('"active": []'),
        { mode: 0o600 }
      );
    });

    it('should fix directory permissions if they are too open', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ mode: 0o755 }); // Too open
      fs.chmodSync.mockImplementation(() => {});

      await initializeSessionStorage();

      expect(fs.chmodSync).toHaveBeenCalledWith(CONFIG_DIR, 0o700);
    });
  });

  describe('loadConfig', () => {
    it('should load config from file if it exists', () => {
      const mockConfig = { version: '1.0.0', maxAgents: 5 };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = loadConfig();

      expect(config).toEqual(expect.objectContaining(mockConfig));
    });

    it('should return default config if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const config = loadConfig();

      expect(config).toEqual(expect.objectContaining({
        version: '1.0.0',
      }));
    });

    it('should throw error for invalid JSON', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      expect(() => loadConfig()).toThrow('Failed to load configuration');
    });
  });

  describe('saveConfig', () => {
    it('should save config to file with correct permissions', () => {
      const config = { version: '1.0.0', maxAgents: 5 };
      fs.writeFileSync.mockImplementation(() => {});

      saveConfig(config);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        JSON.stringify(config, null, 2),
        { mode: 0o600 }
      );
    });
  });
});