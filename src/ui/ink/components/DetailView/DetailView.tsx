import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Text, useInput, useFocus,
} from 'ink';
import { Agent } from '../../types';
import { useAgentLogs, LogEntry } from '../../hooks/useAgentLogs';
import { ActivityIndicator, SpinnerIndicator } from '../Common/ActivityIndicator';
import { LogViewer } from './LogViewer';

interface DetailViewProps {
  agent: Agent;
  onClose: () => void;
  agentManager: any;
}

const DetailView: React.FC<DetailViewProps> = ({ agent, onClose, agentManager }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterInfo, setFilterInfo] = useState({ visible: 0, total: 0, isShowingAll: false });
  const { isFocused } = useFocus({ autoFocus: true });

  // Load tool suppression configuration
  const toolSuppressionConfig = useMemo(() => {
    if (!agentManager?.config?.ui?.toolSuppression) {
      // Default configuration if not available
      return {
        enabled: true,
        suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
        showToolResults: true,
      };
    }
    return agentManager.config.ui.toolSuppression;
  }, [agentManager]);

  // Terminal dimensions
  const terminalHeight = process.stdout.rows || 24;
  const contentHeight = terminalHeight - 6; // Header + footer + borders

  // Use real logs with streaming if agentManager is provided
  const {
    logs: realLogs,
    isLoading,
    error: logsError,
    isStreaming,
    streamingError,
  } = useAgentLogs({
    agentId: agent.id,
    agentManager,
    refreshInterval: 500, // Fallback refresh for detail view
    enableStreaming: true, // Enable real-time streaming
  });

  // Generate mock logs for testing when no real logs available
  const [mockLogs, setMockLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!agentManager || realLogs.length === 0) {
      const mocks: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          content: 'Agent started',
          type: 'system',
          source: 'napoleon',
          metadata: {},
        },
        {
          id: '2',
          timestamp: new Date().toISOString(),
          content: `Instructions: ${agent.instructions || 'No instructions provided'}`,
          type: 'system',
          source: 'napoleon',
          metadata: {},
        },
        {
          id: '3',
          timestamp: new Date().toISOString(),
          content: 'Initializing workspace...',
          type: 'info',
          source: 'napoleon',
          metadata: {},
        },
        {
          id: '4',
          timestamp: new Date().toISOString(),
          content: 'Running command: git status',
          type: 'info',
          source: 'napoleon',
          metadata: {},
        },
        {
          id: '5',
          timestamp: new Date().toISOString(),
          content: 'On branch main',
          type: 'info',
          source: 'napoleon',
          metadata: {},
        },
        {
          id: '6',
          timestamp: new Date().toISOString(),
          content: 'Your branch is up to date',
          type: 'info',
          source: 'napoleon',
          metadata: {},
        },
      ];

      // Add more mock logs
      for (let i = 0; i < 20; i++) {
        mocks.push({
          id: `mock-${i + 7}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          content: `Log entry ${i + 1}: Processing task...`,
          type: i % 10 === 0 ? 'error' : 'info',
          source: 'napoleon',
          metadata: {},
        });
      }

      setMockLogs(mocks);
    }
  }, [agentManager, realLogs.length, agent.instructions]);

  const logs = agentManager && realLogs.length > 0 ? realLogs : mockLogs;

  // Handle keyboard input for close
  useInput((input: string, key: any) => {
    if (!isFocused) return;

    // Close on Escape or 'q'
    if (key.escape || input === 'q') {
      onClose();
      return;
    }

    // Scroll navigation
    if (key.upArrow || input === 'k') {
      setScrollOffset((prev) => Math.max(0, prev - 1));
      setAutoScroll(false);
    } else if (key.downArrow || input === 'j') {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
      // Re-enable auto-scroll if we're at the bottom
      if (scrollOffset >= maxOffset - 1) {
        setAutoScroll(true);
      }
    } else if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - contentHeight));
      setAutoScroll(false);
    } else if (key.pageDown) {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset((prev) => Math.min(maxOffset, prev + contentHeight));
    } else if (input === 'g') {
      setScrollOffset(0);
      setAutoScroll(false);
    } else if (input === 'G') {
      const maxOffset = Math.max(0, logs.length - contentHeight);
      setScrollOffset(maxOffset);
      setAutoScroll(true);
    }
  }, { isActive: isFocused });

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
          <Box>
            <Text bold color="green">
              {`Agent Detail: ${agent.name}`}
            </Text>
          </Box>
          <Box>
            {agent.status === 'running' && (
              <ActivityIndicator
                isActive={true}
                color="green"
                label="Claude is working"
              />
            )}
            <Box marginLeft={1}>
              <Text color="yellow">
                {`Status: ${agent.status}`}
              </Text>
            </Box>
            {/* Streaming status indicator */}
            <Box marginLeft={1}>
              {isStreaming ? (
                <Text color="green">🔴 Live</Text>
              ) : (
                <Text color="yellow">⏸ Polling</Text>
              )}
              {streamingError && (
                <Box marginLeft={1}>
                  <Text color="red">
                    (Error - using fallback)
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
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
        <LogViewer
          logs={logs}
          isLoading={isLoading}
          scrollOffset={scrollOffset}
          onScrollOffsetChange={setScrollOffset}
          contentHeight={contentHeight}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
          isFocused={isFocused}
          onFilterChange={setFilterInfo}
          isStreaming={isStreaming}
          toolSuppressionConfig={toolSuppressionConfig}
        />
      </Box>

      {/* Footer */}
      <Box
        borderStyle="single"
        borderTop={false}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color="gray">
          {autoScroll ? '[Auto-scroll ON]' : '[Auto-scroll OFF]'} |
          Filter: {filterInfo.isShowingAll ? 'All logs' : 'Claude SDK only'} |
          {` ${filterInfo.visible}/${filterInfo.total} entries`}
        </Text>
        <Text color="gray">
          q/Esc: Exit | ↑↓/jk: Scroll | g/G: Top/Bottom | a: Toggle Filter
        </Text>
      </Box>
    </Box>
  );
};

DetailView.whyDidYouRender = false;

export { DetailView };
