import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import {
  Box, Text, useStdout
} from 'ink';
import { LogEntry as RawLogEntry } from '../../hooks/useAgentLogs';
import { LogParser, ParsedLogEntry, LogParserOptions } from '../../utils/log-parser';
import { LogEntry } from './LogEntry';
import { calculateAutoScrollOffset, calculateVisibleLogsSlice, calculateMaxScrollOffset } from '../../utils/log-dimensions';

interface LogViewerProps {
  logs: RawLogEntry[];
  isLoading: boolean;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
  contentHeight: number;
  autoScroll: boolean;
  onAutoScrollChange: (autoScroll: boolean) => void;
  isFocused: boolean;
  onFilterChange?: (filterInfo: { visible: number; total: number; isShowingAll: boolean }) => void;
  isStreaming?: boolean;
  toolSuppressionConfig?: {
    enabled: boolean;
    suppressedTools: string[];
    showToolResults: boolean;
  };
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  isLoading,
  scrollOffset,
  onScrollOffsetChange,
  contentHeight,
  autoScroll,
  onAutoScrollChange,
  isFocused,
  onFilterChange,
  isStreaming = false,
}) => {
  const { stdout } = useStdout();

  const [filterOptions, setFilterOptions] = useState<LogParserOptions>({
    showAllSources: false,
    showAllTypes: false,
    includeSystemLogs: false,
    toolSuppression: {
      enabled: true,
      suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
      showToolResults: true,
    },
  });

  // Update tool suppression config when it changes
  // useEffect(() => {
  //   if (toolSuppressionConfig) {
  //     setFilterOptions(prev => ({
  //       ...prev,
  //       toolSuppression: toolSuppressionConfig,
  //     }));
  //   }
  // }, [toolSuppressionConfig]);

  // Parse and filter logs
  const parsedLogs = useMemo(() => logs
    .map((log) => LogParser.parseLogEntry(log))
    .filter((entry): entry is ParsedLogEntry => entry !== null), [logs]);

  const visibleLogs = useMemo(() => parsedLogs.filter(
    (entry) => LogParser.shouldShowLog(entry, filterOptions),
  ), [parsedLogs, filterOptions]);

  // Auto-scroll to bottom when new logs arrive, with special handling for streaming
  // useEffect(() => {
  //   if (autoScroll && visibleLogs.length > 0) {
  //     const terminalWidth = stdout.columns || 80;
  //     const newOffset = calculateAutoScrollOffset(
  //       visibleLogs,
  //       contentHeight,
  //       terminalWidth,
  //       true // includeLineNumbers
  //     );
  //     onScrollOffsetChange(newOffset);
  //   }
  // }, [visibleLogs.length, autoScroll, contentHeight, onScrollOffsetChange, isStreaming, stdout.columns]);

  // Get visible log entries based on scroll offset and actual height calculations
  const displayedLogs = useMemo(() => {
    const terminalWidth = stdout.columns || 80;
    return calculateVisibleLogsSlice(
      visibleLogs,
      scrollOffset,
      contentHeight,
      terminalWidth,
      true // includeLineNumbers
    );
  }, [visibleLogs, scrollOffset, contentHeight, stdout.columns]);

  // Notify parent about filter changes
  // useEffect(() => {
  //   if (onFilterChange) {
  //     onFilterChange({
  //       visible: visibleLogs.length,
  //       total: parsedLogs.length,
  //       isShowingAll: filterOptions.showAllSources,
  //     });
  //   }
  // }, [visibleLogs.length, parsedLogs.length, filterOptions.showAllSources, onFilterChange]);

  // Toggle filtering
  // const toggleAllLogs = useCallback(() => {
  //   setFilterOptions((prev) => ({
  //     showAllSources: !prev.showAllSources,
  //     showAllTypes: !prev.showAllTypes,
  //     includeSystemLogs: !prev.showAllSources, // Include system logs when showing all
  //   }));
  // }, []);

  // Handle keyboard input for filtering
  // useInput((input: string) => {
  //   if (!isFocused) return;

  //   if (input === 'a') {
  //     toggleAllLogs();
  //   }
  // }, { isActive: isFocused });

  // Handle scroll navigation
  // useInput((input: string, key: { upArrow?: boolean; downArrow?: boolean; pageUp?: boolean; pageDown?: boolean }) => {
  //   if (!isFocused) return;
  // const terminalWidth = stdout.columns || 80;
  //   const maxOffset = calculateMaxScrollOffset(
  //     visibleLogs,
  //     contentHeight,
  //     terminalWidth,
  //     true // includeLineNumbers
  //   );

  //   const maxOffset = Math.max(0, visibleLogs.length - contentHeight);

  //   if (key.upArrow || input === 'k') {
  //     onScrollOffsetChange(Math.max(0, scrollOffset - 1));
  //     onAutoScrollChange(false);
  //   } else if (key.downArrow || input === 'j') {
  //     onScrollOffsetChange(Math.min(maxOffset, scrollOffset + 1));
  //     // Re-enable auto-scroll if we're at the bottom
  //     if (scrollOffset >= maxOffset - 1) {
  //       onAutoScrollChange(true);
  //     }
  //   } else if (key.pageUp) {
  //     onScrollOffsetChange(Math.max(0, scrollOffset - contentHeight));
  //     onAutoScrollChange(false);
  //   } else if (key.pageDown) {
  //     onScrollOffsetChange(Math.min(maxOffset, scrollOffset + contentHeight));
  //   } else if (input === 'g') {
  //     onScrollOffsetChange(0);
  //     onAutoScrollChange(false);
  //   } else if (input === 'G') {
  //     onScrollOffsetChange(maxOffset);
  //     onAutoScrollChange(true);
  //   }
  // }, { isActive: isFocused });

  if (isLoading && displayedLogs.length === 0) {
    return <Text color="yellow">Loading logs...</Text>;
  }

  if (displayedLogs.length === 0) {
    return <Text color="gray">No logs available</Text>;
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {displayedLogs.map((entry, displayIndex) => {
        // Find the actual index of this entry in the visibleLogs array
        const actualIndex = visibleLogs.findIndex(log => log.id === entry.id);
        const lineNumber = actualIndex !== -1 ? actualIndex + 1 : scrollOffset + displayIndex + 1;

        return (
          <LogEntry
            key={`${entry.id}-${lineNumber}`}
            entry={entry}
            lineNumber={lineNumber}
          />
        );
      })}
    </Box>
  );
};
