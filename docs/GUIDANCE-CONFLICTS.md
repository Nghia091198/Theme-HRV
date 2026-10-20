# Guidance conflicts to resolve

The uploaded documentation is strong but contains a few rules that compete with each other. These should be resolved in source docs so agents do not have to guess.

## 1. Setting-key prefix conflict

Current documents disagree:
- `architecture.md`, `coding-standard.md`, and the current `AGENTS.md` broadly describe project-specific settings/keys with `fox`/`fox_` naming.
- `settings-guide.md` explicitly says setting keys must **not** use the `fox_` prefix and gives examples such as `countdown_show`.

Recommended decision for this repo:
- Treat `settings-guide.md` as authoritative for merchant setting keys because it is the focused settings document.
- Use feature names without `commerce-`, `fox-`, or `theme-` prefixes for theme-owned files. Keep `fox-*`/`data-fox-*`/`FOX*` for classes, data attributes, IDs, and public theme functions; setting keys follow `settings-guide.md`.
- Update the conflicting broad statements in architecture/coding-standard/current AGENTS to say: “setting naming follows `docs/settings-guide.md`.”

## 2. Historical vs current naming examples

`original-core-plan.md` contains older example prefixes such as `section-*`, `component-*`, and older conceptual folder structures. Newer focused docs use `core-*` for reusable modules, unprefixed feature names for theme-owned files, and Haravan-flat deploy conventions more precisely.

Recommended decision:
- Keep `original-core-plan.md` as design history.
- Add a banner near its top: “Historical planning document; current implementation rules in architecture/coding-standard/haravan-guidelines take precedence.”

## 3. Component-library size

`component-library.md` is now a large living contract containing both primitive contracts and many FOX feature-specific contracts.

Recommended next split when it becomes hard to navigate:
- `docs/components/core-ui.md`
- `docs/components/commerce.md`
- `docs/components/fox-sections.md`
- `docs/components/shared-effects.md`

Do not split only for aesthetics; split when search/navigation or conflicting edits become a real maintenance cost.
