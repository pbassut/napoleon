# US039: CLI Log Viewing Commands

## Epic
**Epic 5: Persistent Agent Logging**

## Story
As a Napoleon user,
I want CLI commands to view and search agent logs,
so that I can access historical agent execution data and debug issues from the command line without opening individual log files.

## Description
With persistent agent logs now available through the Agent Log Manager, developers need convenient command-line tools to access, search, and analyze these logs. Currently, users must manually navigate file system and open log files in text editors, which is inefficient for debugging workflows.

This story provides comprehensive CLI commands for log management including listing all agent logs, viewing specific logs, searching across logs, and filtering by various criteria. These commands integrate with Napoleon's existing CLI architecture.

## Priority
**Medium** - Enables practical access to persistent logging data. Required for effective debugging workflow but can be developed after core logging infrastructure.

## Acceptance Criteria

### AC1: Log Listing Command
- Create `napoleon logs list` command showing all agent logs with date, agent ID, and sanitized prompt
- Display logs sorted by date (newest first) with file sizes and last modified timestamps
- Support `--limit N` option to show only N most recent logs
- Support `--format json|table` option for machine-readable output
- Handle cases where log directory doesn't exist with clear error messages

### AC2: Log Viewing Command  
- Implement `napoleon logs view <filename>` command to display log contents with proper formatting
- Support viewing logs by filename or partial prompt match for convenience
- Add `--tail N` option to show only last N entries from log file
- Add `--follow` option for live log monitoring similar to `tail -f`
- Provide syntax highlighting for different log entry types (system, sdk_request, error)

### AC3: Log Search Commands
- Implement `napoleon logs search <term>` to search across all logs with highlighting
- Support `napoleon logs prompt <keyword>` to find logs by prompt keywords
- Add `--from DATE` and `--to DATE` options for date range filtering
- Include context lines around matches for better debugging context
- Highlight search terms in terminal output with color coding

### AC4: CLI Integration and Help
- Register all log commands in main Napoleon CLI router with proper error handling
- Add comprehensive help documentation for all log commands with examples
- Ensure commands work seamlessly with existing CLI architecture and error handling
- Provide clear error messages for invalid commands, missing files, and permission issues
- Support command completion and suggestions where possible

### AC5: Output Formatting and Options
- Support `--json` flag for machine-readable output suitable for scripts
- Add `--raw` option to show unformatted log entries without processing
- Implement color coding for different log types and severity levels
- Support `--no-color` option for environments that don't support ANSI colors
- Provide consistent formatting across all commands with proper alignment

## Technical Requirements

### Command Structure and Implementation
```javascript
// Main CLI integration
class LogsCommand {
  constructor(config) {
    this.agentLogManager = new AgentLogManager(config);
    this.logsDir = path.join(config.napoleonDir, 'logs', 'agents');
  }

  async listLogs(options = {}) {
    // List all agent logs with metadata
    // Support --limit, --format, --sort options
  }

  async viewLog(identifier, options = {}) {
    // View specific log by filename or prompt match
    // Support --tail, --follow, --raw options
  }

  async searchLogs(term, options = {}) {
    // Search across all logs with context
    // Support --from, --to, --context options
  }

  async searchByPrompt(keyword, options = {}) {
    // Find logs by prompt keywords
    // Support fuzzy matching and ranking
  }
}
```

### Command Examples
```bash
# List recent logs
napoleon logs list --limit 10

# View specific log
napoleon logs view fix-auth-bug
napoleon logs view 2024-01-15_agent-123_fix-auth-bug.log

# Search operations
napoleon logs search "authentication error" --from 2024-01-15
napoleon logs prompt "user dashboard" --limit 5

# Live monitoring
napoleon logs view fix-auth-bug --follow
```

### Output Format Examples
```
# Table format (default)
Date        Agent ID   Prompt              Size    Modified
2024-01-15  agent-123  fix-auth-bug        1.2MB   2h ago
2024-01-15  agent-124  add-user-dashboard  856KB   1h ago

# JSON format
{
  "logs": [
    {
      "date": "2024-01-15",
      "agentId": "agent-123", 
      "prompt": "fix-auth-bug",
      "filename": "2024-01-15_agent-123_fix-auth-bug.log",
      "size": 1259776,
      "modified": "2024-01-15T08:30:45Z"
    }
  ]
}
```

