#!/bin/bash

# Create remaining story issues efficiently

echo "Creating Phase 1 stories..."
gh issue create --title "US002: Node.js 18 Upgrade and SDK Setup" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 1 | **Dependencies:** US001" --label "story,high-priority,phase-1"
gh issue create --title "US003: SDK Communication Manager Implementation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 1 | **Dependencies:** US002" --label "story,high-priority,phase-1"
gh issue create --title "US004: Message Transformer Implementation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 1 | **Dependencies:** US002" --label "story,high-priority,phase-1"
gh issue create --title "US005: AgentManager SDK Integration" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 1 | **Dependencies:** US002-US004" --label "story,high-priority,phase-1"
gh issue create --title "US006: End-to-End Testing and Validation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 1 | **Dependencies:** US001-US005" --label "story,high-priority,phase-1"

echo "Creating Phase 2 stories..."
gh issue create --title "US011: Project Setup and CLI Framework" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 2" --label "story,high-priority,phase-2"
gh issue create --title "US012: Basic Terminal UI Foundation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 2" --label "story,high-priority,phase-2"
gh issue create --title "US014: Basic Agent Status Display" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 2" --label "story,high-priority,phase-2"
gh issue create --title "US015: Basic Agent Termination" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 2" --label "story,high-priority,phase-2"
gh issue create --title "US016: Git Worktree Creation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 2" --label "story,high-priority,phase-2"

echo "Creating Phase 3 stories..."
gh issue create --title "US025: Git Working Tree Status Warning" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 3" --label "story,high-priority,phase-3"
gh issue create --title "US026: Anthropic API Key Validation" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 3" --label "story,high-priority,phase-3"
gh issue create --title "US027: Terminal Focus Recovery After Agent Spawning" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 3" --label "story,high-priority,phase-3"
gh issue create --title "US028: Spawn Dialog UX Improvements" --body "**Priority:** HIGH | **Status:** ✅ Approved | **Phase:** Phase 3" --label "story,high-priority,phase-3"

echo "Creating completed stories..."
gh issue create --title "US007: Create Migration Guide" --body "**Priority:** MEDIUM | **Status:** ✅ Done | **Phase:** Phase 1" --label "story,medium-priority,phase-1,completed"
gh issue create --title "US008: Create API Key Setup Tutorial" --body "**Priority:** MEDIUM | **Status:** ✅ Done | **Phase:** Phase 1" --label "story,medium-priority,phase-1,completed"

echo "Story issues created successfully!"