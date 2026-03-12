---
phase: 05
slug: pipeline-assembly-and-manual-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | none (vitest auto-detects) |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

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
| 05-01-01 | 01 | 1 | CLI-01 | unit | `npm test -- --reporter=verbose tests/run-command.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-01 | 01 | 1 | CLI-04 | unit | `npm test -- --reporter=verbose tests/run-command.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | SKILL-01 | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | SKILL-02 | manual | Read SKILL.md, verify clarifying question guidance exists | — | ⬜ pending |
| 05-02-01 | 02 | 2 | SKILL-03 | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | SKILL-04 | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/run-command.test.ts` — stubs for CLI-01, CLI-04
- [ ] `tests/skill-new-article.test.ts` — stubs for SKILL-01, SKILL-03, SKILL-04

*Existing infrastructure (Vitest, 127 tests) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill asks clarifying questions when topic is unclear | SKILL-02 | Behavior lives in SKILL.md instruction document read by Claude at runtime — no TypeScript to test | Read `.claude/skills/new-article/SKILL.md`, verify clarifying question guidance section exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
