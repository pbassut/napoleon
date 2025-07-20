const React = require('react');
const { useState, useEffect, useMemo, useRef } = React;
const { Box, Text, useInput, useFocus } = require('ink');
const TextInput = require('ink-text-input').default;

const DetailView = ({ agent, onClose, agentManager }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const { isFocused } = useFocus({ autoFocus: true });
  
  // Terminal dimensions
  const terminalHeight = process.stdout.rows || 24;
  const contentHeight = terminalHeight - 6; // Header + footer + borders
  
  // Use real logs if agentManager is provided
  const { useAgentLogs } = require('../../hooks/useAgentLogs');
  const { logs: realLogs, isLoading } = useAgentLogs({ 
    agentId: agent.id, 
    agentManager,
    refreshInterval: 500 // Faster refresh for detail view
  });
  
  // Generate mock logs for testing when no real logs available
  const [mockLogs, setMockLogs] = useState([]);
  useEffect(() => {
    if (!agentManager || realLogs.length === 0) {
      const mocks = [
        { timestamp: new Date().toISOString(), content: 'Agent started', type: 'system' },
        { timestamp: new Date().toISOString(), content: `Instructions: ${agent.instructions || 'No instructions provided'}`, type: 'system' },
        { timestamp: new Date().toISOString(), content: 'Initializing workspace...', type: 'output' },
        { timestamp: new Date().toISOString(), content: 'Running command: git status', type: 'command' },
        { timestamp: new Date().toISOString(), content: 'On branch main', type: 'output' },
        { timestamp: new Date().toISOString(), content: 'Your branch is up to date', type: 'output' },
      ];
      
      // Add more mock logs
      for (let i = 0; i < 100; i++) {
        mocks.push({
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          content: `Log entry ${i + 1}: Processing task...`,
          type: i % 10 === 0 ? 'error' : 'output',
        });
      }
      
      setMockLogs(mocks);
    }
  }, [agent, agentManager, realLogs.length]);
  
  // Use real logs if available, otherwise use mock logs
  const logs = realLogs.length > 0 ? realLogs : mockLogs;
  
  // Simulate real-time log updates for mock logs only
  useEffect(() => {
    if (agentManager && realLogs.length > 0) return; // Skip if using real logs
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newLog = {
          timestamp: new Date().toISOString(),
          content: `New log entry at ${new Date().toLocaleTimeString()}`,
          type: Math.random() > 0.8 ? 'error' : 'output',
        };
        
        setMockLogs(prev => {
          const updated = [...prev, newLog];
          // Limit to 10,000 entries
          if (updated.length > 10000) {
            return updated.slice(-10000);
          }
          return updated;
        });
        
        if (autoScroll) {
          setScrollOffset(prev => Math.max(0, logs.length - contentHeight + 1));
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [autoScroll, contentHeight, logs.length]);
  
  // Calculate visible logs with virtual scrolling
  const visibleLogs = useMemo(() => {
    const start = scrollOffset;
    const end = Math.min(start + contentHeight, logs.length);
    return logs.slice(start, end);
  }, [logs, scrollOffset, contentHeight]);
  
  // Search functionality
  useEffect(() => {
    if (searchQuery) {
      const matches = [];
      const query = searchQuery.toLowerCase();
      
      logs.forEach((log, index) => {
        if (log.content.toLowerCase().includes(query)) {
          matches.push(index);
        }
      });
      
      setSearchMatches(matches);
      if (matches.length > 0 && currentMatchIndex === -1) {
        setCurrentMatchIndex(0);
        setScrollOffset(Math.max(0, matches[0] - Math.floor(contentHeight / 2)));
      }
    } else {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery, logs, contentHeight, currentMatchIndex]);
  
  // Keyboard navigation
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setSearchQuery('');
      } else if (key.return) {
        setSearchMode(false);
      }
      return;
    }
    
    // Exit detail view
    if (input === 'q' || key.escape) {
      onClose();
      return;
    }
    
    // Start search
    if (input === '/') {
      setSearchMode(true);
      return;
    }
    
    // Navigate search matches
    if (searchQuery && searchMatches.length > 0) {
      if (input === 'n') {
        const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
        setCurrentMatchIndex(nextIndex);
        setScrollOffset(Math.max(0, searchMatches[nextIndex] - Math.floor(contentHeight / 2)));
        setAutoScroll(false);
      } else if (input === 'N') {
        const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
        setCurrentMatchIndex(prevIndex);
        setScrollOffset(Math.max(0, searchMatches[prevIndex] - Math.floor(contentHeight / 2)));
        setAutoScroll(false);
      }
    }
    
    // Scrolling
    if (key.upArrow || input === 'k') {
      setScrollOffset(Math.max(0, scrollOffset - 1));
      setAutoScroll(false);
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(Math.min(logs.length - contentHeight, scrollOffset + 1));
      setAutoScroll(false);
    } else if (key.pageUp || (key.ctrl && input === 'u')) {
      setScrollOffset(Math.max(0, scrollOffset - contentHeight));
      setAutoScroll(false);
    } else if (key.pageDown || (key.ctrl && input === 'd')) {
      setScrollOffset(Math.min(logs.length - contentHeight, scrollOffset + contentHeight));
      setAutoScroll(false);
    } else if (input === 'G') {
      // G - go to bottom
      setScrollOffset(Math.max(0, logs.length - contentHeight));
      setAutoScroll(true);
    } else if (input === 'g' && !key.shift) {
      // gg - go to top (requires double 'g' press logic)
      setScrollOffset(0);
      setAutoScroll(false);
    } else if (input === 'f') {
      // Toggle auto-scroll
      setAutoScroll(!autoScroll);
    }
  });
  
  // Get log color based on type
  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'red';
      case 'system': return 'yellow';
      case 'command': return 'cyan';
      default: return 'white';
    }
  };
  
  // Check if a log index is in search matches
  const isSearchMatch = (globalIndex) => {
    return searchMatches.includes(globalIndex);
  };
  
  return React.createElement(Box, { flexDirection: 'column', height: '100%' }, [
    // Header
    React.createElement(Box, { 
      key: 'header',
      borderStyle: 'single', 
      borderBottom: false,
      paddingX: 1,
      flexDirection: 'column'
    }, [
      React.createElement(Box, { key: 'header-info', justifyContent: 'space-between' }, [
        React.createElement(Text, { key: 'name', bold: true, color: 'green' }, 
          `Agent Detail: ${agent.name}`
        ),
        React.createElement(Text, { key: 'status', color: 'yellow' }, 
          `Status: ${agent.status}`
        )
      ]),
      searchQuery && React.createElement(Text, { key: 'search-info', color: 'cyan' },
        `Search: "${searchQuery}" (${currentMatchIndex + 1}/${searchMatches.length} matches)`
      )
    ]),
    
    // Log content
    React.createElement(Box, { 
      key: 'content',
      flexGrow: 1, 
      borderStyle: 'single',
      borderTop: false,
      borderBottom: false,
      paddingX: 1,
      flexDirection: 'column'
    }, [
      ...visibleLogs.map((log, index) => {
        const globalIndex = scrollOffset + index;
        const isMatch = isSearchMatch(globalIndex);
        const lineNumber = String(globalIndex + 1).padStart(4, ' ');
        
        return React.createElement(Box, { key: globalIndex }, [
          React.createElement(Text, { key: 'line-num', color: 'gray', dimColor: true }, 
            `${lineNumber} `
          ),
          React.createElement(Text, { 
            key: 'content',
            color: getLogColor(log.type),
            backgroundColor: isMatch ? 'yellow' : undefined,
            inverse: isMatch && searchMatches[currentMatchIndex] === globalIndex
          }, log.content)
        ]);
      }),
      
      // Scroll indicators
      scrollOffset > 0 && React.createElement(Box, { 
        key: 'scroll-up',
        position: 'absolute', 
        marginTop: -1 
      },
        React.createElement(Text, { color: 'gray' }, '↑ More above ↑')
      ),
      scrollOffset + contentHeight < logs.length && React.createElement(Box, { 
        key: 'scroll-down',
        position: 'absolute', 
        marginTop: contentHeight - 1 
      },
        React.createElement(Text, { color: 'gray' }, '↓ More below ↓')
      )
    ]),
    
    // Footer or Search bar
    searchMode ? 
      React.createElement(Box, { 
        key: 'search-bar',
        borderStyle: 'single', 
        borderTop: false, 
        paddingX: 1 
      }, [
        React.createElement(Text, { key: 'prompt', color: 'cyan' }, '/'),
        React.createElement(TextInput, {
          key: 'input',
          value: searchQuery,
          onChange: setSearchQuery,
          focus: searchMode,
          placeholder: 'Search logs...'
        })
      ]) :
      React.createElement(Box, { 
        key: 'footer',
        borderStyle: 'single', 
        borderTop: false, 
        paddingX: 1 
      },
        React.createElement(Text, { color: 'gray' },
          `q:exit /:search n/N:next/prev j/k:scroll f:auto-scroll(${autoScroll ? 'on' : 'off'}) G:bottom gg:top`
        )
      )
  ]);
};

module.exports = { DetailView };