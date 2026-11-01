---
name: migration
description: Use for legacy-to-core refactors, components.js extraction, slider migration, jQuery reduction, TYT-to-FOX renaming, event/selector contract migration, or removal of old implementations. Do not use for isolated new features with no legacy surface.
---

# Migration (Claude wrapper)

Canonical instructions live in `.agents/skills/migration/SKILL.md` (shared with Codex).
Read that file and follow it fully, together with `docs/migration-guide.md`.
Do not duplicate or diverge from it here.

Claude-specific notes:
- Renames (files, views, classes, IDs, events): inventory callers first, change them in the
  same edit, then search again to confirm no old reference remains.
