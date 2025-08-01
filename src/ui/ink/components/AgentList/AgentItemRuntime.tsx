import React, { memo, useEffect, useState } from 'react';
import { Text } from 'ink';
import { Agent } from 'src/ui-tests/framework/types';
import logger from 'src/utils/logger';

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

interface AgentItemRuntimeProps {
  agent: Agent;
}

const AgentItemRuntime: React.FC<AgentItemRuntimeProps> = memo(({
  agent,
}) => {
  logger.debug('AgentItemRuntime: Agent', { agent });
  const [runtime, setRuntime] = useState(agent.startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setRuntime(agent.startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [agent.startTime, agent.endTime]);

  if (agent.status === 'idle') {
    return <Text>{formatRuntime(agent.startTime, agent.lastActivity)}</Text>;
  }

  return <Text>{formatRuntime(runtime)}</Text>;
});

export default AgentItemRuntime;
