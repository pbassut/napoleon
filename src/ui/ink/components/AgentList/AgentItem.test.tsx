import React from 'react';
import { render } from 'ink-testing-library';
import AgentItem from './AgentItem';
import { Agent } from '../../types';

describe('AgentItem', () => {
  const baseAgent: Agent = {
    id: 'agent-123456-test',
    name: 'agent-123456-test-feature',
    status: 'RUNNING',
    startTime: new Date(),
  };

  it('renders agent with correct selection indicator', () => {
    const { lastFrame } = render(
      <AgentItem 
        agent={baseAgent} 
        isSelected={true} 
        isFocused={true} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toContain('❯');
    expect(lastFrame()).toContain('agent-123456-test-feature');
  });

  it('shows no selection indicator when not selected', () => {
    const { lastFrame } = render(
      <AgentItem 
        agent={baseAgent} 
        isSelected={false} 
        isFocused={true} 
        index={0} 
      />
    );
    
    expect(lastFrame()).not.toContain('❯');
  });

  it('displays correct status emoji and text', () => {
    const { lastFrame } = render(
      <AgentItem 
        agent={baseAgent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toContain('🟢');
    expect(lastFrame()).toContain('Running');
  });

  it('formats runtime correctly for seconds', () => {
    const agent = {
      ...baseAgent,
      startTime: new Date(Date.now() - 45000), // 45 seconds ago
    };
    
    const { lastFrame } = render(
      <AgentItem 
        agent={agent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toMatch(/45s/);
  });

  it('formats runtime correctly for minutes', () => {
    const agent = {
      ...baseAgent,
      startTime: new Date(Date.now() - 125000), // 2 minutes 5 seconds ago
    };
    
    const { lastFrame } = render(
      <AgentItem 
        agent={agent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toMatch(/2m 5s/);
  });

  it('formats runtime correctly for hours', () => {
    const agent = {
      ...baseAgent,
      startTime: new Date(Date.now() - 7320000), // 2 hours 2 minutes ago
    };
    
    const { lastFrame } = render(
      <AgentItem 
        agent={agent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toMatch(/2h 2m/);
  });

  it('truncates long agent names', () => {
    const agent = {
      ...baseAgent,
      name: 'agent-123456-very-long-feature-name-that-should-be-truncated',
    };
    
    const { lastFrame } = render(
      <AgentItem 
        agent={agent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toContain('...');
    expect(lastFrame().length).toBeLessThan(agent.name.length + 50); // reasonable buffer
  });

  it('applies correct colors for different statuses', () => {
    const errorAgent = {
      ...baseAgent,
      status: 'ERROR',
    };
    
    const { lastFrame } = render(
      <AgentItem 
        agent={errorAgent} 
        isSelected={false} 
        isFocused={false} 
        index={0} 
      />
    );
    
    expect(lastFrame()).toContain('🔴');
    expect(lastFrame()).toContain('Error');
  });
});
