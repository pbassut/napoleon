import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import { Box, Text, useInput } from 'ink';
import { LogEntry as RawLogEntry } from '../../hooks/useAgentLogs';
import { LogParser, ParsedLogEntry, LogParserOptions } from '../../utils/log-parser';
import { LogEntry } from './LogEntry';

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
}) => {
  const [filterOptions, setFilterOptions] = useState<LogParserOptions>({
    showAllSources: false,
    showAllTypes: false,
    includeSystemLogs: false,
  });

  // Parse and filter logs
  const parsedLogs = useMemo(() => logs
    .map((log) => LogParser.parseLogEntry(log))
    .filter((entry): entry is ParsedLogEntry => entry !== null), [logs]);

  const visibleLogs = useMemo(() => parsedLogs.filter((entry) => LogParser.shouldShowLog(entry, filterOptions)), [parsedLogs, filterOptions]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && visibleLogs.length > contentHeight) {
      onScrollOffsetChange(Math.max(0, visibleLogs.length - contentHeight));
    }
  }, [visibleLogs.length, autoScroll, contentHeight, onScrollOffsetChange]);

  // Get visible log entries based on scroll offset
  const displayedLogs = useMemo(() => {
    const startIndex = Math.max(0, scrollOffset);
    const endIndex = Math.min(visibleLogs.length, startIndex + contentHeight);
    return visibleLogs.slice(startIndex, endIndex);
  }, [visibleLogs, scrollOffset, contentHeight]);

  // Notify parent about filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        visible: visibleLogs.length,
        total: parsedLogs.length,
        isShowingAll: filterOptions.showAllSources,
      });
    }
  }, [visibleLogs.length, parsedLogs.length, filterOptions.showAllSources, onFilterChange]);

  // Toggle filtering
  const toggleAllLogs = useCallback(() => {
    setFilterOptions((prev) => ({
      showAllSources: !prev.showAllSources,
      showAllTypes: !prev.showAllTypes,
      includeSystemLogs: !prev.showAllSources, // Include system logs when showing all
    }));
  }, []);

  // Handle keyboard input for filtering
  useInput((input: string) => {
    if (!isFocused) return;

    if (input === 'a') {
      toggleAllLogs();
    }
  }, { isActive: isFocused });

  // Handle scroll navigation
  useInput((input: string, key: any) => {
    if (!isFocused) return;

    const maxOffset = Math.max(0, visibleLogs.length - contentHeight);

    if (key.upArrow || input === 'k') {
      onScrollOffsetChange(Math.max(0, scrollOffset - 1));
      onAutoScrollChange(false);
    } else if (key.downArrow || input === 'j') {
      onScrollOffsetChange(Math.min(maxOffset, scrollOffset + 1));
      // Re-enable auto-scroll if we're at the bottom
      if (scrollOffset >= maxOffset - 1) {
        onAutoScrollChange(true);
      }
    } else if (key.pageUp) {
      onScrollOffsetChange(Math.max(0, scrollOffset - contentHeight));
      onAutoScrollChange(false);
    } else if (key.pageDown) {
      onScrollOffsetChange(Math.min(maxOffset, scrollOffset + contentHeight));
    } else if (input === 'g') {
      onScrollOffsetChange(0);
      onAutoScrollChange(false);
    } else if (input === 'G') {
      onScrollOffsetChange(maxOffset);
      onAutoScrollChange(true);
    }
  }, { isActive: isFocused });

  if (isLoading && visibleLogs.length === 0) {
    return <Text color="yellow">Loading logs...</Text>;
  }

  if (visibleLogs.length === 0) {
    return <Text color="gray">No logs available</Text>;
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {displayedLogs.map((entry, index) => {
        const globalIndex = scrollOffset + index;
        const lineNumber = globalIndex + 1;

        return (
          <LogEntry
            key={`${entry.id}-${globalIndex}`}
            entry={entry}
            lineNumber={lineNumber}
          />
        );
      })}
    </Box>
  );
};
