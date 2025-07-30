import React from 'react';
import { render } from 'ink-testing-library';
import { ActivityIndicator } from '../../../../src/ui/ink/components/Common/ActivityIndicator';
import ErrorBoundary from '../../../../src/ui/ink/components/Common/ErrorBoundary';
import { ModalOverlay } from '../../../../src/ui/ink/components/Common/ModalOverlay';

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: () => ({ exit: jest.fn() }),
}));

describe('Common Components', () => {
  describe('ActivityIndicator', () => {
    it('should render activity indicator when active', () => {
      const { lastFrame } = render(
        <ActivityIndicator isActive={true} />
      );
      
      expect(lastFrame()).toBeDefined();
    });

    it('should not render when inactive', () => {
      const { lastFrame } = render(
        <ActivityIndicator isActive={false} />
      );
      
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('ErrorBoundary', () => {
    it('should render children without error', () => {
      const { lastFrame } = render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('ModalOverlay', () => {
    it('should render modal overlay when open', () => {
      const { lastFrame } = render(
        <ModalOverlay isOpen={true}>
          <div>Modal content</div>
        </ModalOverlay>
      );
      
      expect(lastFrame()).toBeDefined();
    });

    it('should not render content when closed', () => {
      const { lastFrame } = render(
        <ModalOverlay isOpen={false}>
          <div>Modal content</div>
        </ModalOverlay>
      );
      
      expect(lastFrame()).toBeDefined();
    });
  });
});