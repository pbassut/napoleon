# Coding Standards and Conventions

## Existing Standards Compliance

**Code Style:** 
- ESLint with airbnb-base configuration
- 2-space indentation
- Semicolons required
- Single quotes for strings

**Linting Rules:** 
- Existing `.eslintrc` configuration
- Run via `npm run lint`
- Pre-commit linting recommended

**Testing Patterns:**
- Jest framework
- Test files adjacent to source with `.test.js` suffix
- Mock external dependencies
- Focus on unit tests with some integration tests

**Documentation Style:**
- JSDoc comments for public methods
- Inline comments for complex logic
- README for user-facing documentation
- Detailed error messages with suggestions

## Critical Integration Rules - Napoleon Rebrand

- **Global Rename Required:** All references to "napoleon" → "napoleon" throughout codebase
- **Package Name:** Update package.json name field to "napoleon"
- **CLI Command:** Change from `napoleon` to `napoleon`
- **Directory Names:** `.napoleon/` → `.napoleon/` for config and session storage
- **Environment Variables:** Any ADD_MANAGER_* vars → NAPOLEON_*
- **Error Messages:** Update all user-facing text to reference Napoleon
- **Documentation:** Complete find/replace in all docs and comments

## Critical Integration Rules

- **Existing API Compatibility:** All public AgentManager methods maintain exact signatures
- **Database Integration:** Session JSON structure remains readable, new fields are additive
- **Error Handling:** SDK errors wrapped in existing EnvironmentValidationError or FileSystemError classes
- **Logging Consistency:** Use winston logger with same log levels and formatting