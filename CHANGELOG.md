# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-15

### Added

- Initial release of ZenithJoy Core
- Claude Code Hooks for branch protection and project detection
- Claude Code Skills: `/init-project`, `/new-task`, `/finish`, `/dev`
- CI workflow template with DoD-based testing
- Notion integration for session summaries
- Project structure with hooks, skills, templates, and scripts directories

### Features

- Serial workflow: one task at a time
- Checkpoint branching: `cp-*` branches for isolated development
- CI-driven acceptance: green CI = done
- PR-based code review flow

[0.1.0]: https://github.com/user/zenithjoy-core/releases/tag/v0.1.0
