---
name: haravan-icons
description: Use whenever a task adds, replaces, or styles an icon or inline SVG in this Haravan theme (buttons, tabs, breadcrumbs, menus, policy items, separators). Finds icons in svg-cache first, fetches missing ones from the lib-icons MCP, adds them as <symbol> in svg-cache.liquid, and references them with <use>. Never hand-draw SVG or invent icon slugs.
---

# Haravan Icons

Source of truth: `docs/icon-guide.md`. Read it before adding or changing any icon.

## Workflow

1. **Search existing sprite**: `grep -o 'id="ic-[^"]*"' "FOX Fashion/snippets/svg-cache.liquid"`.
   Reuse only when meaning **and** style (set) match the request.
2. **Fetch from lib-icons MCP** (`.mcp.json` → `lib-icons`):
   - `list_icon_sets` → pick one set for the whole area (`outline` default UI, `solid` for
     filled separators/active states, `brand` for social).
   - `search_icons { query: "<english keyword>", set, limit }`.
   - `get_icons { set, slugs: [...] }` (max 30, same set). Use `missing[].suggestions`,
     never guess slugs.
   - MCP unreachable → fallbacks in `docs/icon-guide.md` §3 (temporary read-only script in the
     lib-icons repo, deleted afterwards; or ask the user to paste the SVG).
3. **Add a symbol** to `FOX Fashion/snippets/svg-cache.liquid`, next to related `ic-fox-*` icons:

   ```html
   <defs>
   	<!-- <Purpose>. Source: lib-icons, set "<set>" (<slug>). -->
   	<symbol class="svg-icon" id="ic-fox-<purpose>" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
   		<path d="…"></path>
   	</symbol>
   </defs>
   ```

   - Keep path data untouched; drop width/height.
   - Fill-based icon → remove every `stroke*` attribute from the root (they thicken strokes).
   - Stroke-based icon → `fill="none"`, keep `stroke="currentColor"`.
   - `keepsOriginalColors: true` → keep original colors.
   - ID names the role, not the shape; never rename an ID that has callers.
4. **Use it**:

   ```html
   <svg class="icon-svg <block>__icon" aria-hidden="true" focusable="false"><use xlink:href="#ic-fox-<purpose>"></use></svg>
   ```

   Icon-only controls get `aria-label` on the button/link. Repeated icons in one snippet:
   `capture` once. Size via CSS width/height (`1rem = 10px`), color via `color`.
5. **Verify**: search the new ID (one symbol, all callers), and report the set/slug used.
