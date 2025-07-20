#!/usr/bin/env node

// Test script to identify infinite loop with debug logging
console.log('🚀 Starting infinite loop debug test...\n');

// Temporarily replace the normal modules with debug versions
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Intercept and redirect to debug versions
  if (id.includes('hooks/useAgentManager') && !id.includes('.debug')) {
    console.log('📝 Redirecting to useAgentManager.debug.ts');
    return originalRequire.call(this, id.replace('useAgentManager', 'useAgentManager.debug'));
  }
  if (id.includes('ui/ink/App') && !id.includes('.debug')) {
    console.log('📝 Redirecting to App.debug.tsx');
    return originalRequire.call(this, id.replace('App.tsx', 'App.debug.tsx'));
  }
  return originalRequire.call(this, id);
};

// Set debug environment
process.env.NAPOLEON_FORCE_INK = 'true';
process.env.NAPOLEON_DEBUG_INFINITE_LOOP = 'true';

console.log('📝 Debug environment set, starting Napoleon...\n');

// Start napoleon
require('./bin/napoleon.js');