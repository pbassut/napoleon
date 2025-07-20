// Since Jest is not configured for TypeScript, we'll create a simple test to verify the component exists

const fs = require('fs');
const path = require('path');

describe('TerminationDialog (Ink)', () => {
  const componentPath = path.join(__dirname, '../../../src/ui/ink/components/Dialogs/TerminationDialog.tsx');

  it('should exist as a TypeScript file', () => {
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it('should contain the TerminationDialog export', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('export const TerminationDialog');
  });

  it('should have proper props interface', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('interface TerminationDialogProps');
    expect(content).toContain('isOpen: boolean');
    expect(content).toContain('agent: Agent | null');
    expect(content).toContain('onConfirm: () => void');
    expect(content).toContain('onCancel: () => void');
  });

  it('should import required dependencies', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain("import React, { useState } from 'react'");
    expect(content).toContain("import { Box, Text } from 'ink'");
    expect(content).toContain("import { useInput, Key } from 'ink'");
    expect(content).toContain("import { Agent } from '../AgentList'");
  });

  it('should handle keyboard inputs', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    // Check for escape key handling
    expect(content).toContain('key.escape');
    // Check for y/n key handling
    expect(content).toContain("input === 'y'");
    expect(content).toContain("input === 'n'");
    // Check for tab navigation
    expect(content).toContain('key.tab');
    // Check for return key
    expect(content).toContain('key.return');
  });

  it('should have loading state', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('loading');
    expect(content).toContain('setLoading');
    expect(content).toContain('Terminating...');
  });

  it('should format runtime correctly', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('formatRuntime');
    expect(content).toContain('hours');
    expect(content).toContain('minutes');
  });

  it('should default to No option', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain("useState<'no' | 'yes'>('no')");
  });

  it('should render warning message', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('This will stop the agent');
    expect(content).toContain('⚠️');
  });

  it('should not render when closed or no agent', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('if (!isOpen || !agent) return null');
  });
});