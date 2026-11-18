# Theme Build Playbook (orchestrator)

Khi user yêu cầu **"làm cho tôi một theme"** (theme mới trên nền core này), đọc file này trước tiên và đi **tuần tự** các
giai đoạn. Mỗi giai đoạn: **đọc** → **làm** → **giao** → **chờ duyệt** (nếu có) → **kiểm tra**. Không nhảy giai đoạn; không
bỏ điểm chờ duyệt.

Theme tham chiếu đã hoàn thiện: **FOX Fashion** (`FOX Fashion/`). Mọi quyết định cấu trúc lấy theo FOX; theme mới chỉ đổi
**thương hiệu, UI/UX và nội dung**.

Tài liệu nền luôn áp dụng: `AGENTS.md` (invariant), `docs/AGENT-ROUTING.md` (chọn skill/agent cho từng việc nhỏ),
`docs/coding-standard.md`, `docs/haravan-guidelines.md`, `FOX Fashion/ARCHITECTURE.md` (mục "Lỗi đã gặp"),
`docs/core-features.md` (tính năng chuẩn bắt buộc: vị trí settings, key, file, hợp đồng hành vi).

---

## Giai đoạn 0. Nhận yêu cầu (brief)

- **Hỏi đủ** (dùng câu hỏi lựa chọn, tối đa 3 câu một lượt): tên thương hiệu, ngành hàng / chủ đề, khách hàng mục tiêu,
  phong cách (vd kính tối, tối giản, editorial), màu gợi ý, store Haravan đích, theme tham khảo (link / ảnh).
- **Giao:** `PLANNING/{theme}/brief.md` (tóm tắt các câu trả lời + giả định).
- **Chờ duyệt:** user xác nhận brief.

## Giai đoạn 1. Thương hiệu & logo

- **Đọc:** `docs/brand-logo-guide.md`.
- **Làm:** tra nhãn hiệu → 5 hướng biểu tượng → 3–5 biến thể → bộ logo chuẩn 8 thư mục (gồm dạng tròn + `.ico`,
  sinh bằng `scripts/brand/derive-logo-assets.py`) → chốt token màu (`ink`, `accent`, nền kính).
- **Giao:** zip bộ logo + ảnh tổng quan, lưu `brand/{theme}/`.
- **Chờ duyệt:** chọn hướng (bước 3) và chốt biến thể (bước 4).

## Giai đoạn 2. Hướng thiết kế từng trang

- **Đọc:** `docs/PATTERN-DISCOVERY.md`, `docs/image-guide.md`.
- **Làm:** với mỗi trang / khối lớn, dựng **3 mẫu A / B / C** (ảnh JPG), đặt tên `{THEME}-{trang}-mau-{A|B|C}-{ten}.jpg`
  (FOX: `FOX-minicart-mau-A-gon-chot-don.jpg`…). Ưu tiên theo thứ tự giai đoạn 4.
- **Bộ mẫu bắt buộc cho tính năng chuẩn** (`docs/core-features.md`), dựng theo phong cách theme mới:
  - Popup đăng ký nhận tin: **3 mẫu Banner + 3 mẫu Form** (`{THEME}-popup-banner-mau-…`, `{THEME}-popup-form-mau-…`);
  - Thông báo đơn hàng gần đây: **3 mẫu góc trái dưới** (`{THEME}-sales-pop-mau-…`), không nhãn "Đã xác thực".
  FOX đã chọn: Form mẫu A; Sales pop mẫu A.
- **Chờ duyệt:** user chọn mẫu cho từng trang trước khi code trang đó (có thể duyệt theo đợt).

## Giai đoạn 3. Khung theme & settings

