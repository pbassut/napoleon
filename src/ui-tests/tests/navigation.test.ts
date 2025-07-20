import { UITestSuite } from '../framework';
import { createAssertions } from '../helpers/assertions';
import { spawnAgent, navigateToAgent, waitForUIStable } from '../helpers/utils';

export const navigationTestSuite: UITestSuite = {
  name: 'Navigation Tests',
  
  tests: [
    {
      name: 'should navigate between agents using arrow keys',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn multiple agents
        await spawnAgent(context, 'First Agent');
        await spawnAgent(context, 'Second Agent');
        await spawnAgent(context, 'Third Agent');
        
        // Navigate up
        await navigateToAgent(context, 'up', 1);
        await assertions.assertSelectedItem(context.pid, 'Second Agent');
        
        // Navigate down
        await navigateToAgent(context, 'down', 2);
        await assertions.assertSelectedItem(context.pid, 'Third Agent');
      }
    },
    
    {
      name: 'should wrap navigation at boundaries',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn two agents
        await spawnAgent(context, 'Agent One');
        await spawnAgent(context, 'Agent Two');
        
        // Navigate down from last item (should wrap to first)
        await navigateToAgent(context, 'down', 1);
        await assertions.assertSelectedItem(context.pid, 'Agent One');
        
        // Navigate up from first item (should wrap to last)
        await navigateToAgent(context, 'up', 1);
        await assertions.assertSelectedItem(context.pid, 'Agent Two');
      }
    },
    
    {
      name: 'should maintain focus after agent termination',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Spawn three agents
        await spawnAgent(context, 'Keep Agent 1');
        await spawnAgent(context, 'Delete Agent');
        await spawnAgent(context, 'Keep Agent 2');
        
        // Navigate to middle agent
        await navigateToAgent(context, 'up', 1);
        await assertions.assertSelectedItem(pid, 'Delete Agent');
        
        // Terminate current agent
        await inputSimulator.pressKey(pid, 't');
        await waitForUIStable(context);
        await inputSimulator.pressKey(pid, 'y');
        await waitForUIStable(context, 1000);
        
        // Focus should move to next available agent
        await assertions.assertAgentCount(pid, 2);
        await assertions.assertSelectedItem(pid, 'Keep Agent 2');
      }
    },
    
    {
      name: 'should show scroll indicators with many agents',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn many agents to trigger scrolling
        for (let i = 1; i <= 10; i++) {
          await spawnAgent(context, `Agent ${i}`);
        }
        
        // Should show bottom scroll indicator when at top
        await navigateToAgent(context, 'up', 9); // Go to top
        await assertions.assertScrollIndicator(context.pid, 'bottom', true);
        await assertions.assertScrollIndicator(context.pid, 'top', false);
        
        // Should show top scroll indicator when at bottom
        await navigateToAgent(context, 'down', 9); // Go to bottom
        await assertions.assertScrollIndicator(context.pid, 'top', true);
        await assertions.assertScrollIndicator(context.pid, 'bottom', false);
      }
    },
    
    {
      name: 'should handle navigation in empty state',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Verify empty state
        await assertions.assertAgentCount(pid, 0);
        await assertions.assertTextInOutput(pid, 'No agents');
        
        // Try to navigate (should not crash)
        await inputSimulator.pressKey(pid, 'up');
        await inputSimulator.pressKey(pid, 'down');
        
        // Should still show empty state
        await assertions.assertTextInOutput(pid, 'No agents');
        await assertions.assertNoErrors(pid);
      }
    }
  ]
};