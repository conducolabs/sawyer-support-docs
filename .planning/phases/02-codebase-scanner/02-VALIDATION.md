---
phase: 2
slug: codebase-scanner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SCAN-05 | unit | `npm test -- tests/scanner.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SCAN-06 | unit | `npm test -- tests/scanner.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | SCAN-07 | unit | `npm test -- tests/change-detection.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | SCAN-07 | unit | `npm test -- tests/scan-state.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | SCAN-01 | manual | N/A — requires live Claude CLI + real repos | — | ⬜ pending |
| 02-02-02 | 02 | 2 | SCAN-02 | manual | N/A — requires live Claude CLI + real repos | — | ⬜ pending |
| 02-02-03 | 02 | 2 | SCAN-03 | manual | N/A — requires live Claude CLI + real repos | — | ⬜ pending |
| 02-02-04 | 02 | 2 | SCAN-04 | manual | N/A — requires Claude inference | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/scanner.test.ts` — stubs for SCAN-05 (feature map schema validation), SCAN-06 (slug idempotency)
- [ ] `tests/change-detection.test.ts` — stubs for SCAN-07 (git diff logic, SHA comparison, empty array on no changes)
- [ ] `tests/scan-state.test.ts` — stubs for SCAN-07 (state read/write, first-run handling, `.sawyer-docs/` creation)

*Vitest already installed and configured from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code analyzes mobile app codebase | SCAN-01 | Requires live `claude` CLI and real mobile repo clone | Run `sawyer-docs scan --mobile ./path/to/mobile-repo`, verify feature map contains mobile features |
| Claude Code analyzes dashboard codebase | SCAN-02 | Requires live `claude` CLI and real dashboard repo clone | Run `sawyer-docs scan --dashboard ./path/to/dashboard-repo`, verify feature map contains dashboard features with admin roles |
| Claude Code extracts API context | SCAN-03 | Requires live `claude` CLI and real platform repo clone | Run `sawyer-docs scan --platform ./path/to/platform-repo`, verify API context extracted without article entries |
| Classification filters infrastructure | SCAN-04 | Requires Claude inference to classify | Verify feature map excludes nav wrappers, loading screens, auth guards, dev screens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
