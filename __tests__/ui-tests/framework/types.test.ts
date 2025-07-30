import { DEFAULT_TEST_CONFIG, TestConfig } from '../../../src/ui-tests/framework/types';

describe('UI Tests Framework Types', () => {
  describe('DEFAULT_TEST_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_TEST_CONFIG.napoleonStartTimeout).toBe(5000);
      expect(DEFAULT_TEST_CONFIG.defaultActionDelay).toBe(100);
      expect(DEFAULT_TEST_CONFIG.outputBufferSize).toBe(1000);
      expect(DEFAULT_TEST_CONFIG.processCleanupTimeout).toBe(2000);
    });

    it('should be a valid TestConfig object', () => {
      const config: TestConfig = DEFAULT_TEST_CONFIG;
      expect(typeof config.napoleonStartTimeout).toBe('number');
      expect(typeof config.defaultActionDelay).toBe('number');
      expect(typeof config.outputBufferSize).toBe('number');
      expect(typeof config.processCleanupTimeout).toBe('number');
    });
  });
});