- **Đọc:** `docs/settings-structure.md` (bản đồ nhóm **cố định**), `docs/settings-guide.md`, skill `haravan-theme-settings`.
- **Làm:**
  1. Sao chép khung từ FOX: `layout/`, `snippets/` core, `assets/` core (`core-*`), `config/settings.html` (giữ nguyên bản
     đồ nhóm), `docs/settings-structure.lock.json`.
  2. Đổi token thương hiệu theo cụm **"1. Thiết lập chung"** (`docs/core-features.md` §0): logo @2x, favicon (nối đúng
     `'favicon.png' | asset_url`), 2 font, màu nền / chữ / 2 bộ màu nút trùng token bộ logo, link mạng xã hội; rồi CSS biến
     (bo góc, nền kính). Logo / favicon upload theo brand-logo-guide mục 5.
  3. Cấu trúc settings **không đổi**; chỉ nội dung **"1. Trang chủ"** thay theo section của theme mới.
- **Kiểm tra:** `node scripts/format-settings-html.mjs --check`, `node scripts/settings-lock.mjs`.

## Giai đoạn 4. Dựng trang (đúng thứ tự bản đồ settings)

Mỗi trang: đọc tài liệu chuyên môn liên quan (theo `docs/AGENT-ROUTING.md`) → code theo mẫu đã duyệt → settings của trang
đúng khung `settings-structure.md` mục 3–4 → giá trị mặc định trong `settings_data.json` → QA (giai đoạn 6, phần áp dụng).

| Thứ tự | Phạm vi | Nhóm settings |
|---|---|---|
| 4.0 | Toàn site: header (menu, mega menu, tìm kiếm, tài khoản, yêu thích, giỏ), footer, nút liên hệ nổi, mini cart, quick view, thanh tiến trình thêm vào giỏ; **popup đăng ký nhận tin** và **thông báo đơn hàng gần đây** (đúng hợp đồng `docs/core-features.md`) | Thiết lập tổng quát 1–5 (1. Thiết lập chung → 5, 6) |
| 4.1 | Trang chủ (các section theo theme) | 1. Trang chủ |
| 4.2 | Danh mục (lọc, sắp xếp, phân trang, banner, cam kết) | 2 |
| 4.3 | Sản phẩm (gallery, form, size guide, sticky bar, còn hàng, chia sẻ, liên quan, đã xem) | 3 |
| 4.4 | Tài khoản (đăng nhập, đăng ký, tài khoản, địa chỉ, đơn hàng) | 4 |
| 4.5 | Blog, bài viết (thanh bên dùng chung, mục lục, liên quan) | 5, 6 |
| 4.6 | Giỏ hàng & mini cart (thời gian giao, khuyến mãi, ghi chú, hoá đơn, gợi ý, cam kết) | 7 |
| 4.7 | Tìm kiếm (trang + bảng dưới header) | 8 |
| 4.8 | Trang nội dung mặc định `page` (thanh bên, cam kết) | 9 |
| 4.9 | Trang template riêng: liên hệ, về chúng tôi, trang chủ đề (FOX: chất liệu), FAQ, yêu thích, hướng dẫn chọn size, 404 | 10–15 |

- Khối dùng chung giữa nhiều trang (thanh bên, cam kết…): một snippet tên trung tính, công tắc riêng mỗi trang, nội dung
  ở một nơi (`settings-structure.md` mục 4, "Nội dung dùng chung").
- Trang template riêng: settings có hướng dẫn tạo trang + 1 ảnh xem trước (mục 3.1).

## Giai đoạn 5. Nội dung demo

- **Đọc:** skill `haravan-content-publisher`, `docs/image-guide.md`, `IMAGE-ART-DIRECTION.md` (haravan-content-manager).
- **Làm:** sản phẩm demo (đủ biến thể, ảnh theo màu), bài viết, trang nội dung, menu (kể cả menu "Tìm nhiều" là các link
  `/search?q=…`, không phải trang chính sách), mã khuyến mãi thật cho trang giỏ.
- **Lưu ý:** token Admin API chỉ ở biến môi trường máy user; không đưa vào chat / theme.

## Giai đoạn 6. QA (bắt buộc trước khi báo xong mỗi trang)

