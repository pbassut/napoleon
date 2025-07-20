import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

interface ActivityIndicatorProps {
  /** Whether the indicator is active/visible */
  isActive: boolean;
  /** The character/symbol to use for the indicator */
  symbol?: string;
  /** Color of the indicator */
  color?: string;
  /** Blink interval in milliseconds */
  interval?: number;
  /** Additional text to show next to the indicator */
  label?: string;
}

/**
 * A blinking activity indicator component
 * Shows a blinking dot or symbol when Claude is actively working
 */
export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  isActive,
  symbol = '●',
  color = 'green',
  interval = 500,
  label = ''
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setVisible(true); // Always show when not active (for consistency)
      return;
    }

    const timer = setInterval(() => {
      setVisible(prev => !prev);
    }, interval);

    return () => clearInterval(timer);
  }, [isActive, interval]);

  if (!isActive) {
    return null;
  }

  return (
    <Text color={color}>
      {visible ? symbol : ' '}{label && ` ${label}`}
    </Text>
  );
};

// Spinner variant with rotating animation
export const SpinnerIndicator: React.FC<ActivityIndicatorProps> = ({
  isActive,
  color = 'green',
  interval = 100,
  label = ''
}) => {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isActive, interval, frames.length]);

  if (!isActive) {
    return null;
  }

  return (
    <Text color={color}>
      {frames[frame]}{label && ` ${label}`}
    </Text>
  );
};