import React from 'react';
import { render } from 'ink-testing-library';
import { Header } from '../../../../src/ui/ink/components/Layout/Header';
import { Footer } from '../../../../src/ui/ink/components/Layout/Footer';
import { MainContent } from '../../../../src/ui/ink/components/Layout/MainContent';

// Mock Ink components
jest.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: jest.fn(),
  useApp: () => ({ exit: jest.fn() }),
  useStdout: () => ({ stdout: { rows: 24, columns: 80 } }),
}));

describe('Layout Components', () => {
  describe('Header', () => {
    it('should render header', () => {
      const { lastFrame } = render(<Header />);
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Footer', () => {
    it('should render footer with agent count', () => {
      const { lastFrame } = render(
        <Footer agentCount={5} />
      );
      expect(lastFrame()).toBeDefined();
    });

    it('should render footer with zero agents', () => {
      const { lastFrame } = render(
        <Footer agentCount={0} />
      );
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('MainContent', () => {
    it('should render main content with children', () => {
      const { lastFrame } = render(
        <MainContent>
          <div>Test content</div>
        </MainContent>
      );
      expect(lastFrame()).toBeDefined();
    });

    it('should render empty main content', () => {
      const { lastFrame } = render(
        <MainContent>
        </MainContent>
      );
      expect(lastFrame()).toBeDefined();
    });
  });
});