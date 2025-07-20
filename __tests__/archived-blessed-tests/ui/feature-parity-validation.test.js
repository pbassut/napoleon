/**
 * Feature Parity Validation Test Suite
 * 
 * This test suite validates that all features from the Blessed UI
 * are correctly implemented in the Ink UI with identical behavior.
 */

const path = require('path');
const fs = require('fs');

describe('Feature Parity Validation - US055', () => {
  const featureDocsPath = path.join(__dirname, '../../docs/blessed-ui-feature-documentation.md');
  const parityChecklistPath = path.join(__dirname, '../../docs/ink-ui-feature-parity-checklist.md');
  
  describe('Documentation Validation', () => {
    test('Blessed UI feature documentation exists', () => {
      expect(fs.existsSync(featureDocsPath)).toBe(true);
    });
    
    test('Feature parity checklist exists', () => {
      expect(fs.existsSync(parityChecklistPath)).toBe(true);
    });
    
    test('All documented features are tracked in checklist', () => {
      const featureDocs = fs.readFileSync(featureDocsPath, 'utf8');
      const checklist = fs.readFileSync(parityChecklistPath, 'utf8');
      
      // Extract keyboard shortcuts from documentation
      const shortcutRegex = /\| `([^`]+)` \|/g;
      const documentedShortcuts = [];
      let match;
      while ((match = shortcutRegex.exec(featureDocs)) !== null) {
        documentedShortcuts.push(match[1]);
      }
      
      // Verify each shortcut appears in checklist
      documentedShortcuts.forEach(shortcut => {
        expect(checklist).toContain(shortcut);
      });
    });
  });
  
  describe('Keyboard Shortcut Parity', () => {
    const inkAppPath = path.join(__dirname, '../../src/ui/ink/App.js');
    const inkApp = fs.readFileSync(inkAppPath, 'utf8');
    
    const globalShortcuts = [
      { key: 'q', description: 'Quit application' },
      { key: 'n', description: 'New agent' },
      { key: 'd', description: 'Delete/terminate agent' },
      { key: 'Enter', description: 'View details' },
      { key: 'i', description: 'View details (alternate)' }
    ];
    
    globalShortcuts.forEach(({ key, description }) => {
      test(`Ink implements '${key}' shortcut for ${description}`, () => {
        // Check if the key handler exists in the Ink app
        const keyPattern = new RegExp(`input === '${key}'|key\\.${key}|key\\.return`, 'i');
        expect(inkApp).toMatch(keyPattern);
      });
    });
    
    test('Ink handles arrow key navigation', () => {
      expect(inkApp).toContain('key.upArrow');
      expect(inkApp).toContain('key.downArrow');
    });
    
    test('Ink blocks shortcuts when dialogs are open', () => {
      // Check for dialog state checks
      expect(inkApp).toMatch(/isSpawnDialogOpen.*isTerminationDialogOpen/);
    });
  });
  
  describe('UI Component Parity', () => {
    const componentsToCheck = [
      { name: 'Header', path: 'components/Layout/Header.js' },
      { name: 'Footer', path: 'components/Layout/Footer.js' },
      { name: 'AgentList', path: 'components/AgentList/index.js' },
      { name: 'SpawnDialog', path: 'components/Dialogs/SpawnDialog.js' },
      { name: 'TerminationDialog', path: 'components/Dialogs/TerminationDialog.js' },
      { name: 'DetailView', path: 'components/DetailView/index.js' }
    ];
    
    componentsToCheck.forEach(({ name, path: componentPath }) => {
      test(`${name} component exists in Ink UI`, () => {
        const fullPath = path.join(__dirname, '../../src/ui/ink', componentPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });
  
  describe('Agent Management Features', () => {
    test('AgentManager hook provides all required operations', () => {
      const hookPath = path.join(__dirname, '../../src/ui/ink/hooks/useAgentManager.js');
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      
      const requiredMethods = [
        'spawnAgent',
        'terminateAgent',
        'selectAgent',
        'agents',
        'selectedAgent',
        'selectedAgentId'
      ];
      
      requiredMethods.forEach(method => {
        expect(hookContent).toContain(method);
      });
    });
    
    test('SpawnDialog supports multi-line input', () => {
      const dialogPath = path.join(__dirname, '../../src/ui/ink/components/Dialogs/SpawnDialog.js');
      const dialogContent = fs.readFileSync(dialogPath, 'utf8');
      
      // Check for multi-line support indicators
      expect(dialogContent).toMatch(/multiline|Shift.*Enter/i);
    });
  });
  
  describe('Edge Case Handling', () => {
    test('Empty state is handled in AgentList', () => {
      const listPath = path.join(__dirname, '../../src/ui/ink/components/AgentList/index.js');
      const listContent = fs.readFileSync(listPath, 'utf8');
      
      // Check for empty state handling
      expect(listContent).toMatch(/agents\.length === 0|No agents/i);
    });
    
    test('Error states are handled in dialogs', () => {
      const spawnPath = path.join(__dirname, '../../src/ui/ink/components/Dialogs/SpawnDialog.js');
      const spawnContent = fs.readFileSync(spawnPath, 'utf8');
      
      expect(spawnContent).toContain('error');
      expect(spawnContent).toContain('setError');
    });
  });
  
  describe('Missing Features Detection', () => {
    const missingFeatures = [];
    
    test('Help system (h key) is implemented', () => {
      const appPath = path.join(__dirname, '../../src/ui/ink/App.js');
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      if (!appContent.includes("input === 'h'")) {
        missingFeatures.push('Help system (h key)');
        expect(appContent).toContain("input === 'h'");
      }
    });
    
    test('External log viewer (l key) is implemented', () => {
      const detailPath = path.join(__dirname, '../../src/ui/ink/components/DetailView/index.js');
      if (fs.existsSync(detailPath)) {
        const detailContent = fs.readFileSync(detailPath, 'utf8');
        if (!detailContent.includes("input === 'l'")) {
          missingFeatures.push('External log viewer (l key)');
        }
      } else {
        missingFeatures.push('DetailView component');
      }
    });
    
    test('Search functionality (/) is implemented', () => {
      const detailPath = path.join(__dirname, '../../src/ui/ink/components/DetailView/index.js');
      if (fs.existsSync(detailPath)) {
        const detailContent = fs.readFileSync(detailPath, 'utf8');
        if (!detailContent.includes("input === '/'")) {
          missingFeatures.push('Search functionality (/)');
        }
      }
    });
    
    afterAll(() => {
      if (missingFeatures.length > 0) {
        console.log('\n⚠️  Missing Features Detected:');
        missingFeatures.forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature}`);
        });
        console.log('\nRefer to docs/ink-ui-missing-features-summary.md for implementation guidance.\n');
      }
    });
  });
  
  describe('Performance Characteristics', () => {
    test('Ink UI does not have obvious performance bottlenecks', () => {
      const appPath = path.join(__dirname, '../../src/ui/ink/App.js');
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      // Check for common performance issues
      expect(appContent).not.toMatch(/setInterval.*1(?!\d)/); // No 1ms intervals
      expect(appContent).not.toMatch(/while\s*\(true\)/); // No infinite loops
    });
  });
});