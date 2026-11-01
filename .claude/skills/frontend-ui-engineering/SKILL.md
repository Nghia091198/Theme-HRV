---
name: frontend-ui-engineering
description: Builds and modifies production-quality storefront UI in this Haravan theme architecture. Use automatically for new sections/pages/modals/drawers/cards, layout/CSS changes, responsive work, visual/UX fixes, accessible interactions, or user-facing UI composition. Before new/materially changed UI, search existing project patterns and resolve structure/visual/behavior/motion references instead of guessing. Follow Haravan assets+snippets+templates structure rather than React/src assumptions. Use frontend-component additionally only when reusable Web Component behavior or lifecycle is changed.
---

# Frontend UI Engineering (Claude wrapper)

Canonical instructions live in `.agents/skills/frontend-ui-engineering/SKILL.md`
(shared with Codex). Read that file and follow it fully, including the Pattern Discovery
gate and the completion checklist. Do not duplicate or diverge from it here.

Claude-specific notes:
- Mockup-only requests (images/JPG) do not touch theme files.
- Buttons/controls reuse `button-effect` + `span[data-btn-effect-span]`.
- Icons: follow `docs/icon-guide.md` (skill `haravan-icons`).
