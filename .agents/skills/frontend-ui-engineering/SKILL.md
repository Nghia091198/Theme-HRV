---
name: frontend-ui-engineering
description: Builds and modifies production-quality storefront UI in this Haravan theme architecture. Use automatically for new sections/pages/modals/drawers/cards, layout/CSS changes, responsive work, visual/UX fixes, accessible interactions, or user-facing UI composition. Before new/materially changed UI, search existing project patterns and resolve structure/visual/behavior/motion references instead of guessing. Follow Haravan assets+snippets+templates structure rather than React/src assumptions. Use frontend-component additionally only when reusable Web Component behavior or lifecycle is changed.
---

# Frontend UI Engineering — Haravan Theme Edition

This is a project-adapted rewrite of the core ideas from `addyosmani/agent-skills/frontend-ui-engineering`.

It intentionally removes React/Tailwind/state-library assumptions and maps the same production UI principles onto this repository's Haravan/Liquid/Web Component architecture.

## Source of truth

Load only what the task needs:

- `docs/coding-standard.md` for naming, Liquid/HTML/CSS/JS conventions;
- `docs/haravan-guidelines.md` for Haravan structure and dialect;
- `docs/component-library.md` for existing UI/component contracts;
- `docs/architecture.md` when layer/ownership is unclear;
- `docs/settings-guide.md` for merchant settings;
- `docs/image-guide.md` for image/media creation or replacement;
- `docs/fox-scroll-viewport.md` for scroll-driven sections.

If a focused guide conflicts with a broad historical plan, prefer the focused current guide and consult `docs/GUIDANCE-CONFLICTS.md`.

## Architecture model

Do not introduce a React-style `src/components/...` layout for deploy code.

The real Haravan deploy surface is:

```text
FOX Fashion/
├── assets/
├── config/
├── layout/
├── locales/
├── snippets/
└── templates/
```

Use the actual theme folder name in the repository; do not rename it just to match examples.

Haravan has no project `sections/` deployment contract here. Large storefront modules are composed with snippets and templates.

### Responsibility mapping

```text
Haravan settings / page objects
        ↓
Liquid snippet/template renders complete semantic markup
        ↓
Existing markup/component contract
        ↓
Web Component or FOX JS enhances behavior when needed
        ↓
CSS owns responsive layout and theme skin
```

Use `frontend-component` when the task changes reusable component lifecycle/state/events/public API. This skill owns page/section UI quality and composition; `frontend-component` owns reusable behavior contracts.

## Before implementation

1. Inspect the rendered/caller path, not just the file mentioned by the user.
2. Identify existing snippets/assets/components that already solve part of the task.
3. Run the **Pattern Discovery + Design Intent Resolution gate** below for every new or materially changed storefront UI pattern.
4. Determine whether the change is:
   - theme composition/skin;
   - reusable UI component behavior;
   - commerce behavior;
   - settings/media;
   - legacy migration.
5. Preserve current public contracts unless the task explicitly changes them.
6. For multi-file work, use `incremental-implementation`.
7. For an existing bug/error, use `debugging-and-error-recovery` before speculative edits.

## Pattern Discovery + Design Intent Resolution

This is a hard pre-implementation gate for UI work. Do not jump directly from the user request to new markup/CSS/JS.

### Step 1 — Search the project first

Before asking the user design questions, inspect the repository for the nearest existing production patterns. Search relevant:

- snippets/templates and their callers;
- component contracts in `docs/component-library.md`;
- existing CSS/JS assets;
- shared buttons, links, typography, containers and media helpers;
- modal/drawer/tabs/slider/accordion patterns;
- existing animation/scroll presets;
- settings groups and image conventions;
- rendered examples when browser tooling is available.

Do not ask the user for information the repository already answers.

### Step 2 — Build a pattern map

For each new or materially changed UI surface, classify the nearest existing references across four dimensions:

```text
STRUCTURE
VISUAL
BEHAVIOR
MOTION
```

Also note responsive behavior when it materially differs.

Example for a requested modal:

```text
Structure  -> closest existing modal surface / width / layout
Visual     -> radius, spacing, typography, shadow, button treatment
Behavior   -> shared modal-component, close rules, focus, stacking
Motion     -> existing open/close transition or another approved motion pattern
Responsive -> centered dialog vs mobile fullscreen/edge-to-edge behavior
```

### Step 3 — Reuse behavior before inventing behavior

If an existing core/shared component already owns the required behavior, reuse it.

For example, a new modal should normally reuse the existing `modal-component` lifecycle/focus/backdrop/close contract instead of creating a new modal engine. The unresolved question is usually visual/structure/motion, not whether to duplicate modal behavior.

