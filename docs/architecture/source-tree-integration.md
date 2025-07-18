# Source Tree Integration

## Existing Project Structure

```plaintext
terragon/
├── bin/
│   └── add-manager.js           # CLI entry point
├── src/
│   ├── cli/                     # Command-line interface
│   ├── core/                    # Business logic
│   │   ├── agent-manager.js     # Main modification target
│   │   └── config.js
│   ├── ui/                      # Terminal UI (blessed)
│   └── utils/                   # Shared utilities
├── __tests__/
├── .bmad-core/                  # Agent system files
└── package.json
```

## New File Organization

```plaintext
terragon/
├── bin/
│   └── napoleon.js              # Renamed CLI entry point
├── src/
│   ├── core/
│   │   ├── agent-manager.js     # Modified: SDK integration
│   │   ├── sdk/                 # New SDK-specific code
│   │   │   ├── communication-manager.js
│   │   │   ├── message-transformer.js
│   │   │   └── sdk-types.js    # SDK type definitions
│   │   └── config.js
│   └── utils/
│       └── sdk-helpers.js       # New: SDK utility functions
├── __tests__/
│   └── core/
│       └── sdk/                 # New: SDK component tests
│           ├── communication-manager.test.js
│           └── message-transformer.test.js
└── docs/
    └── architecture.md          # This document
```

## Integration Guidelines

- **File Naming:** Follow existing kebab-case convention (e.g., `communication-manager.js`)
- **Folder Organization:** Group SDK-related code in `core/sdk/` subdirectory for clear separation
- **Import/Export Patterns:** Use existing CommonJS pattern (`module.exports`) for consistency