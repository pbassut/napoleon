import { normalizeKey } from '../../../../src/ui/ink/utils/input-normalizer';

// Mock os module to control platform detection
jest.mock('os', () => ({
  platform: jest.fn(),
}));

const os = require('os');

describe('normalizeKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mac keyboard backspace fix', () => {
    beforeEach(() => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
    });

    it('should map Mac delete key to backspace', () => {
      const key = { delete: true };
      const result = normalizeKey('', key);
      
      expect(result.backspace).toBe(true);
      expect(result.delete).toBe(false);
    });

    it('should preserve fn+delete as forward delete on Mac', () => {
      const key = { delete: true, fn: true };
      const result = normalizeKey('', key);
      
      expect(result.delete).toBe(true);
      expect(result.backspace).toBeFalsy();
    });

    it('should handle ASCII 127 backspace correctly', () => {
      const key = {};
      const result = normalizeKey('\x7f', key);
      
      expect(result.backspace).toBe(true);
    });
  });

  describe('Non-Mac platforms', () => {
    beforeEach(() => {
      (os.platform as jest.Mock).mockReturnValue('linux');
    });

    it('should not modify delete key on non-Mac platforms', () => {
      const key = { delete: true };
      const result = normalizeKey('', key);
      
      expect(result.delete).toBe(true);
      expect(result.backspace).toBeFalsy();
    });
  });
});