Do not create a parallel component solely because the requested design looks different. Prefer theme wrapper/modifier/custom properties/CSS skin when the shared behavior contract already fits.

### Step 4 — Resolve design ambiguity

Proceed without asking when design intent is sufficiently explicit, for example:

- the user names an existing reference (`giống quick view hiện tại`);
- a mockup makes structure/visual/motion clear;
- exactly one existing project pattern is an obvious match;
- the task explicitly says to keep current behavior/style and only change a narrow detail.

If multiple reasonable project patterns exist and the user did not choose one, **do not guess**. Present the closest concrete options and ask only for the unresolved choice.

Good clarification:

```text
Project đã có shared modal-component nên tôi sẽ reuse behavior hiện tại.
Về giao diện có 2 reference gần nhất:
1. Quick View: dialog content chuẩn, width vừa.
2. Product Story: media modal lớn.
Bạn muốn modal mới bám visual/size của option nào? Animation giữ motion mặc định hay theo Product Story?
```

Bad clarification:

```text
Bạn muốn modal như thế nào? Màu gì? Width bao nhiêu? Animation gì?
```

The bad version ignores project evidence and pushes repository decisions back to the user.

### Step 5 — Record the chosen reference before implementation

Before editing, the implementation plan should state the resolved reference map, for example:

```text
Reference map
- Structure: Quick View modal
- Visual: Quick View spacing/radius
- Behavior: shared modal-component unchanged
- Motion: shared modal default
- Responsive: existing modal breakpoint behavior
```

If one dimension is intentionally new, state it explicitly.

### UI task decision rule

```text
User request
   ↓
Inspect existing project
   ↓
Find nearest patterns
   ↓
Compare structure / visual / behavior / motion
   ↓
Is intent fully resolved?
   ├─ yes → plan and implement
   └─ no  → ask user with concrete existing options
```

Read `docs/PATTERN-DISCOVERY.md` when the task creates a new section, modal, drawer, card family, interactive UI, or substantially changes a visual pattern.

## File placement

### Liquid/UI composition

Place reusable/rendered storefront markup in the existing `snippets/` convention.

Keep Liquid and HTML source readable and structurally formatted. Do not minify
Liquid/HTML into one-line snippets; line breaks and indentation are part of the
maintainable source contract and do not affect Haravan deployment.

Page ordering/composition belongs in the relevant `templates/` or existing layout caller.

Do not create large UI HTML strings in JavaScript when Liquid can render the content.

### JavaScript

Use the existing asset naming/ownership convention:

```text
core-foundation-*.js     shared foundation
core-component-*.js      reusable brand-agnostic UI component
core-commerce-*.js       reusable commerce behavior
{feature}.js             FOX-specific feature behavior and theme/page orchestration
```

Do not add new behavior to a legacy monolith when it can live in the correct owned asset.

### CSS

Use project conventions and shared tokens/classes before inventing new values.

```text
core-*.css    structural reusable behavior/state
{feature}.css FOX-specific feature/skin and broader theme/page styling
```

Do not create a new per-section max-width wrapper when the project container convention already applies.

## UI composition principles

### Reuse before invention

Before creating a new pattern, check:

- shared `.container` / `.container-fluid`;
- shared section typography classes;
- existing buttons/link effects;
- slider/tabs/modal/drawer/accordion contracts;
- existing responsive image helper;
- existing scroll viewport presets;
- existing product/card snippets.

Avoid parallel components that differ only cosmetically.

### Composition over mega-configuration

Prefer small, understandable Liquid snippets and existing component contracts over one giant snippet with many unrelated modes.

Do not create a new custom element solely for styling. A custom element must own real behavior/lifecycle.

### Progressive enhancement

Primary content must exist before JavaScript is ready:

- headings;
- product/article information;
- links/CTA;
- image/media fallback;
- slider/list items;
- empty/error fallback when the contract calls for it.

JavaScript enhances interaction rather than creating SEO-critical content from nothing.

## Design-system adherence

Avoid generic AI-looking UI. Match the existing FOX theme and reference/mockup.

Do not default to:

- arbitrary purple/indigo gradients;
- excessive rounding;
- stock card grids unrelated to content hierarchy;
- large shadows everywhere;
- oversized equal padding on every block;
- invented spacing/color values when project tokens exist;
- placeholder copy that hides wrapping/overflow problems.

Use realistic Vietnamese storefront content when placeholder content is needed unless the task requires another language.

## Layout and spacing

