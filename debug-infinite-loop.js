#!/usr/bin/env node

// Minimal test to reproduce the infinite loop in useAgentManager hook
// This bypasses all Napoleon startup logic and directly tests the hook

const React = require('react');
const { render } = require('ink');

// Mock AgentManager for testing
const mockAgentManager = {
  getActiveAgents: () => [],
  canSpawnAgent: () => true,
  maxAgents: 3,
  spawnAgent: async () => {},
  terminateAgent: async () => {}
};

// Import the buggy hook
const { useAgentManager } = require('./src/ui/ink/hooks/useAgentManager.ts');

// Create a simple test component that uses the hook
const TestComponent = () => {
  console.log('🔄 TestComponent render - checking for infinite loop...');
  
  const {
    agents,
    selectedAgentId,
    selectAgent,
    isLoading,
    error
  } = useAgentManager(mockAgentManager);

  console.log(`📊 Hook state: agents=${agents.length}, selectedAgentId=${selectedAgentId}, isLoading=${isLoading}`);

  // Trigger a state change to see if it causes infinite re-renders
  React.useEffect(() => {
    console.log('👆 useEffect triggered - this should happen once, not infinitely');
    if (agents.length === 0) {
      // This might trigger the infinite loop
      selectAgent('test-agent-id');
    }
  }, [agents.length, selectAgent]);

  return React.createElement('div', {}, 
    `Agents: ${agents.length}, Selected: ${selectedAgentId || 'none'}, Loading: ${isLoading}`
  );
};

console.log('🚀 Starting infinite loop test...');
console.log('⚠️  If this test hangs with continuous console output, the infinite loop is reproduced!');

// Mock stdin.setRawMode to prevent Ink from failing
if (typeof process.stdin.setRawMode !== 'function') {
  process.stdin.setRawMode = () => process.stdin;
}

// Force Ink to attempt rendering
try {
  const { unmount, waitUntilExit } = render(React.createElement(TestComponent));
  
  // Auto-exit after 2 seconds to prevent hanging
  setTimeout(() => {
    console.log('⏰ Test timeout - stopping render');
    unmount();
    process.exit(0);
  }, 2000);
  
} catch (error) {
  console.log('❌ Ink render failed:', error.message);
  console.log('✅ But we can still test the hook logic directly...');
  
  // Test the hook logic directly without Ink
  console.log('🧪 Testing hook logic manually...');
  // This would require more complex setup to test React hooks outside of React
}