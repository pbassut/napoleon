import * as AgentListExports from '../../../../../src/ui/ink/components/AgentList/index';
import AgentList from '../../../../../src/ui/ink/components/AgentList/AgentList';
import AgentItem from '../../../../../src/ui/ink/components/AgentList/AgentItem';

describe('AgentList index exports', () => {
  it('should export AgentList as named export', () => {
    expect(AgentListExports.AgentList).toBe(AgentList);
  });

  it('should export AgentItem as named export', () => {
    expect(AgentListExports.AgentItem).toBe(AgentItem);
  });

  it('should export AgentList as default export', () => {
    expect(AgentListExports.default).toBe(AgentList);
  });

  it('should not export AgentListCompat', () => {
    expect((AgentListExports as any).AgentListCompat).toBeUndefined();
  });
});