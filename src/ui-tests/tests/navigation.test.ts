import { UITestSuite } from '../framework/TestRunner';
import { createAssertions } from '../helpers/assertions';
import { spawnAgent, navigateToAgent, waitForUIStable, delay } from '../helpers/utils';

export const navigationTestSuite: UITestSuite = {
  name: 'Navigation Tests',
  
  tests: [
    {
      name: 'should navigate between agents using arrow keys',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { processManager, outputParser, pid } = context;
        
        // Spawn multiple agents
        await spawnAgent(context, 'First Agent');
        await spawnAgent(context, 'Second Agent');
        await spawnAgent(context, 'Third Agent');
        
        // Wait a bit more after spawning
        await waitForUIStable(context, 1000);
        
        // Verify all agents were created
        await assertions.assertAgentCount(context.pid, 3);
        
        // Diagnostic: Check initial state
        const beforeNavOutput = await processManager.readProcessOutput(pid, 100);
        const beforeNavAgents = outputParser.extractAgentList(beforeNavOutput);
        const beforeNavSelected = outputParser.findSelectedItem(beforeNavOutput);
        
        console.log('\n=== Diagnostic: Before Navigation ===');
        console.log('Agents:', beforeNavAgents);
        console.log('Selected:', beforeNavSelected);
        
        // Navigate up
        await navigateToAgent(context, 'up', 1);
        
        // Diagnostic: Check after first navigation
        const afterUpOutput = await processManager.readProcessOutput(pid, 100);
        const afterUpSelected = outputParser.findSelectedItem(afterUpOutput);
        console.log('\n=== After Navigate UP ===');
        console.log('Selected:', afterUpSelected);
        
        await assertions.assertSelectedItem(context.pid, 'Second Agent');
        
        // Navigate down
        await navigateToAgent(context, 'down', 2);
        await waitForUIStable(context, 500); // Extra wait after navigation
        
        // Diagnostic: Check final state
        const finalOutput = await processManager.readProcessOutput(pid, 100);
        const finalAgents = outputParser.extractAgentList(finalOutput);
        const finalSelected = outputParser.findSelectedItem(finalOutput);
        
        console.log('\n=== After Navigate DOWN x2 ===');
        console.log('Agents:', finalAgents);
        console.log('Selected:', finalSelected);
        
        await assertions.assertSelectedItem(context.pid, 'First Agent');
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
    },
    
    {
      name: 'should maintain stable UI during navigation',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { processManager, inputSimulator, pid } = context;
        
        // Spawn multiple agents
        await spawnAgent(context, 'Agent A');
        await spawnAgent(context, 'Agent B');
        await spawnAgent(context, 'Agent C');
        
        // Take a baseline snapshot
        await waitForUIStable(context, 500);
        const baseline = await processManager.readProcessOutput(pid, 100);
        const baselineSelected = context.outputParser.findSelectedItem(baseline);
        
        // Perform navigation and immediately capture states
        const states: Array<{action: string, output: string, selected: string | null}> = [];
        
        // Navigate up
        await inputSimulator.pressKey(pid, 'up');
        
        // Capture multiple snapshots quickly after navigation
        for (let i = 0; i < 5; i++) {
          await delay(50); // Very short delay
          const output = await processManager.readProcessOutput(pid, 50);
          const selected = context.outputParser.findSelectedItem(output);
          states.push({
            action: `After UP + ${i * 50}ms`,
            output,
            selected
          });
        }
        
        // Check if selection changed as expected
        const finalSelected = states[states.length - 1].selected;
        
        // Log state transitions for debugging
        console.log('Navigation state transitions:');
        console.log(`Baseline: ${baselineSelected}`);
        states.forEach(state => {
          console.log(`${state.action}: ${state.selected || 'No selection found'}`);
        });
        
        // Verify the selection actually changed
        if (finalSelected === baselineSelected) {
          throw new Error(
            `Navigation did not change selection. Started at: "${baselineSelected}", ` +
            `ended at: "${finalSelected}". This suggests input was lost during re-rendering.`
          );
        }
        
        // Check for selection flickering (selection disappearing and reappearing)
        const selections = states.map(s => s.selected);
        const nullSelections = selections.filter(s => s === null).length;
        
        if (nullSelections > 0) {
          throw new Error(
            `Selection disappeared ${nullSelections} times during navigation. ` +
            `This suggests UI instability that could cause input loss.`
          );
        }
      }
    }
  ]
};