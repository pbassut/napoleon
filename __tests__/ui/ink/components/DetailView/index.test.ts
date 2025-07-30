import { DetailView } from '../../../../../src/ui/ink/components/DetailView';

describe('DetailView index', () => {
  it('should export DetailView', () => {
    expect(DetailView).toBeDefined();
    expect(typeof DetailView).toBe('function');
  });
});