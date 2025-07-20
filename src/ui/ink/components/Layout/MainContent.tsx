import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) =>
  // Just pass through children for now
  children;