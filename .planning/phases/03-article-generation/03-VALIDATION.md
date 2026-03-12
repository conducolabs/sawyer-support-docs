---
phase: 3
slug: article-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 3 — Validation Strategy

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
| 03-01-01 | 01 | 1 | GEN-01, GEN-07 | unit | `npm test -- tests/generator-writer.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | GEN-02, GEN-03, GEN-04, GEN-05 | unit | `npm test -- tests/generator-prompts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | GEN-06 | unit | `npm test -- tests/generator-prompts.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | GEN-08 | unit | `npm test -- tests/generator-prompts.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | GEN-01 | manual | N/A — requires live Claude CLI + feature map | — | ⬜ pending |
| 03-02-02 | 02 | 2 | GEN-06 | manual | N/A — requires Claude inference | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/generator-prompts.test.ts` — stubs for GEN-02 through GEN-08 (prompt shape, audience differentiation, enrollment callout)
- [ ] `tests/generator-writer.test.ts` — stubs for GEN-01 (file writing) and GEN-07 (frontmatter)

*Vitest already installed and configured from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude generates German articles from feature map | GEN-01 | Requires live Claude CLI + real feature map | Run `sawyer-docs generate --features login`, verify `docs/de/` output |
| Articles use "Du" register and correct audience tone | GEN-06 | Requires Claude inference | Inspect generated articles for correct tone (Du form, audience vocabulary) |
| Enrollment features include callout | GEN-08 | Requires Claude judgment on enrollment detection | Generate article for an enrollment-adjacent feature, verify callout present |
| Deterministic output at temperature 0 | Success Criteria 3 | Requires two identical runs | Run generate twice on same feature, diff output — must be identical |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