- Use project spacing/container conventions first.
- Avoid unexplained magic pixel values when an existing token/scale fits.
- Keep section layout responsive without duplicating whole markup trees per breakpoint unless required.
- Verify long titles/descriptions and variable item counts.
- Prevent horizontal page overflow unless a component intentionally owns a horizontal scroller.

## Typography

- Preserve semantic heading hierarchy.
- Use shared section title/subtitle/description classes for standard section headers where the project contract says to.
- Do not use heading tags solely for visual styling.
- Do not skip levels casually when page structure matters.

## Color and contrast

- Prefer project CSS custom properties/tokens over hard-coded colors.
- Do not use color as the only indicator of state.
- Keep text/control contrast accessible.
- Preserve visible focus indication.

## Accessibility

Every interactive UI change must consider:

### Native semantics first

- navigation → `<a href>`;
- action → `<button type="button">`;
- form control → native input/select/etc.;
- list semantics where appropriate.

Avoid clickable `<div>` when a native control exists.

### Accessible names

Icon-only controls need an accessible label. Inputs need a visible label or valid accessible name. Image alt must follow the image/content contract.

### Keyboard and focus

Check relevant patterns:

- logical Tab order;
- Enter/Space behavior through native controls;
- arrow/Home/End for tabs when the project tabs contract requires it;
- Escape/focus trap/restore focus for modal/drawer;
- focus-visible remains visible;
- hidden content cannot still receive accidental focus.

### Motion

Respect `prefers-reduced-motion` for non-essential motion. Scroll-driven/animated sections must have the documented static fallback.

## Responsive strategy

Design from content constraints, not only named devices.

For this project, verify at minimum representative states around:

- narrow mobile (~320–390px);
- project mobile/tablet breakpoint around 767/768px when relevant;
- project desktop behavior around 1024px when relevant;
- common desktop width (~1440px).

Use exact breakpoints from the affected component/docs when they differ.

Check:

- wrapping/truncation;
- horizontal overflow;
- touch target usability;
- navigation/control visibility;
- image crop and text-overlay safe area;
- one item vs many items;
- content order/fallback when enhanced behavior is disabled.

## Loading, empty, error, and single states

A production storefront component should not become blank or unusable because data/settings are missing.

For the affected UI, identify applicable states:

```text
loading
ready
empty
disabled
error
single item
multiple items
```

Do not invent states that the existing contract does not need, but do not ignore documented states either.

Skeleton/loading UI is appropriate only when content is genuinely async. Server-rendered Liquid content should not be replaced by unnecessary client-side loading placeholders.

## Media and images

When adding/changing media:

- follow `docs/image-guide.md` byte/dimension/format rules;
- use width/height where possible;
- first meaningful hero image may be eager/high-priority when project rules allow;
- offscreen media should be lazy where appropriate;
- use a mobile source/crop when the design needs it;
- do not preload every slide/banner;
- do not use a heavy desktop image unchanged on mobile when a dedicated source exists.

## Interaction/state architecture

Do not introduce React-style stores/hooks/context because a generic UI skill suggests them.

For this repository:

- local UI state lives in the component/DOM state;
- shared UI communication uses existing custom events/state attributes/services;
- commerce state/request behavior belongs in the commerce layer;
- small Liquid→JS config uses `data-*`;
- structured payload uses the project JSON payload convention.

Use the simplest existing contract.

## Verification

After any UI implementation, use `browser-testing-with-devtools` automatically when browser tooling is available.

Verify the changed surface against the **resolved reference map** as well as functional requirements:

- structure/visual/behavior/motion still match the selected project reference where reuse was intended;
- no relevant console errors/warnings;
- correct live DOM/state;
- desktop/tablet/mobile behavior as applicable;
- keyboard/focus/accessibility;
- empty/single/multiple/error states that apply;
- reduced-motion/static fallback for animated UI;
- related network calls when async/commerce;
- before/after visual evidence for visual fixes.

If performance is an explicit goal or a regression is observed, use `performance-optimization`; do not invent PageSpeed/Lighthouse values.

## Completion quality gate

Before marking complete:

- [ ] Pattern discovery completed for new/materially changed UI
- [ ] Any design ambiguity was resolved before implementation
- [ ] Resolved reference map recorded (structure/visual/behavior/motion) when relevant
- [ ] Correct Haravan file placement and supported Liquid dialect
- [ ] Existing project component/design contracts reused where practical
- [ ] No unnecessary new custom element or dependency
- [ ] Semantic, keyboard-accessible controls
- [ ] Responsive behavior verified at relevant widths
- [ ] Missing/empty/single/error states handled where applicable
- [ ] Media follows project image/performance rules
- [ ] Browser verification completed when tooling is available
- [ ] Any unverified runtime/device/Haravan-admin behavior stated explicitly
