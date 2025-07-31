import React from 'react';
import { Box, Text } from 'ink';
import { ParsedLogEntry, LogParser } from '../../utils/log-parser';
import { ScrollArea } from '../Dialogs/ScrollArea';

interface LogEntryProps {
  entry: ParsedLogEntry;
  isHighlighted?: boolean;
  compact?: boolean;
  lineNumber?: number;
}

export const LogEntry: React.FC<LogEntryProps> = ({
  entry,
  isHighlighted = false,
  lineNumber,
}) => {
  const getEntryColor = () => {
    switch (entry.displayFormat) {
      case 'user': return 'blue';
      case 'assistant': return 'green';
      case 'system': return 'gray';
      case 'error': return 'red';
      case 'info': return 'white';
      default: return 'white';
    }
  };

  const getPrefix = () => {
    switch (entry.displayFormat) {
      case 'user': return '► ';
      case 'assistant': return '◄ ';
      case 'system': return '[SYS] ';
      case 'error': return '[ERR] ';
      default: return '';
    }
  };

  const backgroundColor = isHighlighted ? 'bgWhite' : undefined;
  const textColor = isHighlighted ? 'black' : getEntryColor();

  const timestamp = LogParser.formatTimestamp(entry.timestamp);

  return (
    <Box>
      {lineNumber && (
        <Text color="gray">
          {String(lineNumber).padStart(4, ' ')}
        </Text>
      )}
      <Text color="gray">
        [{timestamp}]
      </Text>
      <ScrollArea height={50}>
        {getPrefix()}
        {entry.parsedContent}
      </ScrollArea>
    </Box>
  );
};
