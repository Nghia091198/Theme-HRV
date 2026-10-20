---
name: frontend-component
description: Builds or changes reusable Web Components and shared frontend behavior in this Haravan theme. Use when the task changes slider/tabs/drawer/modal/media/custom-element lifecycle, state/events/public API, reusable component CSS, or shared behavior. Do not require this skill merely because a new page/section reuses an existing modal/drawer/slider contract unchanged; that is frontend-ui-engineering territory. Both may activate when a UI feature actually changes a reusable component.
---

# Frontend Component Skill

## Source of truth

Read `docs/coding-standard.md` plus the relevant component contract in `docs/component-library.md`. Use `docs/architecture.md` when ownership/layering is unclear.

## Related workflow skills

- Multi-file component change → `incremental-implementation`.
- Existing failure or runtime bug → `debugging-and-error-recovery`.
- Browser-facing verification → `browser-testing-with-devtools`.
- Final independent review → `code-review-and-quality` + project `haravan-reviewer` agent when risk warrants it.

## Implementation rules

- Confirm ownership: foundation, reusable UI component, commerce component, or FOX-specific behavior.
- If the user is adding a new UI surface that only consumes an existing component contract, defer pattern/visual decisions to `frontend-ui-engineering` and do not modify the shared component without evidence.
- Reuse an existing contract before creating a new custom element.
- Liquid renders primary content/markup; component JavaScript enhances behavior.
- Keep DOM queries/event binding/dependency initialization out of constructors.
- Make connect/init/refresh/destroy idempotent.
- Clean listeners, observers, timers, animation frames, pending requests, and third-party instances.
- Guard dependencies and `customElements.define`.
- Reflect externally useful state with data attributes.
- Use stable namespaced `domain:action` events with small payloads.
- Keep behavior hooks separate from styling hooks.
- Preserve meaningful fallback when JavaScript is disabled or dependency initialization fails where the contract requires progressive enhancement.

## CSS

- Core component CSS owns structure/state, not FOX brand skin.
- Prefer project custom properties/tokens.
- Keep selectors scoped.
- Preserve focus-visible and reduced-motion behavior.

## Verification

Exercise changed contract states, not only happy path:

- empty/single/multiple when applicable;
- reconnect/dynamic DOM;
- dependency failure;
- mouse/touch/keyboard/focus;
- relevant mobile/tablet/desktop widths;
- no duplicate registration/listeners/instances.
