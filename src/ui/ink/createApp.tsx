// Factory function to create App component with dynamic imports
import React from 'react';
import App from './App';

async function createApp(): Promise<React.FC<any>> {
  return App;
}

export default createApp;
