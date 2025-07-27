import React from 'react';
import { Box } from 'ink';

const { memo } = React;

interface ModalOverlayProps {
  isOpen: boolean;
  children: React.ReactNode;
  zIndex?: number;
}

/**
 * Reusable modal overlay component that provides consistent centering
 * and prevents flickering by always staying in the DOM
 */
export const ModalOverlay: React.FC<ModalOverlayProps> = memo(({
  isOpen,
  children,
  zIndex = 1000,
}) =>
  // Always render the structure to prevent flickering
  // Keep in DOM but control visibility and interactivity
  (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      display={isOpen ? 'flex' : 'none'}
    >
      {/* Semi-transparent overlay background */}
      <Box
        position="absolute"
        width="100%"
        height="100%"
      />

      {/* Modal content - only render when open to prevent unnecessary renders */}
      {isOpen && (
        <Box position="relative">
          {children}
        </Box>
      )}
    </Box>
  ));

ModalOverlay.displayName = 'ModalOverlay';
ModalOverlay.whyDidYouRender = false;
