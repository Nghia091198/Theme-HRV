# Agent / Skill / Documentation Routing

This file keeps root `AGENTS.md` short and makes context loading deliberate.

| Task | Auto/global workflow | Project skill(s) | Primary docs | Recommended subagent flow |
|---|---|---|---|---|
| New storefront section/layout | incremental (if multi-file), browser verify | frontend-ui-engineering | PATTERN-DISCOVERY, coding-standard, haravan-guidelines, relevant component/settings/image guide | code_mapper/pattern discovery → resolve design intent → frontend_implementer → ui_qc → haravan_reviewer |
| Visual/responsive bug | debugging, browser verify | frontend-ui-engineering + ui-qc | relevant component/CSS docs | code_mapper → frontend_implementer → ui_qc |
| Reusable Web Component | incremental, browser verify, review | frontend-component (+ frontend-ui-engineering if visual) | PATTERN-DISCOVERY when new UI pattern, coding-standard, component-library | code_mapper → resolve reuse/reference if needed → frontend_implementer → haravan_reviewer |
| Haravan Liquid/snippet/template | incremental if multi-file, review | haravan-theme | haravan-guidelines, coding-standard | code_mapper if cross-file → frontend_implementer → haravan_reviewer |
| Scroll section | debugging/browser as needed | frontend-ui-engineering | fox-scroll-viewport, component-library, coding-standard | code_mapper → frontend_implementer → ui_qc |
| Create/edit/audit settings | review; incremental if cross-file | haravan-theme-settings (+ haravan-theme for Liquid/runtime) | settings-guide, FOXTHEME_Setting_Libs_Full_v3, haravan-guidelines; image-guide for uploads | code_mapper if cross-file → frontend_implementer if delegated → haravan_reviewer when review is needed |
| Image/media | performance if performance goal, browser verify | frontend-ui-engineering + haravan-theme | image-guide + settings/component contract | frontend_implementer → ui_qc |
| Migration/TYT/legacy | incremental, debugging if failure, review | migration | migration-guide, architecture, coding-standard | code_mapper → frontend_implementer → migration_reviewer → haravan_reviewer |
| Performance audit | performance + browser testing | relevant project skill only if code change is needed | image/component/architecture docs as relevant | ui_qc or code_mapper → frontend_implementer if approved |
| Final code review | code-review-and-quality | haravan-theme/frontend-component as relevant | only focused docs | haravan_reviewer or migration_reviewer |

## Context rule

Start from the most focused current guide. Use `roadmap.md` and `original-core-plan.md` as historical intent, not automatic implementation context.

## Skill layering rule

Global skills answer **how to execute engineering work**. Project skills answer **how this Haravan repository must implement that work**. More than one may activate; that is expected.


## UI Pattern Discovery gate

For a new or materially changed UI pattern, routing is not allowed to jump directly from mapping to implementation.

```text
code_mapper
  ↓
pattern discovery
  ↓
reference map: structure / visual / behavior / motion
  ↓
intent resolved?
  ├─ yes → implement
  └─ no  → ask user with concrete project options → implement after choice
```

Search first, clarify second. Do not ask the user to decide things already determined by repository contracts.
