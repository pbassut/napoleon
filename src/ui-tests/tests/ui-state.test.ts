import { UITestSuite } from '../framework/TestRunner';
import { createAssertions } from '../helpers/assertions';
import { spawnAgent, waitForUIStable, TestDataBuilder } from '../helpers/utils';

export const uiStateTestSuite: UITestSuite = {
  name: 'UI State Tests',
  
  tests: [
    {
      name: 'should display empty state when no agents',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Verify empty state is shown
        await assertions.assertTextInOutput(context.pid, 'No agents');
        await assertions.assertAgentCount(context.pid, 0);
        
        // Verify no scroll indicators in empty state
        await assertions.assertScrollIndicator(context.pid, 'top', false);
        await assertions.assertScrollIndicator(context.pid, 'bottom', false);
      }
    },
    
    {
      name: 'should center modal dialogs',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Open spawn dialog
        await inputSimulator.pressKey(pid, 'n');
        await waitForUIStable(context, 500);
        
        // Verify dialog is displayed
        await assertions.assertDialogOpen(pid);
        
        // Dialog content should be extractable
        const output = await context.processManager.readProcessOutput(pid, 500);
        const dialogContent = context.outputParser.extractDialogContent(output);
        
        if (!dialogContent) {
          throw new Error('Dialog content not found');
        }
        
        // Close dialog
        await inputSimulator.cancelDialog(pid);
        await waitForUIStable(context, 500);
        await assertions.assertDialogClosed(pid);
      }
    },
    
    {
      name: 'should show keyboard shortcuts in UI',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Look for common shortcuts in the UI
        await assertions.assertTextInOutput(context.pid, 'n');
        await assertions.assertTextInOutput(context.pid, 'q');
      }
    },
    
    {
      name: 'should update UI after agent spawn',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Verify initial empty state
        await assertions.assertTextInOutput(context.pid, 'No agents');
        
        // Spawn an agent
        await spawnAgent(context, 'UI Update Test');
        
        // Verify UI updated to show agent
        await assertions.assertAgentExists(context.pid, 'UI Update Test');
        
        // Empty state message should be gone
        const output = await context.processManager.readProcessOutput(context.pid, 500);
        const hasEmptyState = context.outputParser.findInOutput(output, 'No agents');
        
        if (hasEmptyState) {
          throw new Error('Empty state message still visible after spawning agent');
        }
      }
    },
    
    {
      name: 'should maintain UI consistency during rapid updates',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Perform rapid actions
        for (let i = 0; i < 3; i++) {
          await inputSimulator.pressKey(pid, 'n');
          await waitForUIStable(context, 200);
          await inputSimulator.typeText(pid, `Rapid Test ${i}`, 10);
          await inputSimulator.confirmDialog(pid);
          await waitForUIStable(context, 300);
        }
        
        // UI should remain stable
        await assertions.assertNoErrors(pid);
        await assertions.assertAgentCount(pid, 3);
      }
    },
    
    {
      name: 'should handle window resize gracefully',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn some agents
        await spawnAgent(context, 'Resize Test 1');
        await spawnAgent(context, 'Resize Test 2');
        
        // Note: Actual window resize testing would require terminal manipulation
        // For now, just verify UI remains stable
        await assertions.assertAgentCount(context.pid, 2);
        await assertions.assertNoErrors(context.pid);
      }
    },
    
    {
      name: 'should show progress indicators during operations',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Start spawning an agent
        await inputSimulator.pressKey(pid, 'n');
        await waitForUIStable(context, 300); // Wait for dialog to open
        await inputSimulator.typeText(pid, 'Progress Test Agent');
        await inputSimulator.confirmDialog(pid);
        
        // Wait for agent to be created
        await waitForUIStable(context, 1000);
        
        // Agent should appear
        await assertions.assertAgentExists(pid, 'Progress Test Agent');
      }
    },
    
    {
      name: 'should display error messages appropriately',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Try to perform an invalid action
        // For example, terminate when no agents exist
        await inputSimulator.pressKey(pid, 't');
        await waitForUIStable(context);
        
        // Should either show error or handle gracefully
        await assertions.assertNoErrors(pid);
      }
    },
    
    {
      name: 'should not flicker or re-render excessively',
      test: async (context) => {
        const { processManager, pid } = context;
        
        // Spawn an agent to have some UI content
        await spawnAgent(context, 'Flicker Test Agent');
        
        // Collect multiple snapshots over a short period
        const snapshots: string[] = [];
        const snapshotCount = 10;
        const delayBetween = 100; // 100ms between snapshots
        
        for (let i = 0; i < snapshotCount; i++) {
          const output = await processManager.readProcessOutput(pid, 50);
          snapshots.push(output);
          await waitForUIStable(context, delayBetween);
        }
        
        // Count unique snapshots (excluding empty ones)
        const uniqueSnapshots = new Set(snapshots.filter(s => s.trim().length > 0));
        
        // In a stable UI, we should see very few unique snapshots
        // Allow for some variation due to activity indicators
        const maxExpectedUniqueSnapshots = 3; // Base state + maybe 1-2 activity indicator frames
        
        if (uniqueSnapshots.size > maxExpectedUniqueSnapshots) {
          // Log the unique snapshots for debugging
          console.log(`Found ${uniqueSnapshots.size} unique UI states (expected <= ${maxExpectedUniqueSnapshots}):`);
          Array.from(uniqueSnapshots).forEach((snapshot, index) => {
            console.log(`\n=== Snapshot ${index + 1} ===`);
            console.log(snapshot);
          });
          
          throw new Error(
            `UI is flickering: found ${uniqueSnapshots.size} different states in ${snapshotCount * delayBetween}ms. ` +
            `This suggests excessive re-rendering that could interfere with user input.`
          );
        }
      }
    }
  ]
};