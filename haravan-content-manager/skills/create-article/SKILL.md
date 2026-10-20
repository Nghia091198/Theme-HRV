---
name: create-article
description: Create and publish batches of safe, image-backed demo articles in a Haravan blog. Use when the user asks to seed, generate, or publish Haravan blog content through the local haravan-content-manager plugin.
---

# Create Haravan Articles

Create complete demo articles and publish them only after their content and cover images pass validation.

## Required Inputs

Always ask for both of these before generating content:

1. The number of articles.
2. The shop topic, industry, or product category.

Use Vietnamese unless the user requests another language. Do not ask for an additional content approval after these inputs are known.

## Connection And Blog Selection

1. Before each batch, ask the user to double-click `set-haravan-token.cmd` in the local plugin source and enter the current token in its masked PowerShell prompt. The MCP reads the Windows user value immediately; Codex does not need to restart.
2. Call `check_connection`. If the token is missing or rejected, stop and ask the user to run the helper again with a valid rotated token. Never ask the user to paste a token into chat or write it into `.mcp.json`.
3. Call `list_blogs`.
4. If there is one blog, select it automatically. If there are multiple blogs, ask which blog to use. If there are no blogs, stop without creating content.

## Content Contract

For each article:

- Write 500-800 words with a unique title and handle.
- Include a concise summary, semantic headings, paragraphs, a list or table when useful, a short FAQ, and a final CTA.
- Use only safe semantic HTML supported by the MCP sanitizer.
- Inline style is allowed only for presentation properties accepted by the sanitizer.
- Never include scripts, iframes, forms, event handlers, `<style>`, unsafe URLs, or copied copyrighted copy.
- Add a batch key to every handle so retries and duplicate checks are deterministic.

## Image Workflow

Use `$image-skill` and its `imagegen` workflow to create every cover before any Haravan write occurs.

- Generate one original JPEG cover per article at exactly `1920x1080`.
- Keep each file below `1,048,576` bytes.
- Do not include text, logos, watermarks, or identifiable brand marks.
- Validate dimensions, format, byte size, and visual fit using `$image-skill`.
- Use an absolute local path when calling the MCP tool.

If image generation is unavailable or any cover fails validation, stop the entire batch before calling `create_article`.

## Publish Workflow

1. Prepare all articles and validate all images first.
2. Process at most 10 articles per chunk.
3. Call `create_article` once per item with `blog_id`, the article payload, and its cover path.
4. The MCP stages an unpublished article, uploads and verifies the image, then publishes it. Do not emulate these API calls outside the MCP.
5. Stop the remaining batch on `401` or `403`. For validation or upload failures, record the failed item and continue.
6. Do not delete or roll back a failed draft. Report its ID when returned.

## Result

Return a compact batch report containing the batch ID, title, article ID, handle, storefront URL, and final status for every item. Clearly identify drafts retained after a failed upload or verification. Never expose credentials, image base64, or full request payloads.
