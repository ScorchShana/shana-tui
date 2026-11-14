# Standalone shana-tui Implementation Plan

**Goal:** Convert the imported pi-tui snapshot into an independent shana-tui library.
**Architecture:** Keep source layout and native prebuilds; replace monorepo configuration with local TypeScript and npm configuration.
**Tech Stack:** Node.js 24, TypeScript, Node test runner.
**Spec:** User-approved standalone project plan in this conversation.

## Constraints
Preserve MIT copyright and native binaries. No upstream synchronization, native compilation, publishing, or automatic commits.

## Tasks
- [ ] Add local TypeScript config, compiler/types, clean/check/build scripts, ignore rules and lockfile.
- [x] Rename package, native package resolver and symbol namespace; update existing resolver test before implementation.
- [x] Update README/native documentation and record upstream baseline.
- [ ] Verify check, build, full tests, tarball contents, and import/native loading from an installed tarball.

## Review focus
Check native file inclusion, renamed package resolution, source-free imports, test type checking, and preservation of upstream licensing.

## Execution record
- Local configuration and declarations are complete; dependency installation and lockfile generation remain blocked.
- Dependency installation attempted using configured mirror and official registry with a temporary cache; both returned EACCES fetching @types/node.
- Native resolver regression: failed before implementation, passed after rename (2/2).
- Windows native prebuild loaded successfully; getText/getImage functions present. No clipboard operations performed.
- Type check/build blocked by missing tsc. Full suite attempted and failed due to missing dependencies (get-east-asian-width).
- Pack dry run with lifecycle scripts disabled: 22 files; license, provenance and native binaries included. This does not verify a built package: dist is absent until build succeeds.
- No native compilation, upstream sync, publish, or commit performed.
- Remaining: npm install, check, build, test, real pack and installed-consumer smoke test.
