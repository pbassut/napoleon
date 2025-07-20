# Napoleon UI Migration Rollback Guide

## Overview

This document provides instructions for rolling back from the new Ink UI to the legacy Blessed UI in case of issues during or after migration.

## Quick Rollback

### For Users

If you experience issues with the new UI, you can immediately switch back to the legacy UI:

```bash
# Use the legacy UI flag
napoleon start --use-legacy-ui

# Or set environment variable
NAPOLEON_UI=blessed napoleon start

# For permanent legacy UI (until cutoff date)
echo "NAPOLEON_UI=blessed" >> ~/.bashrc  # or ~/.zshrc
```

### For Developers

To roll back the entire deployment:

1. **Immediate Rollback** (if legacy UI is still available):
   ```bash
   # Set default UI back to blessed
   export NAPOLEON_DEFAULT_UI=blessed
   
   # Update package.json start script
   npm run start:legacy
   ```

2. **Version Rollback**:
   ```bash
   # Find the pre-migration tag
   git tag -l "pre-ink-migration*"
   
   # Checkout the pre-migration version
   git checkout pre-ink-migration-v1.0.0
   
   # Create a hotfix branch
   git checkout -b hotfix/rollback-to-blessed
   ```

## Rollback Scenarios

### Scenario 1: Individual User Issues

**Symptoms**: Specific users report UI problems

**Solution**:
1. Advise users to use `--use-legacy-ui` flag
2. Collect debug logs: `napoleon logs list`
3. Document specific issues for fixing

### Scenario 2: Performance Degradation

**Symptoms**: UI becomes slow or unresponsive

**Solution**:
1. Enable legacy UI globally in configuration
2. Run performance profiling: `npm run test:parallel`
3. Identify bottlenecks in Ink implementation

### Scenario 3: Terminal Compatibility Issues

**Symptoms**: UI doesn't render correctly in certain terminals

**Solution**:
1. Check terminal compatibility matrix
2. Set terminal-specific overrides:
   ```bash
   # Force ASCII mode for limited terminals
   export NAPOLEON_FORCE_ASCII=true
   ```
3. Use legacy UI for affected users

### Scenario 4: Critical Feature Broken

**Symptoms**: Core functionality not working in Ink UI

**Emergency Response**:
1. **Immediate**: Deploy hotfix to set default UI to blessed
2. **Short-term**: Fix the broken feature in Ink
3. **Long-term**: Re-test and re-deploy

## Configuration Rollback

### UI Configuration File

Location: `~/.napoleon/ui-config.json`

```json
{
  "defaultUI": "blessed",
  "useLegacyUI": true,
  "allowLegacyUI": true
}
```

### Environment Variables

```bash
# Force legacy UI
export FORCE_LEGACY_UI=true

# Set default UI
export NAPOLEON_UI=blessed

# Disable migration message
export NAPOLEON_SKIP_MIGRATION_MSG=true
```

## Emergency Procedures

### 1. Global Rollback (Production)

```bash
# 1. Update production configuration
kubectl set env deployment/napoleon NAPOLEON_DEFAULT_UI=blessed

# 2. Restart all instances
kubectl rollout restart deployment/napoleon

# 3. Verify rollback
kubectl logs -l app=napoleon --tail=100
```

### 2. Partial Rollback (Canary)

```bash
# Keep 10% on new UI, 90% on legacy
kubectl set env deployment/napoleon-canary NAPOLEON_UI=ink
kubectl set env deployment/napoleon-stable NAPOLEON_UI=blessed
```

### 3. Database/Config Rollback

If configuration was migrated:

```bash
# Restore configuration backup
cp ~/.napoleon/ui-config.backup.json ~/.napoleon/ui-config.json

# Clear migration flags
rm ~/.napoleon/.migration-completed
```

## Monitoring During Rollback

### Key Metrics to Watch

1. **Error Rate**: Check for UI initialization failures
   ```bash
   grep -E "UI initialization failed|Failed to start" ~/.napoleon/logs/*.log
   ```

2. **Performance**: Monitor UI responsiveness
   ```bash
   npm run test:parallel -- single performance
   ```

3. **User Reports**: Track issues
   ```bash
   napoleon logs search "error" --from "2025-07-20"
   ```

## Post-Rollback Actions

After successful rollback:

1. **Document Issues**:
   - Create GitHub issues for each problem
   - Tag with `ink-migration-blocker`

2. **Communicate**:
   - Notify users of rollback
   - Provide timeline for fixes

3. **Fix and Re-test**:
   - Address all blocking issues
   - Run full parallel test suite
   - Perform gradual rollout

## Legacy UI Sunset Plan

The legacy Blessed UI will be available until: **2025-12-31**

After this date:
- `--use-legacy-ui` flag will no longer work
- Only Ink UI will be available
- Emergency override: `FORCE_LEGACY_UI=true` (for critical situations only)

## Support Contacts

- **GitHub Issues**: https://github.com/pbassut/napoleon/issues
- **Emergency**: Use `FORCE_LEGACY_UI=true` and file critical issue

## Appendix: Common Issues and Solutions

### Issue: "Legacy UI no longer available"

**Solution**:
```bash
# Check cutoff date
node -e "console.log(new Date('2025-12-31') > new Date())"

# If before cutoff, force legacy
export FORCE_LEGACY_UI=true
napoleon start
```

### Issue: "UI crashes on startup"

**Solution**:
1. Clear UI cache: `rm -rf ~/.napoleon/ui-cache`
2. Reset configuration: `rm ~/.napoleon/ui-config.json`
3. Start with defaults: `napoleon start`

### Issue: "Keyboard shortcuts not working"

**Solution**:
1. Check key bindings were migrated correctly
2. Reset to defaults in config
3. Use legacy UI until fixed

---

Remember: The goal is zero downtime and minimal user disruption. When in doubt, roll back first and investigate later.