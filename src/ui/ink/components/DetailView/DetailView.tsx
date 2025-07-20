import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { Agent } from '../../types';
import { useAgentLogs } from '../../hooks/useAgentLogs';

interface DetailViewProps {
  agent: Agent;
  onClose: () => void;
  agentManager: any;
}

interface LogEntry {
  timestamp: string;
  content: string;
  type: 'system' | 'output' | 'command' | 'error';
}

const DetailView: React.FC<DetailViewProps> = ({ agent, onClose, agentManager }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const { isFocused } = useFocus({ autoFocus: true });

  // Terminal dimensions
  const terminalHeight = process.stdout.rows || 24;
  const contentHeight = terminalHeight - 6; // Header + footer + borders

  // Use real logs if agentManager is provided
  const { logs: realLogs, isLoading } = useAgentLogs({
    agentId: agent.id,
    agentManager,
    refreshInterval: 500, // Faster refresh for detail view
  });

  // Generate mock logs for testing when no real logs available
  const [mockLogs, setMockLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!agentManager || realLogs.length === 0) {
      const mocks: LogEntry[] = [
        { timestamp: new Date().toISOString(), content: 'Agent started', type: 'system' },
        { timestamp: new Date().toISOString(), content: `Instructions: ${agent.instructions || 'No instructions provided'}`, type: 'system' },
        { timestamp: new Date().toISOString(), content: 'Initializing workspace...', type: 'output' },
        { timestamp: new Date().toISOString(), content: 'Running command: git status', type: 'command' },
        { timestamp: new Date().toISOString(), content: 'On branch main', type: 'output' },
        { timestamp: new Date().toISOString(), content: 'Your branch is up to date', type: 'output' },
      ];

      // Add more mock logs
      for (let i = 0; i < 20; i++) {
        mocks.push({
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          content: `Log entry ${i + 1}: Processing task...`,
          type: i % 10 === 0 ? 'error' : 'output',
        });
      }

      setMockLogs(mocks);
    }
  }, [agentManager, realLogs.length, agent.instructions]);

  const logs = agentManager && realLogs.length > 0 ? realLogs : mockLogs;

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logs.length > contentHeight) {
      setScrollOffset(Math.max(0, logs.length - contentHeight));
    }
  }, [logs.length, autoScroll, contentHeight]);

  // Visible logs based on scroll offset
  const visibleLogs = useMemo(() => {
    const startIndex = Math.max(0, scrollOffset);
    const endIndex = Math.min(logs.length, startIndex + contentHeight);
    return logs.slice(startIndex, endIndex);
  }, [logs, scrollOffset, contentHeight]);

  // Handle keyboard input
  useInput((input: string, key: any) => {
    if (!isFocused) return;

    // Close on Escape or 'q'
    if (key.escape || input === 'q') {
      onClose();
      return;
    }

    // Scroll navigation
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
      setAutoScroll(false);
    } else if (key.downArrow || input === 'j') {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + 1));
      // Re-enable auto-scroll if we're at the bottom
      if (scrollOffset >= maxOffset - 1) {
        setAutoScroll(true);
      }
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - contentHeight));
      setAutoScroll(false);
    } else if (key.pageDown) {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset(prev => Math.min(maxOffset, prev + contentHeight));
    } else if (input === 'g') {
      setScrollOffset(0);
      setAutoScroll(false);
    } else if (input === 'G') {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset(maxOffset);
      setAutoScroll(true);
    }
  }, { isActive: isFocused });

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'red';
      case 'command': return 'blue';
      case 'system': return 'cyan';
      default: return 'white';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderStyle="single"
        borderBottom={false}
        paddingX={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between">
          <Text bold color="green">
            {`Agent Detail: ${agent.name}`}
          </Text>
          <Text color="yellow">
            {`Status: ${agent.status}`}
          </Text>
        </Box>
        {searchQuery && (
          <Text color="cyan">
            {`Search: "${searchQuery}"`}
          </Text>
        )}
      </Box>

      {/* Log content */}
      <Box
        flexGrow={1}
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        paddingX={1}
        flexDirection="column"
      >
        {isLoading && logs.length === 0 ? (
          <Text color="yellow">Loading logs...</Text>
        ) : visibleLogs.length === 0 ? (
          <Text color="gray">No logs available</Text>
        ) : (
          visibleLogs.map((log, index) => {
            const globalIndex = scrollOffset + index;
            const lineNumber = String(globalIndex + 1).padStart(4, ' ');

            return (
              <Box key={globalIndex}>
                <Text color="gray" dimColor>
                  {`${lineNumber} `}
                </Text>
                <Text color="gray" dimColor>
                  {`[${formatTimestamp(log.timestamp)}] `}
                </Text>
                <Text color={getLogColor(log.type)}>
                  {log.content}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      <Box
        borderStyle="single"
        borderTop={false}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color="gray">
          {`Lines: ${scrollOffset + 1}-${Math.min(scrollOffset + contentHeight, logs.length)} of ${logs.length}`}
        </Text>
        <Text color="gray">
          {autoScroll ? '[Auto-scroll ON]' : '[Auto-scroll OFF]'} | q/Esc: Exit | ↑↓/jk: Scroll | g/G: Top/Bottom
        </Text>
      </Box>
    </Box>
  );
};

DetailView.whyDidYouRender = true;

export { DetailView };