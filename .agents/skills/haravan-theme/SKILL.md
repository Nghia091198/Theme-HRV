---
name: haravan-theme
description: Use for Haravan theme architecture, Liquid/templates/snippets, asset loading, settings, commerce integration, or questions where Shopify assumptions may be unsafe. Do not use for generic frontend work unrelated to Haravan.
---

# Haravan Theme Skill

## Goal
Make changes that are valid for this repository's Haravan runtime and deployment model.

## Read first, selectively
- Liquid/templates/snippets/assets: `docs/haravan-guidelines.md`
- Architecture decisions: `docs/architecture.md`
- Settings: `docs/settings-guide.md`
- Images: `docs/image-guide.md`
- Migration: `docs/migration-guide.md`

Do not load all documents unless the task spans all of them.

## Workflow
1. Identify the actual template/snippet/asset/config caller.
2. Check repository-supported Liquid syntax before writing syntax that resembles Shopify OS 2.0.
3. Keep primary content and markup server-rendered with Liquid.
4. Pass small scalar config through `data-*`; pass larger structured data through JSON payloads.
5. Keep custom-element registration and reusable behavior in asset JavaScript.
6. Verify fallback/no-JS behavior when the affected feature depends on JavaScript.
7. For commerce/API changes, inspect current endpoint, caller, response shape, and error behavior before modifying.

## Hard constraints
- No `Theme/sections/`.
- No `{% liquid %}`, `{% echo %}`, `{% render %}`, `{% schema %}` unless repository guidance is explicitly changed by the user.
- Do not guess Haravan API behavior.
- Do not edit `.haravan-cli_local.json` unless explicitly requested.
- Do not introduce secrets into theme files.