| Kiểm tra | Công cụ |
|---|---|
| Settings đúng chuẩn + khoá | `format-settings-html.mjs --check`, `settings-lock.mjs` |
| Custom element có `display` (tránh nền vẽ thành mảnh) | `scripts/audit-custom-element-display.mjs` |
| Đo trên store thật (bố cục, CSS nạp, phần tử, style tính toán) | `haravan-content-manager/scripts/debug-*.mjs` (Playwright + Chrome máy user) |
| Hành vi JS (giỏ hàng, thời gian giao, hoá đơn…) | `haravan-content-manager/scripts/test-*.mjs` |
| Template trang gán trên store, file theme đang chạy | `haravan-content-manager/scripts/check-live-theme-templates.mjs` |
| Popup đăng ký nhận tin (tự mở, không hiện lại, bố cục) | `haravan-content-manager/scripts/debug-newsletter-popup.mjs` (không gửi form) |
| Thông báo đơn hàng gần đây (xoay vòng, thời gian tự tính, vị trí) | `test-recent-orders.mjs` (`--now=`), `debug-recent-orders.mjs` |
| Ô nhập: focus, autofill, chữ ≥ 16px trên mobile | `debug-field-focus.mjs`, `scripts/audit-form-controls.mjs` |
| Accessibility / Performance (như PageSpeed) | `lighthouse-a11y.mjs`, `lighthouse-perf.mjs --page=/` |

Checklist bài học (chi tiết trong `FOX Fashion/ARCHITECTURE.md` mục "Lỗi đã gặp"):

- Custom element làm khung luôn khai báo `display`.
- Icon `<use>` từ symbol có sẵn width/height: `<svg>` ngoài phải có đúng `viewBox` (đo `<use>`, không đo `<svg>`).
- Không escape `part.title` của dấu ngắt quãng phân trang (`&hellip;`).
- Nhánh CSS theo template so khớp **chính xác** tên template (trang gán template không tồn tại sẽ rơi về `page.liquid`).
- Grid chứa slider: cột `minmax(0, 1fr)` + `min-width: 0` (tránh tràn 33 triệu px).
- Hiệu ứng theo chuột: di chuyển bằng `transform`, không nhận sự kiện chuột khi bám theo.
- Thuộc tính giỏ hàng rỗng = xoá (`attributes[Key]=`); không ghi giá trị "mặc định" dễ nhầm.
- Checkbox settings kiểm tra trực tiếp; không đọc settings ảnh theo tên file.
- Setting mới chỉ có giá trị sau khi đồng bộ `settings_data.json` **hoặc** merchant bấm Lưu một lần; tính năng "không thấy
  trên store" thì kiểm tra điều này trước khi nghi code.
- Nút trong khối mới dùng hệ nút của theme (`btn …` + `button-effect`), không tự đặt màu.
- Popup / thông báo nổi: ghi mốc `localStorage` khi **hiện**, hoãn khi có `dialog[open]`, không chồng lên nhau.
- Dữ liệu hiển thị cho khách (đơn gần đây, số người mua, thời gian) phải từ dữ liệu thật; không tự sinh ngẫu nhiên.
- Ảnh trang trí qua `render-img` dùng `decorative: true` (không truyền `alt: ''`).
- Mọi ô nhập văn bản ≥ 16px trên thiết bị cảm ứng (quy tắc chung trong `style-global`), autofill giữ nền theme.
- Không tuyên bố "đã kiểm tra trên store" khi chưa đo; ghi rõ phần chưa kiểm tra.

## Giai đoạn 7. Bàn giao

- Danh sách file đồng bộ lên Haravan + file cần **xoá trên store** (file đã đổi tên / gỡ).
- Trang trên store cần đổi template (template gán không tồn tại), menu / settings cần chọn.
- Ảnh xem trước cho các nhóm settings (`<img src="">` còn trống).
- Ghi các bài học mới vào `ARCHITECTURE.md` ("Lỗi đã gặp") và cập nhật playbook này nếu quy trình thay đổi.
