#!/usr/bin/env node

/**
 * Terminal compatibility test script
 * Run this to test terminal capabilities and rendering
 */

const chalk = require('chalk');
const { detectCapabilities, getBoxChar, getStatusSymbol } = require('./terminal-capabilities');

console.log('Napoleon Terminal Compatibility Test\n');

// Detect capabilities
const capabilities = detectCapabilities();

// Display detected capabilities
console.log('Detected Terminal:', chalk.cyan(capabilities.terminalName));
console.log('Platform:', chalk.cyan(process.platform));
console.log('Node Version:', chalk.cyan(process.version));
console.log('');

console.log('Capabilities:');
console.log('  Color Support:', chalk.green(capabilities.colors === 'truecolor' ? '24-bit True Color' : `${capabilities.colors} colors`));
console.log('  Unicode:', capabilities.unicode ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Box Drawing:', capabilities.boxDrawing ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Mouse:', capabilities.mouse ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Alt Buffer:', capabilities.altBuffer ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Italics:', capabilities.italics ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('  Hyperlinks:', capabilities.hyperlinks ? chalk.green('✓ Supported') : chalk.red('✗ Not Supported'));
console.log('');

// Test box drawing
console.log('Box Drawing Test:');
console.log(`  ${getBoxChar('topLeft')}${getBoxChar('horizontal').repeat(20)}${getBoxChar('topRight')}`);
console.log(`  ${getBoxChar('vertical')} Box Drawing Test   ${getBoxChar('vertical')}`);
console.log(`  ${getBoxChar('teeRight')}${getBoxChar('horizontal').repeat(20)}${getBoxChar('teeLeft')}`);
console.log(`  ${getBoxChar('vertical')} Unicode: ${capabilities.unicode ? 'Enabled ' : 'Disabled'}    ${getBoxChar('vertical')}`);
console.log(`  ${getBoxChar('bottomLeft')}${getBoxChar('horizontal').repeat(20)}${getBoxChar('bottomRight')}`);
console.log('');

// Test status symbols
console.log('Status Symbols Test:');
console.log('  Success:', chalk.green(getStatusSymbol('success')));
console.log('  Error:', chalk.red(getStatusSymbol('error')));
console.log('  Warning:', chalk.yellow(getStatusSymbol('warning')));
console.log('  Info:', chalk.blue(getStatusSymbol('info')));
console.log('  Running:', chalk.green(getStatusSymbol('running')));
console.log('  Pending:', chalk.yellow(getStatusSymbol('pending')));
console.log('  Terminated:', chalk.gray(getStatusSymbol('terminated')));
console.log('');

// Test colors
console.log('Color Test:');
if (capabilities.colors === 'truecolor') {
  // True color gradient
  console.log('  True Color Gradient:');
  let gradient = '  ';
  for (let i = 0; i < 40; i++) {
    const r = Math.floor(255 * (i / 40));
    const g = Math.floor(255 * (1 - i / 40));
    const b = 128;
    gradient += chalk.rgb(r, g, b)('█');
  }
  console.log(gradient);
} else if (capabilities.colors === 256) {
  console.log('  256 Color Test:');
  let colors = '  ';
  for (let i = 0; i < 16; i++) {
    colors += chalk.ansi256(i + 232)('█');
  }
  console.log(colors);
} else {
  console.log('  16 Color Test:');
  console.log(`  ${chalk.black.bgWhite(' Black ')} ${chalk.red(' Red ')} ${chalk.green(' Green ')} ${chalk.yellow(' Yellow ')}`);
  console.log(`  ${chalk.blue(' Blue ')} ${chalk.magenta(' Magenta ')} ${chalk.cyan(' Cyan ')} ${chalk.white(' White ')}`);
}
console.log('');

// Test text styles
console.log('Text Style Test:');
console.log('  Bold:', chalk.bold('Bold Text'));
console.log('  Italic:', capabilities.italics ? chalk.italic('Italic Text') : 'Italic (Not Supported)');
console.log('  Underline:', chalk.underline('Underlined Text'));
console.log('  Strikethrough:', chalk.strikethrough('Strikethrough Text'));
console.log('  Dim:', chalk.dim('Dim Text'));
console.log('');

// Environment variables
console.log('Environment Overrides:');
console.log('  NAPOLEON_FORCE_ASCII:', process.env.NAPOLEON_FORCE_ASCII || 'not set');
console.log('  NAPOLEON_NO_COLOR:', process.env.NAPOLEON_NO_COLOR || 'not set');
console.log('  NAPOLEON_NO_MOUSE:', process.env.NAPOLEON_NO_MOUSE || 'not set');
console.log('');

// Test recommendations
console.log('Recommendations:');
if (!capabilities.unicode) {
  console.log(`  - ${chalk.yellow('Unicode not supported. UI will use ASCII fallbacks.')}`);
}
if (capabilities.colors === 16) {
  console.log(`  - ${chalk.yellow('Limited color support. Consider upgrading your terminal.')}`);
}
if (!capabilities.mouse) {
  console.log(`  - ${chalk.yellow('Mouse support not detected. Keyboard navigation only.')}`);
}
if (capabilities.unicode && capabilities.colors >= 256 && capabilities.mouse) {
  console.log(`  - ${chalk.green('Your terminal has excellent compatibility!')}`);
}

console.log('\nPress Ctrl+C to exit.');
