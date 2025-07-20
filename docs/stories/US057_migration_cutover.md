# US057: Migration Cutover

## Epic
**Epic 7: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to complete the final cutover from Blessed to Ink UI,
so that we can remove the legacy code and fully adopt the modern React-based architecture.

## Description
This story covers the final migration steps to completely switch from Blessed to Ink. This includes updating all entry points to use Ink by default, removing Blessed dependencies from the project, updating all documentation to reflect the new UI, migrating any remaining configuration, and ensuring a smooth transition for all users. The cutover must be carefully orchestrated to minimize disruption and provide rollback capabilities if issues arise. This is the culmination of the entire migration effort.

## Priority
**MEDIUM** - Final step that can only happen after all other migration work is complete.

## Acceptance Criteria

### AC1: Update Entry Points
- Modify main entry point to use Ink UI
- Remove Blessed UI initialization code
- Update CLI flags if any exist
- Ensure proper error handling
- Maintain backwards compatibility flags

### AC2: Remove Blessed Dependencies
- Remove blessed and blessed-contrib from package.json
- Delete all Blessed-specific code files
- Clean up unused utilities
- Remove Blessed types/interfaces
- Update build configuration

### AC3: Documentation Updates
- Update README with Ink information
- Revise user guides for new UI
- Update developer documentation
- Create migration notes for users
- Update screenshots/demos

### AC4: Configuration Migration
- Migrate any Blessed-specific config
- Update default settings for Ink
- Ensure config backwards compatibility
- Document configuration changes
- Provide migration scripts if needed

### AC5: Rollback Strategy
- Implement feature flag for UI selection
- Keep Blessed code in separate branch
- Document rollback procedures
- Test rollback scenarios
- Plan emergency response

## Tasks/Subtasks

- [ ] Update entry points (AC1)
  - [ ] Modify src/ui/index.js to load Ink
  - [ ] Update napoleon.js entry point
  - [ ] Add --use-legacy-ui flag
  - [ ] Test startup with new UI
  - [ ] Verify error handling

- [ ] Remove Blessed code (AC2)
  - [ ] Delete Blessed component files
  - [ ] Remove from package.json
  - [ ] Clean up related utilities
  - [ ] Update TypeScript configs
  - [ ] Run dependency audit

- [ ] Update documentation (AC3)
  - [ ] Revise README.md
  - [ ] Update user guide
  - [ ] Create migration guide
  - [ ] Update API documentation
  - [ ] Record new demo videos

- [ ] Migrate configuration (AC4)
  - [ ] Identify Blessed-specific settings
  - [ ] Create config migration logic
  - [ ] Test configuration compatibility
  - [ ] Document changes
  - [ ] Build migration tools

- [ ] Implement rollback (AC5)
  - [ ] Create legacy UI flag
  - [ ] Tag pre-migration release
  - [ ] Document rollback steps
  - [ ] Test rollback procedures
  - [ ] Prepare hotfix process

## Dev Notes

### Entry Point Updates

```typescript
// napoleon.js
import { config } from './config';

async function main() {
  const ui = config.useLegacyUI ? 'blessed' : 'ink';
  
  if (ui === 'blessed' && !isLegacyUIAvailable()) {
    console.error('Legacy UI no longer available. Please update your configuration.');
    process.exit(1);
  }
  
  // Dynamic import based on UI choice
  const { startUI } = await import(`./ui/${ui}/index.js`);
  await startUI();
}

// Support --use-legacy-ui flag for emergency rollback
if (process.argv.includes('--use-legacy-ui')) {
  config.useLegacyUI = true;
}
```

### Dependency Cleanup

```bash
# Remove Blessed dependencies
npm uninstall blessed blessed-contrib

# Clean up any remaining files
find . -name "*.blessed.js" -delete
find . -name "*blessed*.test.js" -delete

# Update package-lock.json
npm install
```

### Configuration Migration

```typescript
// Config migration utility
class ConfigMigrator {
  migrate(oldConfig: BlessedConfig): InkConfig {
    return {
      // Map old settings to new
      theme: this.migrateTheme(oldConfig.colors),
      keyBindings: this.migrateKeyBindings(oldConfig.keys),
      ui: {
        animations: oldConfig.animations !== false,
        compactMode: oldConfig.compactDisplay || false
      }
    };
  }
  
  private migrateTheme(blessedColors: any): Theme {
    return {
      primary: blessedColors.focus || 'blue',
      background: blessedColors.bg || 'black',
      text: blessedColors.fg || 'white'
    };
  }
}
```

### Rollback Implementation

```typescript
// Emergency rollback support
const LEGACY_UI_AVAILABLE_UNTIL = '2025-12-31';

function isLegacyUIAvailable(): boolean {
  if (process.env.FORCE_LEGACY_UI === 'true') {
    console.warn('Using legacy UI through force flag');
    return true;
  }
  
  const cutoffDate = new Date(LEGACY_UI_AVAILABLE_UNTIL);
  const now = new Date();
  
  if (now > cutoffDate) {
    return false;
  }
  
  console.warn(`Legacy UI available until ${LEGACY_UI_AVAILABLE_UNTIL}`);
  return true;
}
```

### Migration Checklist

```markdown
## Pre-Cutover Checklist
- [ ] All Ink stories completed and tested
- [ ] Parallel testing shows >95% parity
- [ ] Performance metrics acceptable
- [ ] Terminal compatibility verified
- [ ] User documentation updated
- [ ] Team trained on new codebase

## Cutover Steps
1. [ ] Tag current version as pre-ink-migration
2. [ ] Merge ink-migration branch to main
3. [ ] Update entry points
4. [ ] Remove Blessed dependencies
5. [ ] Deploy to staging
6. [ ] Run smoke tests
7. [ ] Deploy to production
8. [ ] Monitor for issues

## Post-Cutover
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Address any issues
- [ ] Remove legacy code (after 30 days)
- [ ] Archive Blessed branch
```

### User Communication

```typescript
// First-run message for existing users
function showMigrationMessage() {
  if (hasSeenMigrationMessage()) return;
  
  console.log(chalk.blue('═══════════════════════════════════════'));
  console.log(chalk.bold('Welcome to Napoleon\'s New UI! 🎉'));
  console.log();
  console.log('We\'ve upgraded to a modern React-based interface.');
  console.log('Everything works the same, just faster and better!');
  console.log();
  console.log('If you experience any issues:');
  console.log('- Use --use-legacy-ui flag for the old interface');
  console.log('- Report issues at: github.com/napoleon/issues');
  console.log();
  console.log(chalk.blue('═══════════════════════════════════════'));
  
  markMigrationMessageSeen();
}
```

## Status
**In Progress**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-20 | 1.1 | Story approved | Scrum Master Bob |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_