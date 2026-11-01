# CLAUDE.md — Haravan Theme Core (FOX Fashion)

Bản hướng dẫn cho Claude (Claude Code / Claude Desktop). Nguồn rule gốc dùng chung với
Codex là `AGENTS.md` + `docs/`. File này **không chép lại** rule; chỉ bổ sung định tuyến,
quy trình làm việc đã thống nhất và các điểm dễ sai. Khi mâu thuẫn, `AGENTS.md` và guide
chuyên môn trong `docs/` thắng; ghi nhận theo `docs/GUIDANCE-CONFLICTS.md`.

@AGENTS.md

## Theme deploy

- Thư mục theme: `FOX Fashion/` (assets, config, layout, locales, snippets, templates).
- Mọi thứ ngoài `FOX Fashion/` (`docs/`, `.agents/`, `.codex/`, `.claude/`, `CLAUDE.md`,
  `.mcp.json`) là nội bộ, không deploy.

## Đọc theo task (không load hết docs)

| Task | Skill (.claude/skills) | Docs chính |
|---|---|---|
| Liquid/template/snippet/asset loading | `haravan-theme` | `docs/haravan-guidelines.md`, `docs/coding-standard.md` |
| UI mới / đổi đáng kể layout, CSS | `frontend-ui-engineering` | `docs/PATTERN-DISCOVERY.md`, `docs/component-library.md` |
| Web Component dùng chung (slider/tabs/modal…) | `frontend-component` | `docs/component-library.md`, `docs/coding-standard.md` |
| Settings merchant | `haravan-theme-settings` | `docs/settings-guide.md`, `docs/FOXTHEME_Setting_Libs_Full_v3.md` |
| Icon / SVG | `haravan-icons` | `docs/icon-guide.md` |
| Ảnh / media | `frontend-ui-engineering` | `docs/image-guide.md` |
| Legacy / TYT→FOX / components.js | `migration` | `docs/migration-guide.md` |
| QA giao diện sau khi sửa | `ui-qc` | — |

Chi tiết định tuyến: `docs/AGENT-ROUTING.md`.

## Subagents (.claude/agents)

- `code-mapper` (chỉ đọc): map caller, load point, selector, event, settings trước thay đổi
  nhiều file hoặc UI không tầm thường.
- `frontend-implementer`: thực thi thay đổi đã rõ phạm vi và reference map.
- `haravan-reviewer` (chỉ đọc): review tương thích Haravan, lifecycle, a11y, regression.
- `migration-reviewer` (chỉ đọc): review an toàn migration/đổi tên.
- `ui-qc`: kiểm tra giao diện đã render (không sửa code).

Không gọi subagent cho việc nhỏ chỉ để tạo nghi thức.

## Quy trình làm việc với người dùng

- Trả lời bằng **tiếng Việt**. Khi người dùng yêu cầu "đọc rule rồi chờ confirm", chỉ
  báo cáo, không sửa file.
- **Trước khi tạo file mới**: báo đường dẫn, mục đích, caller/load point, có deploy hay
  không. Phát sinh file ngoài danh sách thì báo bổ sung trước khi tạo.
- **Đổi tên / đổi contract** (template view, class, event, setting key, ID icon): tìm toàn
  bộ caller, cập nhật trong cùng lần sửa, rồi tìm lại để chắc không còn tham chiếu cũ.
- Thay đổi lớn: có mốc rollback (git) trước khi làm.
- Không tuyên bố đã test trên Haravan/trình duyệt khi chưa test; nêu rõ phần chưa kiểm
  tra được.
- Bàn giao theo **Response Format** trong `AGENTS.md` §21: tóm tắt, file đã sửa, đối chiếu
  file dự kiến/thực tế, quyết định kiến trúc, kiểm tra đã làm, rủi ro.
- Không đọc/sửa `.env*`, `.haravan-cli_local.json` (đã chặn trong `.claude/settings.json`).

## Icon (tóm tắt — chi tiết ở `docs/icon-guide.md`)

1. Tìm `id="ic-…"` trong `FOX Fashion/snippets/svg-cache.liquid`.
2. Chưa có → MCP `lib-icons` (`search_icons` → `get_icons`), một bộ cho cả khu vực.
   Không tự vẽ SVG, không bịa slug.
3. Thêm `<symbol class="svg-icon" id="ic-fox-<mục-đích>" viewBox="0 0 24 24">` kèm comment
   nguồn; icon fill thì bỏ stroke ở thẻ gốc.
4. Dùng: `<svg class="icon-svg …" aria-hidden="true" focusable="false"><use xlink:href="#ic-fox-…"></use></svg>`.

## Điểm dễ sai trong repo này

- `html { font-size: 62.5% }` → **`1rem = 10px`**.
- CSS theo template được nạp trong `FOX Fashion/snippets/head_styles.liquid`
  (`template contains …`); nhiều JS nạp toàn site ở `snippets/footer-scripts.liquid`.
  Feature lỗi giao diện ở một trang → kiểm tra **load point CSS** trước khi sửa code.
  Thứ tự nạp file trong `head_styles` quyết định CSS nào thắng khi cùng specificity.
- CSS chỉ cần sau tương tác (vd. zoom ảnh) có thể để component tự nạp: URL truyền từ
  Liquid qua `data-*` (`asset_url`), xem `core-component-image-zoom.js`.
- Alternate template: `product.<view>.liquid` / `page.<view>.liquid` ↔ `?view=<view>`.
  Card sản phẩm qua AJAX: `FOX.loadProductFragment(handle, 'product-loop-data')`
  (template `product.product-loop-data.liquid`).
- Hiệu ứng nút chuẩn: thuộc tính `button-effect` + `span[data-btn-effect-span]`
  (`BtnEffectController` trong `components.js`). Màu hover dùng token
  `--color-btn-bg-primary` / `--color-btn-text-primary`, không hard-code.
- Settings: thêm key mặc định vào khối **`"current"`** của `config/settings_data.json`;
  key không prefix `fox_`; label tiếng Việt theo `docs/settings-guide.md`.
- Ảnh từ settings upload: `FOX Fashion/snippets/page-media.liquid` (hoặc `render-img`),
  chỉ include khi giá trị khác rỗng.
- Liquid: chỉ dùng tag đã có trong repo; `include`, không `render`/`liquid`/`echo`/`schema`.
  Biến dùng nhiều lần trong vòng lặp setting động: gom bằng `capture` một lần.
- `docs/component-library.md` cần cập nhật khi thêm/đổi component contract.
