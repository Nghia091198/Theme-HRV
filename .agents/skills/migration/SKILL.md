---
name: migration
description: Use for legacy-to-core refactors, components.js extraction, slider migration, jQuery reduction, TYT-to-FOX renaming, event/selector contract migration, or removal of old implementations. Do not use for isolated new features with no legacy surface.
---

# Migration Skill

Read `docs/migration-guide.md` first, then only the architecture/component docs needed for the target module.

## Required sequence
1. Inventory callers and references.
2. Define the target contract.
3. Define compatibility/rollback needs.
4. Migrate one vertical slice.
5. Verify new and legacy callers that remain.
6. Search again before deleting the legacy path.
7. Update documentation if the public component contract changes.

## Guardrails
- No big-bang rewrite.
- No half-renames across selector/data/event/setting/caller surfaces.
- Do not remove legacy code while references remain.
- Do not create new legacy usage during migration.
- Do not change visual output when the task is architecture-only unless required for correctness.
