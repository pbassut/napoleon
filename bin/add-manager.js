#!/usr/bin/env node

const { program } = require('commander');
const { validateEnvironment } = require('../src/cli/validators/environment');
const { initializeApplication } = require('../src/cli/index');
const logger = require('../src/utils/logger');

async function main() {
  try {
    // Validate system requirements
    await validateEnvironment();

    // Initialize CLI framework
    await initializeApplication(program);

    // Parse arguments and execute
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('Application startup failed', { error: error.message });

    // Display user-friendly error message
    if (error.code && error.suggestion) {
      console.error(`Error: ${error.message}`);
      console.error(`Suggestion: ${error.suggestion}`);
    } else {
      console.error(`Error: ${error.message}`);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
