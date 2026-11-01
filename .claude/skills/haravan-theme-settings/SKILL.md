---
name: haravan-theme-settings
description: Create, edit, audit, and repair Haravan theme settings in config/settings.html and settings_data.json. Use when adding a theme setting, building a settings fieldset, translating merchant-facing settings, fixing grouped or inconsistent controls, reviewing setting keys/defaults, or validating Haravan settings UI.
---

# Haravan Theme Settings (Claude wrapper)

Canonical instructions live in `.codex/skills/haravan-theme-settings/SKILL.md`
(shared with Codex), with `docs/settings-guide.md` as the authority for keys and labels.
Read both and follow them fully. Do not duplicate or diverge from them here.

Claude-specific notes:
- Add default values inside the `"current"` object of `FOX Fashion/config/settings_data.json`
  and keep the file valid JSON.
- Never add a setting that asks the merchant to type an icon/sprite ID (see `docs/icon-guide.md`).
