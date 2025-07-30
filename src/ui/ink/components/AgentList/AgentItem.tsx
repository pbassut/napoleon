import React from 'react';
import { Box, Text } from 'ink';
import { Agent, getCurrentTask } from '../../types';
import { getStatusInfo } from '../../constants/agentStatus';
import { ActivityIndicator } from '../Common/ActivityIndicator';

const { memo } = React;

interface AgentItemProps {
  agent: Agent;
  isSelected: boolean;
  isFocused: boolean;
  index: number;
}

// Format runtime duration from seconds to human-readable format
const formatRuntime = (startTime: Date | undefined, endTime?: Date | undefined): string => {
  if (!startTime) return '0s';

  const start = new Date(startTime);
  const end = endTime || new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) {
    return `${diffSecs}s`;
  } if (diffSecs < 3600) {
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const AgentItem: React.FC<AgentItemProps> = memo(({
  agent, isSelected, isFocused,
}) => {
  const statusInfo = getStatusInfo(agent.status);
  const textColor = isSelected && isFocused ? 'cyan' : 'white';
  const selectionColor = isSelected && isFocused ? 'cyan' : undefined;

  const truncateName = (name: string, maxLength: number = 40): string => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  const truncateTask = (task: string, maxLength: number = 22): string => {
    if (task.length <= maxLength) return task;
    return `${task.substring(0, maxLength - 3)}...`;
  };

  // Get current task from agent's todos
  const currentTask = getCurrentTask(agent.todos);
  const currentTaskDisplay = currentTask
    ? truncateTask(currentTask.content)
    : agent.status === 'SPAWNING' 
      ? 'Spawning agent...'
      : agent.status === 'FAILED' && agent.error
        ? `Error: ${typeof agent.error === 'string' ? agent.error : agent.error.message}`
        : 'No active task';

  return (
    <Box
      width="100%"
    >
      {/* Selection indicator */}
      <Box width={2}>
        <Text color={selectionColor}>
          {isSelected ? '❯' : ' '}
        </Text>
      </Box>

      {/* Agent name column */}
      <Box width={35}>
        <Text color={textColor} bold={isSelected}>
          {truncateName(agent.name, 30)}
        </Text>
      </Box>

      {/* Runtime column - right aligned */}
      <Box width={10} justifyContent="flex-end">
        <Text color={textColor}>
          {formatRuntime(agent.startTime, agent.status === 'idle' ? agent.lastActivity : undefined)}
        </Text>
      </Box>

      {/* Status column */}
      <Box width={18} marginLeft={2}>
        {agent.status === 'running' ? (
          <>
            <ActivityIndicator
              isActive={true}
              color="green"
              symbol="●"
            />
            <Box marginLeft={1}>
              <Text color={statusInfo.color}>{statusInfo.text}</Text>
            </Box>
          </>
        ) : agent.status === 'SPAWNING' ? (
          <>
            <ActivityIndicator
              isActive={true}
              color="yellow"
              symbol="●"
            />
            <Box marginLeft={1}>
              <Text color={statusInfo.color}>{statusInfo.text}</Text>
            </Box>
          </>
        ) : (
          <>
            <Text>{statusInfo.emoji} </Text>
            <Text color={statusInfo.color}>{statusInfo.text}</Text>
          </>
        )}
      </Box>

      {/* Current Task column */}
      <Box width={25} marginLeft={2}>
        <Text color={
          agent.status === 'FAILED' && agent.error 
            ? 'red'
            : agent.status === 'SPAWNING'
              ? 'yellow'
              : currentTask ? textColor : 'gray'
        }>
          {currentTaskDisplay}
        </Text>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Re-render only when these properties change
  const agentPropsEqual = prevProps.agent.id === nextProps.agent.id
    && prevProps.agent.status === nextProps.agent.status
    && prevProps.agent.name === nextProps.agent.name
    && prevProps.agent.lastActivity?.getTime() === nextProps.agent.lastActivity?.getTime()
    && prevProps.agent.error === nextProps.agent.error;

  const interactionPropsEqual = prevProps.isSelected === nextProps.isSelected
    && prevProps.isFocused === nextProps.isFocused;

  // Check if todos have changed
  const prevCurrentTask = getCurrentTask(prevProps.agent.todos);
  const nextCurrentTask = getCurrentTask(nextProps.agent.todos);
  const todosEqual = (prevCurrentTask?.id === nextCurrentTask?.id
    && prevCurrentTask?.content === nextCurrentTask?.content
    && prevCurrentTask?.status === nextCurrentTask?.status);

  return agentPropsEqual && interactionPropsEqual && todosEqual;
});

AgentItem.displayName = 'AgentItem';
AgentItem.whyDidYouRender = false;

export default AgentItem;
