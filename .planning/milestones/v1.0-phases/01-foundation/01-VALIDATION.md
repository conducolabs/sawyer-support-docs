---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| — | 01 | 1 | CLI-02 | unit | `npx vitest run tests/config.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | CLI-03 | unit | `npx vitest run tests/config.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | CLI-06 | unit | `npx vitest run tests/config.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | CLI-07 | smoke | `npx vitest run tests/setup.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | CLI-08 | smoke | `npx vitest run tests/setup.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | FILE-01 | unit | `npx vitest run tests/paths.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | FILE-02 | unit | `npx vitest run tests/paths.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | FILE-03 | unit | `npx vitest run tests/paths.test.ts` | ❌ W0 | ⬜ pending |
| — | 01 | 1 | DOC-01 | smoke | `npx vitest run tests/setup.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test framework configuration
- [ ] `tests/config.test.ts` — stubs for CLI-02, CLI-03, CLI-06
- [ ] `tests/setup.test.ts` — stubs for CLI-07, CLI-08, DOC-01
- [ ] `tests/paths.test.ts` — stubs for FILE-01, FILE-02, FILE-03

*Vitest + test stubs must be created before any implementation tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README contains setup instructions | DOC-02 | Content quality check | Read README.md, verify API key setup section exists |
| README documents CLI commands | DOC-03 | Content quality check | Read README.md, verify generate/translate/scan commands documented |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
