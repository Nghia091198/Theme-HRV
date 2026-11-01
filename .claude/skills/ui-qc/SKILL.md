---
name: ui-qc
description: Reviews rendered Haravan storefront UI after layout/interaction changes. Use automatically after UI changes when visual/responsive/accessibility/runtime verification is required. Checks desktop/tablet/mobile, overflow, interaction, accessibility, console/network, and visual regression. Do not use as a substitute for implementation.
---

# UI QC (Claude wrapper)

Canonical instructions live in `.agents/skills/ui-qc/SKILL.md` (shared with Codex).
Read that file and follow it fully. Do not duplicate or diverge from it here.

Claude-specific notes:
- If browser tooling (e.g. Claude in Chrome) is not connected, state exactly what could not be
  verified instead of inferring visual correctness from source.
