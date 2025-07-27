// Factory function to create App component with dynamic imports
import React from 'react';
import App from './App';

async function createApp(): Promise<React.FC<{ agentManager?: unknown }>> {
  return App;
}

export default createApp;
