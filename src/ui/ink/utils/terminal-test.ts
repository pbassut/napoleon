#!/usr/bin/env node

/**
 * Terminal compatibility test script
 * Run this to test terminal capabilities and rendering
 */

import chalk from 'chalk';
import { detectCapabilities, getBoxChar, getStatusSymbol } from './terminal-capabilities';

console.log('Napoleon Terminal Compatibility Test\n');

// Detect capabilities
const capabilities = detectCapabilities();

// Display detected capabilities
console.log('Detected Terminal:', chalk.cyan(capabilities.terminalName));
console.log('Platform:', chalk.cyan(process.platform));
console.log('Node Version:', chalk.cyan(process.version));
console.log('');

console.log('Capabilities:');
console.log('  Color Support:', chalk.green(capabilities.colors === 16777216 ? '24-bit True Color' : `${capabilities.colors} colors`));
console.log('  Unicode:', capabilities.unicode ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Box Drawing:', capabilities.boxDrawing ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Mouse:', capabilities.mouse ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Alt Buffer:', capabilities.altBuffer ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Italics:', capabilities.italics ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Hyperlinks:', capabilities.hyperlinks ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('');

// Test box drawing characters
console.log('Box Drawing Test:');
const topLeft = getBoxChar('topLeft', capabilities);
const topRight = getBoxChar('topRight', capabilities);
const bottomLeft = getBoxChar('bottomLeft', capabilities);
const bottomRight = getBoxChar('bottomRight', capabilities);
const horizontal = getBoxChar('horizontal', capabilities);
const vertical = getBoxChar('vertical', capabilities);

console.log(`${topLeft}${horizontal.repeat(20)}${topRight}`);
for (let i = 0; i < 3; i++) {
  console.log(`${vertical}${' '.repeat(20)}${vertical}`);
}
console.log(`${bottomLeft}${horizontal.repeat(20)}${bottomRight}`);
console.log('');

// Test status symbols
console.log('Status Symbol Test:');
const statuses = ['running', 'pending', 'error', 'success', 'terminated'];
statuses.forEach((status) => {
  const symbol = getStatusSymbol(status, capabilities);
  const color = status === 'running' ? 'green'
    : status === 'pending' ? 'yellow'
      : status === 'error' ? 'red'
        : status === 'success' ? 'green' : 'gray';
  console.log(`  ${chalk[color](symbol)} ${status}`);
});
console.log('');

// Test colors
console.log('Color Test:');
console.log(chalk.red('Red'), chalk.green('Green'), chalk.blue('Blue'), chalk.yellow('Yellow'));
console.log(chalk.cyan('Cyan'), chalk.magenta('Magenta'), chalk.white('White'), chalk.gray('Gray'));
console.log('');

// Environment variables
console.log('Environment Variables:');
console.log('  TERM:', process.env.TERM || 'not set');
console.log('  COLORTERM:', process.env.COLORTERM || 'not set');
console.log('  TERM_PROGRAM:', process.env.TERM_PROGRAM || 'not set');
console.log('  WT_SESSION:', process.env.WT_SESSION || 'not set');
console.log('  LANG:', process.env.LANG || 'not set');
console.log('');

console.log('Test completed successfully!');

export {};
