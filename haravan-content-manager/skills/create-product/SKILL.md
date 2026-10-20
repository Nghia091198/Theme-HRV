---
name: create-product
description: Create and publish batches of image-backed demo products with realistic Haravan options, variants, prices, SKUs, and inventory. Use when the user asks to seed or publish Haravan product data through the local haravan-content-manager plugin.
---

# Create Haravan Products

Create storefront-ready demo products while staging every product as unpublished until its variants and images are verified.

## Required Inputs

Always ask for both of these before generating content:

1. The number of products.
2. The shop topic, industry, or product category.

Use Vietnamese unless the user requests another language. Generate names, vendor, product type, tags, integer VND prices, SKUs, inventory, and descriptions. Do not ask for an additional content approval.

## Connection

Before each batch, ask the user to double-click `set-haravan-token.cmd` in the local plugin source and enter the current token in its masked PowerShell prompt. The MCP reads the Windows user value immediately; Codex does not need to restart. Then call `check_connection`. If the token is missing or rejected, stop and ask the user to run the helper again with a valid rotated token. Never ask the user to paste a token into chat or write it into `.mcp.json`.

## Batch Rules

Use a unique batch key in all handles and SKUs.

- For `N=1`, create one product with three options, 12-24 variants, varied prices, and zero inventory for every variant.
- For `N>=2`, include at least one fully sold-out product and at least one product with three options, 12-24 variants, and varied prices and inventory.
- Other products use one to three options and varied in-stock, low-stock, and sold-out states.
- Every sold-out variant uses `inventory_management: "haravan"`, `inventory_policy: "deny"`, and `inventory_quantity: 0`.
- Prices are rounded integer VND values. `compare_at_price` is omitted or greater than or equal to `price`.
- Keep variant combinations unique and within Haravan limits.

Write a 250-450 word semantic description for each product using the same safe HTML rules as `$create-article`: no scripts, iframes, forms, event handlers, `<style>`, or unsafe URLs.

## Image Workflow

Use `$image-skill` and its `imagegen` workflow to generate all product images before any Haravan write occurs.

- Generate exactly three original JPEGs per product at `1600x1600`.
- Keep each file below `512,000` bytes.
- Do not include text, logos, watermarks, or identifiable brand marks.
- For wearable products, show the product on a real human model appropriate to the intended customer. Do not use mannequins, torso forms, ghost mannequins, floating garments, or flat lays unless the user explicitly requests them.
- Use believable ecommerce or lifestyle photography with natural poses, practical environments, realistic skin texture, flyaway hair, fabric wrinkles, and physically plausible light and shadows. Avoid waxy skin, excessive smoothing, perfect symmetry, over-HDR treatment, synthetic CGI surfaces, or dramatic effects that make the image look AI-generated.
- Keep anatomy and garment construction credible. Reject and regenerate images with malformed hands, fingers, limbs, faces, teeth, duplicated body parts, impossible seams, broken zippers, merged accessories, or fabric that does not follow the body naturally.
- Keep one consistent model, garment design, framing, and lighting direction across the three color treatments for a product whenever the generation workflow supports image editing or reference inputs.
- Use safe, neutral commercial poses. For children's products, use age-appropriate styling and non-suggestive catalog framing; otherwise use clearly adult models.
- Prefer three visual color treatments matching the first option's first three values.
- Validate dimensions, format, byte size, crop, model consistency, anatomy, garment construction, and visual realism with `$image-skill`.
- Pass absolute local paths to the MCP.

If image generation is unavailable or any image fails validation, stop the entire batch before calling `create_product`.

## Publish Workflow

1. Prepare every product and validate every image first.
2. Process at most 10 products per chunk.
3. Call `create_product` once per item with the product payload and exactly three image paths.
4. The MCP creates an unpublished product, uploads and maps images, verifies options, variants, and images, then publishes it.
5. Stop the remaining batch on `401` or `403`. For validation or upload failures, record the failed item and continue.
6. Do not delete or roll back a failed draft. Report its ID when returned.

## Result

Return a compact batch report containing the batch ID, product name, product ID, handle, storefront URL, image count, variant count, and final status for every item. Clearly identify retained unpublished products. Never expose credentials, image base64, full HTML, or full request payloads.
