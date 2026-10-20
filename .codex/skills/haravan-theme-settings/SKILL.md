---
name: haravan-theme-settings
description: Create, edit, audit, and repair Haravan theme settings in config/settings.html and settings_data.json. Use when adding a theme setting, building a settings fieldset, translating merchant-facing settings, fixing grouped or inconsistent controls, reviewing setting keys/defaults, or validating Haravan settings UI.
---

# Haravan Theme Settings

Create settings that are easy for merchants to scan and safe for the current Haravan theme dialect.

## Required Context

1. Read the repository `AGENTS.md`.
2. Read `docs/settings-guide.md` and `docs/FOXTHEME_Setting_Libs_Full_v3.md` for every settings task. Read `docs/haravan-guidelines.md` for Haravan syntax and `docs/image-guide.md` when uploads or media are involved.
3. Inspect surrounding fieldsets and all callers of affected keys.
4. Preserve existing setting IDs unless the task explicitly includes a compatible migration.
5. Report every new file before creating it, including purpose, caller, and deploy status.

If documentation conflicts, follow the user's request and `AGENTS.md`, then `docs/settings-guide.md` for merchant setting keys and labels, then the established contract of the affected feature, then examples in the FOXTHEME library. Consult `docs/GUIDANCE-CONFLICTS.md` and record the decision as an assumption.

## Markup Contract

- Put each independent setting in its own `<tr>`.
- Use exactly one label cell and one control cell per row.
- Wrap every primary row label consistently in `<strong>`.
- Never combine unrelated controls with `/` in one label or place multiple independent inputs in one control cell.
- Split colors, desktop/mobile spacing, timing, alt text, media URL, CTA, and every product handle into separate rows.
- Keep one setting per source line where practical.
- Put helper text directly below `<strong>` in the same label cell, using `<p style="font-size: 12px;">...</p>`.
- Use concise helper text for dimensions, aspect ratios, formats, examples, or empty-value behavior. Keep the control alone in the second cell.
- Follow the repository's existing fieldset wrapper and table structure.

```html
<tr>
  <td><strong>Màu nền</strong></td>
  <td><input name="feature_background" class="color" value="#ffffff" /></td>
</tr>
```

```html
<tr><td><strong>Nhãn nút</strong><p style="font-size: 12px;">(bỏ trống để ẩn)</p></td><td><input type="text" name="feature_button_label"/></td></tr>
```

## Media Settings

- Use the primary label `Hình ảnh`; put dimensions or aspect ratio in helper text, for example `Hình ảnh` with `(tỉ lệ 9:16)` or `(160x160px)`.
- Do not use labels such as `Ảnh poster 9:16`, `Ảnh tab`, or verbose image-format instructions in the primary label.
- Use the simple label `Alt` for image alternative text.
- Whenever a feature supports video, add a media-type `<select>` with exactly these merchant-facing options: `Hình ảnh`, `YouTube`, and `Link MP4`.
- Keep the image upload, YouTube URL, and MP4 URL as separate rows. The storefront implementation decides which field is active from the select value.
- Do not expose SVG sprite IDs, icon names, or icon-source text inputs to merchants. Use an image upload setting instead.
- For a square 160px tab image, use `<strong>Hình ảnh</strong><p style="font-size: 12px;">(160x160px)</p>`.

## Language And Encoding

- Write merchant-facing labels, headings, help text, and default storefront copy in natural Vietnamese with full diacritics unless the user requests another language.
- Never remove accents as an encoding workaround; preserve UTF-8 in HTML and JSON.
- Search edited scope for mojibake markers such as `Ã`, `Â`, `Ä`, `Æ`, and `á»`.
- Keep brands, URLs, handles, filenames, setting keys, and technical identifiers unchanged.
- Prefer labels such as `Hiển thị?`, `Tiêu đề`, `Mô tả`, `Màu nền`, `Màu chữ`, `Hình ảnh`, `Alt`, `Nhãn nút`, and `Handle sản phẩm 1`.

## Keys And Defaults

- Follow the affected feature's established namespace and `feature_context_property` naming.
- Do not rename a live key merely to resolve a documentation-era prefix difference.
- Ensure keys read by Liquid exist in `settings.html`; update `settings_data.json` defaults when appropriate.
- Confirm blank, false, zero, missing upload, and invalid URL behavior.
- File uploads must use JPEG or PNG, never WebP.
- Do not claim `settings_data.json` was synced when the Haravan CLI accepted only `settings.html`.

## Workflow

1. Find the target fieldset, its keys, Liquid callers, and nearby conventions.
2. List malformed rows, inconsistent labels, missing defaults, and encoding issues.
3. Patch the smallest complete scope without refactoring unrelated settings.
4. Validate HTML structure, unique names, one-control-per-row intent, JSON syntax, key parity, and UTF-8 text.
5. Preview the merchant settings UI when available.
6. Sync only after local validation and report exactly which files the CLI accepted.

## Completion Checklist

- Every independent setting has a separate row.
- Every primary row label uses `<strong>` consistently.
- Every helper note uses a `<p style="font-size: 12px;">` in the label cell.
- Video-capable features use the `Hình ảnh / YouTube / Link MP4` select contract.
- No merchant-facing setting asks for an SVG sprite ID or icon identifier.
- Vietnamese text contains correct diacritics and no mojibake.
- Existing merchant data remains compatible.
- `settings_data.json` parses and affected keys match `settings.html`.
- Upload images follow `docs/image-guide.md`.
- Planned and actual files are reconciled in the final response.
