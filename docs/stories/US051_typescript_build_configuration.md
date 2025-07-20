# US051: TypeScript Build Configuration

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to fix TypeScript module resolution and build configuration,
So that the project compiles cleanly without errors.

## Description
Following the Ink environment setup (US043), TypeScript compilation has module resolution issues due to the mixed ESM/CommonJS nature of the project. While the runtime works through dynamic imports, the TypeScript build process fails. This story will properly configure TypeScript to handle the mixed module system, ensuring clean compilation and better developer experience.

## Priority
**MEDIUM** - Improves developer experience but runtime already works

## Acceptance Criteria

### AC1: Fix Module Resolution Configuration
- Update tsconfig.json moduleResolution to handle mixed ESM/CommonJS
- Configure proper module interop settings
- Ensure TypeScript understands dynamic imports
- Fix any path resolution issues
- Document the final configuration approach

### AC2: Configure Build Process
- Update build scripts to properly compile TypeScript files
- Ensure .tsx files compile to appropriate .js output
- Configure source maps for debugging
- Handle module format transformation if needed
- Ensure build output works in CommonJS environment

### AC3: Resolve Compilation Errors
- Fix all TypeScript compilation errors
- Ensure `npm run build` completes successfully
- Verify compiled output runs correctly
- Document any workarounds needed
- Ensure no runtime behavior changes

### AC4: Update Development Workflow
- Configure `npm run build:watch` for TypeScript files
- Ensure hot reloading works if applicable
- Update any development documentation
- Test the full development workflow
- Document build process for other developers

## Tasks/Subtasks

- [ ] Analyze current build issues (AC1)
  - [ ] Run tsc and document all errors
  - [ ] Identify root causes of module resolution failures
  - [ ] Research ESM/CommonJS interop solutions
  - [ ] Design configuration approach

- [ ] Fix module resolution (AC1)
  - [ ] Update tsconfig.json moduleResolution setting
  - [ ] Configure proper esModuleInterop settings
  - [ ] Test dynamic import handling
  - [ ] Verify path aliases work correctly

- [ ] Configure build process (AC2)
  - [ ] Update build script configuration
  - [ ] Configure output format and locations
  - [ ] Set up source map generation
  - [ ] Test compiled output execution

- [ ] Resolve all compilation errors (AC3)
  - [ ] Fix each TypeScript error systematically
  - [ ] Test runtime behavior remains unchanged
  - [ ] Document any necessary workarounds
  - [ ] Ensure clean build output

- [ ] Update development workflow (AC4)
  - [ ] Configure watch mode for TypeScript
  - [ ] Test development experience
  - [ ] Update relevant documentation
  - [ ] Create build troubleshooting guide

## Dev Notes

### Current Issues
From US043 completion notes:
- TypeScript compilation has module resolution issues
- Runtime works via dynamic imports but build fails
- Mixed ESM (Ink v4) and CommonJS (Napoleon) environment

### Module System Context
- Napoleon uses CommonJS (require/module.exports)
- Ink v4 is ESM-only (import/export)
- Current solution uses dynamic imports in CommonJS wrapper
- TypeScript needs to understand both systems

### Potential Solutions
1. **Dual Package Approach**: Separate configs for CJS and ESM parts
2. **Build-time Transform**: Use tools like esbuild or rollup
3. **TypeScript 5.x Features**: Use newer module resolution options
4. **Hybrid Configuration**: Different settings for different file patterns

### Configuration Considerations
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "moduleResolution": "bundler", // or "node16"
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true
  }
}
```

### Build Output Structure
Consider organizing compiled output:
```
dist/
├── cli/          # CommonJS files
├── ui/
│   ├── blessed/  # CommonJS files
│   └── ink/      # May need special handling
└── utils/        # CommonJS files
```

## Testing
- Verify `npm run build` completes without errors
- Test that compiled output runs correctly
- Ensure both UI modes work from compiled code
- Verify source maps work for debugging

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-19 | 1.0 | Initial technical debt story creation | Quinn (QA) |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_TBD_

### Debug Log References
_TBD_

### Completion Notes
_TBD_

### Files List
_TBD_

## QA Results

_To be completed by QA Agent after implementation_