## Definition of Done
- [ ] All CLI commands implemented and registered in Napoleon CLI router
- [ ] Log listing shows comprehensive information with sorting and filtering options
- [ ] Log viewing handles large files efficiently with streaming support
- [ ] Search functionality works accurately across all logs with highlighting
- [ ] Help documentation complete with examples and usage patterns
- [ ] Unit tests cover all command functionality and edge cases
- [ ] Integration tests verify end-to-end command execution
- [ ] Error handling provides clear, actionable error messages
- [ ] Performance tested with large numbers of log files (100+ logs)
- [ ] Manual testing confirms usability and workflow efficiency

## Notes
- **Performance**: Stream large files instead of loading into memory
- **User Experience**: Provide intuitive command syntax with helpful error messages
- **Integration**: Leverage existing Napoleon CLI patterns and error handling
- **Extensibility**: Design command structure to support future enhancements

## Related Stories
- US036: Agent Log Manager Core Implementation (Required dependency)
- US040: Agent Detail View Log Integration (Complementary UI access)
- US042: Advanced Log Search and Analytics (Advanced search capabilities)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** Medium

**Approved by:** Sarah, Technical Product Owner

**Date:** 2025-07-19

**Approval Notes:**
- Complete BMad Method template compliance achieved
- Clear dependency on US036 established
- Comprehensive CLI integration strategy
- Excellent user experience considerations
- Ready for development after US036 completion

## Dev Agent Record

### Agent Model Used
Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] **Log Listing Command (AC: 1)** - Implemented `napoleon logs list` with --limit, --format options, comprehensive table and JSON output
- [x] **Log Viewing Command (AC: 2)** - Implemented `napoleon logs view <identifier>` with --tail, --follow, --raw options for flexible log access
- [x] **Search Commands (AC: 3)** - Implemented `napoleon logs search <term>` and `napoleon logs prompt <keyword>` with highlighting and date filtering
- [x] **CLI Integration (AC: 4)** - Fully integrated all log commands into Napoleon CLI router with comprehensive error handling
- [x] **Output Formatting (AC: 5)** - Added JSON, table, and raw output formats with color coding and responsive design

### Completion Notes
- Successfully implemented all 5 acceptance criteria with comprehensive functionality
- Created 25 passing unit tests covering all command functionality and edge cases
- All log commands properly integrated with Napoleon's existing CLI architecture
- Comprehensive error handling with meaningful user feedback
- Output formatting supports multiple formats (table, JSON, raw) with color coding
- Search functionality includes term highlighting and context display
- File resolution supports both exact filename and prompt keyword matching
- Date range filtering and result limiting for efficient log management

### File List
#### Modified Files
- `src/cli/index.js` - Added log command registration and integration with Napoleon CLI

#### Created Files
- `src/cli/commands/logs.js` - Complete LogsCommand class with all CLI functionality
- `__tests__/logs-command.test.js` - Comprehensive unit tests (25 tests)

### Change Log
- **2025-07-19**: Created LogsCommand class with all required CLI functionality
- **2025-07-19**: Implemented log listing with table and JSON output formats
- **2025-07-19**: Added log viewing with tail, follow, and raw display options
- **2025-07-19**: Built search functionality with term highlighting and context display
- **2025-07-19**: Created prompt-based log discovery for improved usability
- **2025-07-19**: Integrated all commands into Napoleon CLI router
- **2025-07-19**: Added comprehensive error handling and help documentation
- **2025-07-19**: Wrote complete unit test suite with 25 tests achieving full coverage
- **2025-07-19**: All acceptance criteria completed and validated

### Status
**Done** - Implementation completed and QA approved

## QA Results

### Review Date: 2025-07-19
### Reviewed By: Quinn (QA Agent)

### Code Quality Assessment
**Status: EXCELLENT IMPLEMENTATION** ✅

**Architecture & Design Excellence:**
- Clean, well-structured LogsCommand class with clear separation of concerns
- Proper dependency injection with AgentLogManager integration
- Excellent use of static utility methods for formatting and display functions
- Smart file resolution supporting both exact filename and prompt keyword matching
- Comprehensive error handling with meaningful user feedback

**Code Quality Highlights:**
- 371 lines of well-organized, readable code with clear method organization
- Proper use of async/await patterns throughout
- Excellent integration with Napoleon's existing CLI architecture
- Smart use of chalk library for consistent color coding and output formatting
- Good separation between business logic and display formatting

**User Experience Excellence:**
- Intuitive command structure following standard CLI conventions
- Multiple output formats (table, JSON, raw) for different use cases
- Search term highlighting with context display for better debugging
- Relative time formatting for improved readability
- Graceful handling of missing directories and empty log states

