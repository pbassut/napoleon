#!/usr/bin/env node

// Mock Napoleon for UI tests - simulates the real Napoleon UI behavior

const agents = [];
let selectedIndex = 0;
let inDialog = false;
let dialogType = null;
let dialogBuffer = '';
const activityFrame = 0;
const activityFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ANSI escape codes
const ESC = '\u001b';
const CLEAR = '\u001bc';
const BOLD = '\u001b[1m';
const RESET = '\u001b[0m';
const BLUE = '\u001b[34m';
const GREEN = '\u001b[32m';
const GRAY = '\u001b[90m';

function render() {
  process.stdout.write(CLEAR);

  // Header with activity indicator
  const hasRunningAgents = agents.some((a) => a.status === 'running');
  const activity = hasRunningAgents ? ` ${activityFrames[activityFrame]}` : '';
  console.log(`${BOLD}Napoleon${RESET} › Ready${activity}`);
  console.log('');

  // Agent list or empty state
  if (agents.length === 0) {
    console.log(`${GRAY}No agents${RESET}`);
  } else {
    agents.forEach((agent, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const status = agent.status === 'running' ? `${GREEN}running${RESET}` : agent.status;
      console.log(`${prefix}[${agent.id}] ${agent.prompt} (${status})`);
    });
  }

  // Scroll indicators
  if (agents.length > 5) {
    // Show indicators based on selected position
    if (selectedIndex > 0) {
      console.log('↑'); // Top indicator when not at first item
    }
    if (selectedIndex < agents.length - 1) {
      console.log('↓'); // Bottom indicator when not at last item
    }
  }

  console.log('');

  // Dialog
  if (inDialog) {
    console.log('┌─────────────────────────────────┐');
    if (dialogType === 'spawn') {
      console.log(`│ ${BOLD}Spawn New Agent${RESET}             │`);
      console.log('├─────────────────────────────────┤');
      console.log(`│ Prompt: ${dialogBuffer}_                │`);
    } else if (dialogType === 'terminate') {
      console.log(`│ ${BOLD}Terminate Agent?${RESET}            │`);
      console.log('├─────────────────────────────────┤');
      console.log('│ Press y to confirm, n to cancel │');
    }
    console.log('└─────────────────────────────────┘');
  } else {
    // Footer with shortcuts
    console.log(`${GRAY}n${RESET} new agent  ${GRAY}t${RESET} terminate  ${GRAY}q${RESET} quit`);
  }

  // Force flush output
  if (process.stdout.isTTY) {
    process.stdout.write('');
  }
}

// Input handling - skip during tests to avoid open handles
if (process.env.NODE_ENV !== 'test' && typeof jest === 'undefined') {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
  // Ctrl+C or q to quit
    if (key === '\u0003' || (!inDialog && key === 'q')) {
      process.exit();
    }

    if (inDialog) {
      if (dialogType === 'spawn') {
        if (key === '\r') { // Enter key
          if (dialogBuffer.trim()) {
            const newAgent = {
              id: agents.length + 1,
              prompt: dialogBuffer.trim(),
              status: 'running',
            };
            agents.push(newAgent);
            selectedIndex = agents.length - 1; // Select the newly spawned agent
          }
          dialogBuffer = '';
          inDialog = false;
          dialogType = null;
          render();
        } else if (key === ESC) { // Escape
          dialogBuffer = '';
          inDialog = false;
          dialogType = null;
          render();
        } else if (key === '\u007f') { // Backspace
          dialogBuffer = dialogBuffer.slice(0, -1);
          render();
        } else if (key.charCodeAt(0) >= 32 && key.charCodeAt(0) < 127) {
          dialogBuffer += key;
          render();
        }
      } else if (dialogType === 'terminate') {
        if (key === 'y') {
          agents.splice(selectedIndex, 1);
          if (selectedIndex >= agents.length && selectedIndex > 0) {
            selectedIndex--;
          }
          inDialog = false;
          dialogType = null;
          render();
        } else if (key === 'n' || key === ESC) {
          inDialog = false;
          dialogType = null;
          render();
        }
      }
    } else if (key === 'n') {
    // Main navigation
      inDialog = true;
      dialogType = 'spawn';
      dialogBuffer = '';
      render();
    } else if (key === 't' && agents.length > 0) {
      inDialog = true;
      dialogType = 'terminate';
      render();
    } else if (key === '\u001b[A') { // Up arrow
      if (agents.length > 0) {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : agents.length - 1;
        render();
      }
    } else if (key === '\u001b[B') { // Down arrow
      if (agents.length > 0) {
        selectedIndex = (selectedIndex + 1) % agents.length;
        render();
      }
    }
  });
}

// Initial render
render();

// Update activity indicator - disabled for tests to avoid interference
// const activityInterval = setInterval(() => {
//   if (agents.some(a => a.status === 'running')) {
//     activityFrame = (activityFrame + 1) % activityFrames.length;
//     render();
//   }
// }, 100);
