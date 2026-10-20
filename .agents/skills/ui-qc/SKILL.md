---
name: ui-qc
description: Reviews rendered Haravan storefront UI after layout/interaction changes. Use automatically after UI changes when visual/responsive/accessibility/runtime verification is required. Checks desktop/tablet/mobile, overflow, interaction, accessibility, console/network, and visual regression. Do not use as a substitute for implementation.
---

# UI QC Skill

## Core rule

Rendered evidence outranks assumptions from source code.

Use global `browser-testing-with-devtools` as the runtime inspection method when available. Use `performance-optimization` only when performance is in scope or measured evidence indicates a regression.

## Review sequence

1. Identify the changed section/component and expected behavior.
2. Load only the relevant component/project docs.
3. Inspect representative desktop, tablet, and mobile widths when responsive behavior is affected.
4. Exercise mouse/touch/keyboard interactions as applicable.
5. Check focus-visible, accessible names/ARIA, overflow, wrapping, empty/single states, reduced motion/static fallback, and error/no-JS fallback where relevant.
6. Check console and network observations related to the changed flow.
7. Compare before/after screenshots for visual fixes when possible.

## Output

For each real finding report:

- Vấn đề
- Bằng chứng/behavior quan sát được
- Root cause có khả năng cao
- Đề xuất sửa

Then report only observed global issues such as measured performance regression, relevant console/network errors, repeated visual regression, or an architectural root cause.

Do not invent Lighthouse/PageSpeed values or claim a browser/device was checked when it was not.
