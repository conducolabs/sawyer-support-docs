---
phase: 4
slug: translation-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
| **Quick run command** | `npm test` |
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
| 04-01-01 | 01 | 1 | TRANS-01, TRANS-02 | unit | `npm test -- tests/translator-client.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | TRANS-03 | unit | `npm test -- tests/translator-hash.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CLI-05 | unit | `npm test -- tests/translator-errors.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | TRANS-01, TRANS-04 | manual | N/A — requires live DeepL API key + German articles | — | ⬜ pending |
| 04-02-02 | 02 | 2 | TRANS-03 | manual | N/A — requires manually edited translated file | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/translator-client.test.ts` — stubs for TRANS-01, TRANS-02 (DeepL translation, per-language directories)
- [ ] `tests/translator-hash.test.ts` — stubs for TRANS-03 (content hash gating, manual edit detection)
- [ ] `tests/translator-errors.test.ts` — stubs for CLI-05 (error messages, retry behavior)

*Vitest already installed and configured from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DeepL translates German article to all configured languages | TRANS-01 | Requires live DeepL API key | Run `sawyer-docs translate --features login`, verify `docs/en/`, `docs/nl/`, `docs/tr/`, `docs/uk/` output |
| Translated files land locally without git commit | TRANS-04 | Requires filesystem + git status check | Run translate, verify `git status` shows untracked files |
| Hash gating skips manually edited translations | TRANS-03 | Requires manually edited file + re-run | Edit a translated file, re-run translate, verify file unchanged |
| Actionable error on invalid API key | CLI-05 | Requires DeepL API call with bad key | Set invalid DEEPL_API_KEY, run translate, verify error message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
