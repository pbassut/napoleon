import React, { useState, useMemo } from 'react';
import {
  Box, Text, useInput, useFocus,
} from 'ink';
import { Agent } from '../../types';
import { useAgentLogs } from '../../hooks/useAgentLogs';
import { ActivityIndicator } from '../Common/ActivityIndicator';
import { LogViewer } from './LogViewer';
import { ModalOverlay } from '../Common/ModalOverlay';

interface DetailViewProps {
  isOpen: boolean;
  agent: Agent;
  onClose: () => void;
  agentManager: any;
}

const DetailView: React.FC<DetailViewProps> = ({ agent, onClose, agentManager }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterInfo, setFilterInfo] = useState({ visible: 0, total: 0, isShowingAll: false });
  const { isFocused } = useFocus({ autoFocus: true });

  // Load tool suppression configuration
  const toolSuppressionConfig = useMemo(() => {
    if (!agentManager?.config?.ui?.toolSuppression) {
      // Default configuration if not available
      return {
        enabled: false,
        suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
        showToolResults: true,
      };
    }
    return agentManager.config.ui.toolSuppression;
  }, [agentManager]);

  // Terminal dimensions
  const terminalHeight = (process.stdout.rows - 2) || 24;
  const contentHeight = terminalHeight - 6; // Header + footer + borders

  // Use real logs with streaming if agentManager is provided
  const {
    logs,
    isLoading,
    isStreaming,
    streamingError,
  } = useAgentLogs({
    agentId: agent.id,
    agentManager,
    refreshInterval: 500, // Fallback refresh for detail view
    enableStreaming: false, // Enable real-time streaming
  });

  // Handle keyboard input for close
  useInput((input: string, key: any) => {
    if (!isFocused) return;

    // Close on Escape or 'q'
    if (key.escape || input === 'q') {
      onClose();
    }
  }, { isActive: isFocused });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box
        borderStyle="single"
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
                <Text color="green">🟢 Live</Text>
              ) : (
                <Text color="yellow">⏸️ Polling</Text>
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
      </Box>

      {/* Log content */}
      <Box
        borderStyle="single"
        paddingX={1}
        flexDirection="column"
        height="90%"
        width="100%"
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
