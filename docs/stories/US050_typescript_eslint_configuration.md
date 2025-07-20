# US050: TypeScript ESLint Configuration

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to configure ESLint to properly parse TypeScript and React files,
So that code quality is maintained across the new Ink UI codebase.

## Description
Following the Ink environment setup (US043), ESLint needs to be configured to handle TypeScript (.ts, .tsx) files. Currently, ESLint throws parsing errors on TypeScript files because it lacks the proper parser and plugins. This story will add the necessary ESLint dependencies and configuration to ensure consistent code quality standards across both JavaScript and TypeScript files.

## Priority
**MEDIUM** - Important for maintaining code quality but not blocking development

## Acceptance Criteria

### AC1: Install ESLint TypeScript Dependencies
- Add `@typescript-eslint/parser` as a dev dependency
- Add `@typescript-eslint/eslint-plugin` as a dev dependency
- Add `eslint-plugin-react` for React/JSX linting
- Add `eslint-plugin-react-hooks` for React hooks best practices
- Ensure versions are compatible with existing ESLint setup

### AC2: Configure ESLint for TypeScript
- Update `.eslintrc.js` to use TypeScript parser for .ts/.tsx files
- Configure TypeScript-specific rules
- Set up React/JSX specific rules
- Ensure existing JavaScript files still lint correctly
- Configure path resolution to match tsconfig.json paths

### AC3: Fix Existing TypeScript Linting Issues
- Run ESLint on all TypeScript files in src/ui/ink/
- Fix any legitimate linting errors found
- Document any rules that need to be disabled with justification
- Ensure `npm run lint` passes without errors

### AC4: Update NPM Scripts
- Ensure `npm run lint` includes TypeScript files
- Ensure `npm run lint:fix` works on TypeScript files
- Add TypeScript files to any other relevant scripts
- Verify scripts work correctly in CI/CD environment

## Tasks/Subtasks

- [ ] Install TypeScript ESLint dependencies (AC1)
  - [ ] Add @typescript-eslint/parser to package.json
  - [ ] Add @typescript-eslint/eslint-plugin to package.json
  - [ ] Add eslint-plugin-react and eslint-plugin-react-hooks
  - [ ] Run npm install and verify no conflicts

- [ ] Configure ESLint for TypeScript (AC2)
  - [ ] Update .eslintrc.js with TypeScript parser configuration
  - [ ] Add TypeScript-specific rules and extends
  - [ ] Configure React/JSX rules
  - [ ] Test configuration on both JS and TS files
  - [ ] Ensure path aliases are recognized

- [ ] Fix linting issues (AC3)
  - [ ] Run ESLint on src/ui/ink/ directory
  - [ ] Fix any legitimate errors
  - [ ] Document any disabled rules with comments
  - [ ] Verify all files pass linting

- [ ] Update scripts and verify (AC4)
  - [ ] Update lint script in package.json if needed
  - [ ] Test npm run lint includes all files
  - [ ] Test npm run lint:fix works correctly
  - [ ] Document any script changes

## Dev Notes

### Current ESLint Setup
The project currently uses:
- ESLint v8.57.0
- eslint-config-airbnb-base
- eslint-plugin-import

### TypeScript Parser Configuration
The TypeScript parser needs to be configured to:
- Use the project's tsconfig.json
- Handle JSX syntax
- Recognize TypeScript types

### Recommended Configuration Structure
```javascript
// .eslintrc.js
module.exports = {
  // ... existing config
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true
        }
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      ],
      rules: {
        // TypeScript-specific rule overrides
      }
    }
  ]
};
```

### Common Issues to Address
- Unused variable warnings for TypeScript types
- Import resolution for path aliases
- React import requirements
- Prop types vs TypeScript interfaces

## Testing
- Manual verification that linting works correctly
- Ensure both JS and TS files are linted properly
- Verify auto-fix functionality works
- Check that CI/CD linting passes

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