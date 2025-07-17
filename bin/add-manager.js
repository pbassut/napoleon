#!/usr/bin/env node

const { program } = require('commander');
const { validateEnvironment } = require('../src/cli/validators/environment');
const { initializeApplication } = require('../src/cli/index');
const logger = require('../src/utils/logger');

// Global error handlers for production stability
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception occurred', { 
    error: error.message, 
    stack: error.stack 
  });
  console.error('Fatal error: Application crashed due to uncaught exception');
  console.error('Error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : 'No stack available'
  });
  console.error('Fatal error: Application crashed due to unhandled promise rejection');
  console.error('Reason:', reason instanceof Error ? reason.message : reason);
  process.exit(1);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Handle SIGINT gracefully (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  console.log('Shutting down gracefully...');
  process.exit(0);
});

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
