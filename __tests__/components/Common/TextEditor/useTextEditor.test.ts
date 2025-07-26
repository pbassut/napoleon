const { useTextEditor } = require('../../../../src/ui/ink/components/Common/TextEditor/useTextEditor');

describe('useTextEditor', () => {
  it('should be a function', () => {
    expect(typeof useTextEditor).toBe('function');
  });

  it('should be exported from module', () => {
    expect(useTextEditor).toBeDefined();
  });
});