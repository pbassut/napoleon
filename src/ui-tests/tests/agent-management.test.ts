import { UITestSuite } from '../framework/TestRunner';
import { createAssertions } from '../helpers/assertions';
import { spawnAgent, terminateAgent, waitForUIStable, TestDataBuilder } from '../helpers/utils';

export const agentManagementTestSuite: UITestSuite = {
  name: 'Agent Management Tests',
  
  tests: [
    {
      name: 'should spawn agent with simple prompt',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Press 'n' to open spawn dialog
        await inputSimulator.pressKey(pid, 'n');
        await assertions.assertDialogOpen(pid);
        
        // Type prompt and spawn
        const prompt = 'Hello World Agent';
        await inputSimulator.typeText(pid, prompt);
        await inputSimulator.confirmDialog(pid);
        
        // Verify agent was created
        await waitForUIStable(context, 2000);
        await assertions.assertAgentExists(pid, prompt);
        await assertions.assertAgentCount(pid, 1);
      }
    },
    
    {
      name: 'should cancel agent spawn dialog',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Open spawn dialog
        await inputSimulator.pressKey(pid, 'n');
        await assertions.assertDialogOpen(pid);
        
        // Type something and cancel
        await inputSimulator.typeText(pid, 'Cancelled Agent');
        await inputSimulator.cancelDialog(pid);
        
        // Verify dialog closed and no agent created
        await waitForUIStable(context);
        await assertions.assertDialogClosed(pid);
        await assertions.assertAgentCount(pid, 0);
      }
    },
    
    {
      name: 'should terminate running agent',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn an agent
        await spawnAgent(context, 'Agent to Terminate');
        await assertions.assertAgentCount(context.pid, 1);
        
        // Terminate it
        await terminateAgent(context);
        
        // Verify agent was removed
        await assertions.assertAgentCount(context.pid, 0);
        await assertions.assertTextInOutput(context.pid, 'No agents');
      }
    },
    
    {
      name: 'should handle special characters in prompt',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn agent with special characters
        const specialPrompt = TestDataBuilder.createSpecialCharPrompt();
        await spawnAgent(context, specialPrompt);
        
        // Verify agent was created with special chars
        await assertions.assertAgentExists(context.pid, '!@#$%');
        await assertions.assertNoErrors(context.pid);
      }
    },
    
    {
      name: 'should spawn multiple agents rapidly',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn multiple agents quickly
        const prompts = TestDataBuilder.createAgentPrompts(5);
        
        for (const prompt of prompts) {
          await spawnAgent(context, prompt);
          await waitForUIStable(context, 500);
        }
        
        // Verify all agents were created
        await assertions.assertAgentCount(context.pid, 5);
        
        // Verify each agent exists
        for (const prompt of prompts) {
          await assertions.assertAgentExists(context.pid, prompt.split(':')[0]);
        }
      }
    },
    
    {
      name: 'should handle empty prompt gracefully',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Try to spawn with empty prompt
        await inputSimulator.pressKey(pid, 'n');
        await inputSimulator.confirmDialog(pid);
        
        // Should either show error or close dialog
        await waitForUIStable(context);
        
        // Agent should not be created
        await assertions.assertAgentCount(pid, 0);
      }
    },
    
    {
      name: 'should terminate specific agent from list',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        const { inputSimulator, pid } = context;
        
        // Spawn three agents
        await spawnAgent(context, 'Keep This Agent 1');
        await spawnAgent(context, 'Terminate This Agent');
        await spawnAgent(context, 'Keep This Agent 2');
        
        // Navigate to middle agent
        await inputSimulator.pressKey(pid, 'up');
        await waitForUIStable(context);
        
        // Terminate it
        await terminateAgent(context);
        
        // Verify correct agent was terminated
        await assertions.assertAgentCount(pid, 2);
        await assertions.assertAgentExists(pid, 'Keep This Agent 1');
        await assertions.assertAgentExists(pid, 'Keep This Agent 2');
      }
    },
    
    {
      name: 'should show agent status correctly',
      test: async (context) => {
        const assertions = createAssertions(context.outputParser, context.processManager);
        
        // Spawn an agent
        await spawnAgent(context, 'Status Test Agent');
        
        // Check that agent shows running status
        const output = await context.processManager.readProcessOutput(context.pid, 1000);
        const agents = context.outputParser.extractAgentList(output);
        
        if (agents.length === 0) {
          throw new Error('No agents found in output');
        }
        
        const agent = agents[0];
        if (agent.status !== 'running' && agent.status !== 'stopped') {
          throw new Error(`Unexpected agent status: ${agent.status}`);
        }
      }
    }
  ]
};