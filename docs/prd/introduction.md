# Introduction

This document outlines the architectural approach for enhancing Napoleon with the Napoleon rebrand and Claude Code SDK integration. Its primary goal is to serve as the guiding architectural blueprint for the migration from CLI-based process management to SDK-based agent orchestration while ensuring seamless integration with the existing terminal UI system.

**Relationship to Existing Architecture:**
This document supplements the existing Napoleon architecture by defining how the SDK integration will replace the current CLI process spawning mechanism. Where the existing system uses child process management, this document provides guidance on maintaining all current functionality while implementing a cleaner, more reliable SDK-based approach.