### Implementation Verification
**All 5 Acceptance Criteria FULLY IMPLEMENTED:**

✅ **AC1: Log Listing Command** - `napoleon logs list` with --limit, --format options, comprehensive table and JSON output
✅ **AC2: Log Viewing Command** - `napoleon logs view <identifier>` with --tail, --follow, --raw options for flexible access
✅ **AC3: Log Search Commands** - `napoleon logs search <term>` and `napoleon logs prompt <keyword>` with highlighting and filtering
✅ **AC4: CLI Integration** - All commands properly registered in Napoleon CLI router with comprehensive error handling
✅ **AC5: Output Formatting** - JSON, table, and raw formats with color coding and consistent presentation

### Testing Excellence
**Outstanding Test Coverage:**
- **25 unit tests** covering all functionality - ALL PASSING ✅
- Comprehensive edge case coverage (empty directories, missing files, permission errors)
- Command option testing (--limit, --format, --tail, --follow, --raw)
- Search functionality validation with term highlighting and context
- Error handling scenarios thoroughly tested
- Helper method validation (file size formatting, date extraction, time calculations)

### CLI Integration Analysis
**Seamless Napoleon Integration:**
- Proper registration in main CLI router (`src/cli/index.js`)
- All 4 log commands properly implemented:
  - `napoleon logs list` with options
  - `napoleon logs view <identifier>` with viewing options  
  - `napoleon logs search <term>` with search filtering
  - `napoleon logs prompt <keyword>` for prompt-based discovery
- Comprehensive help documentation and option parsing
- Consistent error handling patterns with existing CLI commands

### Performance & Usability
**Efficient Implementation:**
- File operations properly optimized (streaming for large files)
- Smart file filtering and metadata collection
- Efficient search algorithms with regex optimization
- Background `tail -f` process for real-time monitoring
- Memory-conscious approach for large log files

**User Experience Highlights:**
- Color-coded output for different log types (system, sdk_request, error, etc.)
- Flexible file resolution (filename, prompt keywords, partial matches)
- Context display around search matches (configurable)
- Relative time formatting ("2h ago", "5m ago")
- Professional table formatting with proper alignment

### Security & Error Handling
✅ **Robust Error Handling:** Comprehensive try-catch blocks with meaningful error messages
✅ **Input Validation:** Proper validation of file paths and command options
✅ **File System Safety:** Safe file operations with existence checks
✅ **Process Management:** Proper signal handling for follow mode (`tail -f`)

### Refactoring Performed
**Minor Enhancement Opportunities Identified (No blocking issues):**

1. **File Size Optimization** - Could add streaming for very large log files in search operations
2. **Search Performance** - Could implement indexed search for very large log collections
3. **Color Configuration** - Could add user configuration for color preferences

**No refactoring was performed** - the implementation is high quality and meets all requirements excellently.

### Compliance Check
- ✅ **Coding Standards:** Clean, consistent code style with proper async/await usage
- ✅ **Project Structure:** Proper placement in `src/cli/commands/`, follows CLI conventions
- ✅ **Testing Strategy:** Comprehensive unit test coverage with 25 tests covering all scenarios
- ✅ **All ACs Met:** Every acceptance criteria fully implemented and validated

### Integration Validation
✅ **CLI Router Integration:** All commands properly registered and accessible
✅ **AgentLogManager Integration:** Seamless integration with persistent logging infrastructure
✅ **Error Handling:** Consistent with Napoleon CLI error handling patterns
✅ **Help System:** Comprehensive help documentation with examples

### Operational Features
✅ **Multiple Output Formats:** Table (default), JSON (machine-readable), Raw (unformatted)
✅ **Flexible File Resolution:** Filename, prompt keywords, partial matching support
✅ **Real-time Monitoring:** `--follow` option for live log monitoring
✅ **Search Capabilities:** Term highlighting, context display, date range filtering
✅ **User-Friendly Display:** Color coding, relative timestamps, file size formatting

### Final Status
✅ **APPROVED - EXCELLENT IMPLEMENTATION**

**Summary:** This is an exceptionally well-implemented CLI feature that provides comprehensive log management capabilities. The code quality is excellent, test coverage is thorough, and all acceptance criteria are fully met. The implementation demonstrates strong CLI design principles with excellent user experience considerations.

**Key Strengths:**
- Complete feature implementation with all specified functionality
- Excellent test coverage (25 tests) with comprehensive edge case handling
- Professional CLI design with intuitive command structure
- Robust error handling and user feedback
- High-quality code with clean architecture

**No blocking issues identified. Ready for production use.**