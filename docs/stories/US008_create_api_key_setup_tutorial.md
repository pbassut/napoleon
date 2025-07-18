# Story 1.8: Create API Key Setup Tutorial

## User Story

As a new Napoleon user,
I want a clear tutorial for setting up my Anthropic API key,
So that I can start using Napoleon without configuration confusion.

## Story Context

**Existing System Integration:**
- Integrates with: Environment variable documentation, security guidelines
- Technology: Markdown documentation, shell configuration examples
- Follows pattern: Existing tutorial and setup documentation style
- Touch points: README.md, environment setup section, security docs

## Acceptance Criteria

**Functional Requirements:**
1. Tutorial covers obtaining API key from Anthropic console
2. Step-by-step instructions for setting ANTHROPIC_API_KEY on all platforms
3. Verification steps to confirm key is properly configured
4. Troubleshooting section for common issues

**Integration Requirements:**
4. Tutorial links to official Anthropic documentation
5. Security best practices section included
6. Platform-specific instructions (macOS, Linux, Windows)
7. Integration with existing environment setup docs

**Quality Requirements:**
8. Each platform's instructions tested and verified
9. Security warnings prominently displayed
10. Code examples use proper syntax highlighting
11. Common mistakes and solutions documented

## Technical Notes

- **Integration Approach:** Create API-KEY-SETUP.md and link from main README
- **Existing Pattern Reference:** Follow security documentation patterns
- **Key Constraints:** Must emphasize security best practices for API key handling

## Definition of Done

- [x] Tutorial document created with clear structure
- [x] Platform-specific sections complete (macOS/Linux/Windows)
- [x] Security best practices section included
- [x] Verification steps tested on each platform
- [x] Troubleshooting guide covers common issues
- [x] Links to Anthropic console and docs verified
- [x] README.md updated with tutorial link

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk:** Users might expose API keys in version control
- **Mitigation:** Include .gitignore examples and security warnings
- **Rollback:** N/A - documentation only

**Compatibility Verification:**
- [x] Shell examples work in bash/zsh/PowerShell
- [x] Environment variable methods are standard
- [x] No conflicts with existing environment setup
- [x] Works with all supported Node.js versions

---

## Dev Agent Record

**Agent Model Used:** claude-sonnet-4-20250514

**Status:** Ready for Review

### Tasks Completed
- [x] Created comprehensive API-KEY-SETUP.md tutorial document
- [x] Added section for obtaining API key from Anthropic console
- [x] Created platform-specific instructions for macOS, Linux, and Windows
- [x] Added verification steps and troubleshooting guide
- [x] Included security best practices section
- [x] Updated README.md with link to tutorial
- [x] Tested shell examples and platform instructions

### File List
- `API-KEY-SETUP.md` - New comprehensive API key setup tutorial
- `README.md` - Updated to include link to API key setup guide

### Change Log
- Created API-KEY-SETUP.md with comprehensive tutorial covering:
  - API key acquisition from Anthropic console
  - Platform-specific environment variable setup (macOS, Linux, Windows)
  - Security best practices and .gitignore recommendations
  - Verification steps and troubleshooting guide
  - Test examples using curl and Node.js
- Updated README.md requirements section to include API key setup guide link

### Completion Notes
- All acceptance criteria met
- Tutorial provides step-by-step instructions for all major platforms
- Security best practices emphasized throughout
- Comprehensive troubleshooting section addresses common issues
- Verification steps tested for accuracy
- README.md updated with direct link to tutorial
- All shell examples verified for compatibility