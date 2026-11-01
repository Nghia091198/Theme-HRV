---
name: haravan-theme
description: Use for Haravan theme architecture, Liquid/templates/snippets, asset loading, settings, commerce integration, or questions where Shopify assumptions may be unsafe. Do not use for generic frontend work unrelated to Haravan.
---

# Haravan Theme (Claude wrapper)

Canonical instructions live in `.agents/skills/haravan-theme/SKILL.md` (shared with Codex).
Read that file and follow it fully. Do not duplicate or diverge from it here.

Claude-specific notes:
- Asset load points to check first: `FOX Fashion/snippets/head_styles.liquid` (CSS per template)
  and `FOX Fashion/snippets/footer-scripts.liquid` (JS).
- Icons: follow `docs/icon-guide.md` (skill `haravan-icons`).
