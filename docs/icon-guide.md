# Icon Guide

Rule dùng icon cho theme Haravan trong repo này. Áp dụng cho mọi agent (Codex, Claude)
và người phát triển. Tài liệu này là nguồn chuẩn; skill/agent chỉ trỏ tới đây.

## 1. Nguyên tắc

- Icon theme dùng **SVG sprite** trong `FOX Fashion/snippets/svg-cache.liquid`
  (`<defs><symbol id="ic-…">`) và gọi lại bằng `<use xlink:href="#ic-…">`.
- **Không tự vẽ SVG, không bịa slug.** Icon mới lấy từ thư viện **lib-icons**
  (MCP `lib-icons`, xem mục 3).
- Tìm trong `svg-cache.liquid` trước; chỉ thêm symbol mới khi chưa có icon phù hợp
  về **ý nghĩa và bộ (set)**.
- Không dán nguyên SVG path vào snippet/template khi icon có thể dùng lại qua symbol.
- Không tạo setting cho merchant nhập ID icon/sprite (xem `docs/settings-guide.md`).
  Icon theo vị trí (slot) được cố định trong Liquid; nếu merchant cần hình riêng,
  dùng setting upload `Hình ảnh`.

## 2. Tìm icon có sẵn

```bash
grep -o 'id="ic-[^"]*"' "FOX Fashion/snippets/svg-cache.liquid"
```

Một icon "có sẵn" chỉ dùng lại được khi đúng ý nghĩa **và** đúng phong cách
(nét/khối) của khu vực đang làm. Ví dụ: có mũi tên nhưng không thuộc bộ `solid`
mà yêu cầu cần mũi tên solid → lấy từ lib-icons.

## 3. Lấy icon từ lib-icons

MCP: `https://library-icons.vercel.app/api/mcp` (khai báo sẵn trong `.mcp.json`).
Chỉ đọc, không cần xác thực.

Quy trình:

1. `list_icon_sets` → chọn **một bộ** cho cả khu vực, dùng nhất quán.
   - `outline`: mặc định cho UI (nút, tab, menu).
   - `solid`: dấu ngăn nhỏ, trạng thái đang chọn, cần khối đặc.
   - `brand`: logo mạng xã hội đơn sắc.
   - `multicolor`: giữ màu gốc (thanh toán, cờ) — không đổi màu bằng CSS.
2. `search_icons { query, set, limit }`: từ khoá **tiếng Anh**, ngắn, kiểu Material
   (`description`, `local-shipping`, `arrow-right`…).
3. `get_icons { set, slugs[] }`: tối đa 30 slug **cùng một bộ** mỗi lần.
   Slug trong `missing[]` kèm `suggestions` → chọn lại từ gợi ý, không đoán.

### Khi không gọi được MCP

Thứ tự dự phòng:

1. Kiểm tra MCP `lib-icons` đã bật (`.mcp.json`, `/mcp` trong Claude Code).
2. Môi trường sandbox chặn mạng: nếu có repo lib-icons trên máy người dùng
   (project `lib-icon`), tạo **script tạm chỉ đọc** trong `scripts/` của repo đó,
   gọi `search_icons`/`get_icons` tới MCP production qua `fetch`, chạy bằng
   `run_project_script` rồi **xoá script ngay** và báo lại cho người dùng.
3. Nhờ người dùng dán SVG (ghi rõ set + slug cần lấy).

Không thay icon bằng SVG tự vẽ để "tạm dùng".

## 4. Thêm symbol vào `svg-cache.liquid`

Định dạng chuẩn:

```html
<defs>
	<!-- <Mục đích>. Source: lib-icons, set "<set>" (<slug>[, <slug>…]). -->
	<symbol class="svg-icon" id="ic-fox-<muc-dich>" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path d="…"></path>
	</symbol>
</defs>
```

Quy tắc chuyển SVG từ lib-icons sang symbol:

- **Giữ nguyên path data.** Bỏ `width`/`height`, giữ `viewBox`.
- **Icon vẽ bằng fill** (path có `fill="currentColor"`): symbol dùng
  `fill="currentColor"` và **bỏ toàn bộ `stroke`, `stroke-width`, `stroke-linecap`,
  `stroke-linejoin`** ở thẻ gốc. Giữ stroke trên icon fill sẽ viền thêm mọi nét làm
  icon dày và dính chi tiết ở cỡ nhỏ.
- **Icon vẽ bằng stroke** (path có `stroke`, không fill): symbol `fill="none"`,
  giữ `stroke="currentColor"` và độ dày gốc.
- `keepsOriginalColors: true` (multicolor): giữ màu gốc, không ép `currentColor`.
- **ID** dạng `ic-fox-<mục-đích>` mô tả **vai trò**, không mô tả hình
  (`ic-fox-info-shipping`, `ic-fox-breadcrumb-arrow`), để đổi hình sau này không
  phải đổi caller. Không đổi ID đã có caller.
- Đặt cạnh nhóm `ic-fox-*` liên quan, luôn có comment nguồn (set + slug).
- Không tạo symbol trùng ID; tìm lại sau khi thêm.

## 5. Dùng icon trong Liquid

```html
<svg class="icon-svg <block>__icon" aria-hidden="true" focusable="false">
	<use xlink:href="#ic-fox-<muc-dich>"></use>
</svg>
```

- Icon trang trí: luôn `aria-hidden="true" focusable="false"`.
- Nút/link chỉ có icon: đặt `aria-label` trên **nút/link**, không trên `<svg>`.
- Lặp icon nhiều lần trong một snippet: `capture` một lần rồi in lại
  (ví dụ `breadcrumb_separator` trong `component-breadcrumb.liquid`).
- Icon theo slot cố định: chọn ID bằng `assign`/`case` trong Liquid
  (ví dụ tab trong `product-info-tabs.liquid`).
- Pseudo-element (`::before`) không gọi được `<use>`; cần icon từ sprite thì đặt
  `<svg>` vào markup.

## 6. CSS

- Kích thước bằng `width`/`height` trên class của khối (`rem`/`em`; nhớ
  `1rem = 10px` trong theme này).
- Màu bằng thuộc tính `color` của phần tử cha (icon dùng `currentColor`).
- Icon nằm trong `.btn`/`[button-effect]`: đặt `position: relative; z-index: 1`
  để nằm trên `span[data-btn-effect-span]`.
- Không ép `stroke`/`stroke-width` lên `.icon-svg` toàn cục.

## 7. Checklist

- [ ] Đã tìm trong `svg-cache.liquid` trước khi thêm.
- [ ] Icon mới lấy từ lib-icons (set + slug ghi trong comment), không tự vẽ.
- [ ] Cả khu vực dùng chung một bộ icon.
- [ ] Icon fill không còn stroke ở thẻ gốc; icon stroke có `fill="none"`.
- [ ] ID `ic-fox-<mục-đích>`, không trùng, caller đã cập nhật.
- [ ] Markup có `aria-hidden`/`focusable="false"`; nút icon-only có `aria-label`.
- [ ] Nếu dùng script tạm ở repo lib-icons: đã xoá và báo người dùng.
