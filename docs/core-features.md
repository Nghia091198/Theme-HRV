# Core Features (tính năng chuẩn của mọi theme)

Danh mục tính năng **bắt buộc có** trong mọi theme dựng trên core này. Theme mới thay **giao diện** (màu, bo góc, bố cục
chi tiết theo mẫu đã duyệt) nhưng giữ **vị trí settings, key, tên file và hợp đồng hành vi** dưới đây.

Được gọi từ `docs/THEME-BUILD-PLAYBOOK.md` (giai đoạn 2, 4.0, 6). Theme tham chiếu: **FOX Fashion**. Vị trí settings theo
bản đồ khoá trong `docs/settings-structure.md`.

---

## 0. Cụm "1. Thiết lập chung" (nền tảng của mọi theme)

Nhóm cấp 1 đầu tiên, vị trí và **6 nhóm con cố định** (khoá cấu trúc giữ thứ tự). Mọi theme đều có đủ 6 nhóm; theme mới chỉ
đổi **giá trị mặc định** (logo, font, màu) theo bộ nhận diện (`docs/brand-logo-guide.md`).

| # | Nhóm con | Key | Nơi theme đọc |
|---|---|---|---|
| 1 | Logo và Favicon | `use_logo`, `logo.png`, `favicon.png`, `ico_favicon` | `header.liquid`, `menu-mobile.liquid`, `head_preload.liquid` (logo); `head_meta.liquid` (favicon) |
| 2 | Kiểu chữ | `base_font`, `base_font_title` | `head_styles.liquid` → biến CSS font nội dung / tiêu đề |
| 3 | Màu sắc | `theme_bg_color`, `theme_text_color`; nút 1: `theme_btn_bgcolor`, `_textcolor`, `_bgcolor_hover`, `_textcolor_hover`; nút 2: cùng bộ hậu tố `_2` | `head_styles.liquid` → `--color-btn-bg-primary(-hover)`, `--color-btn-bg-secondary(-hover)`… |
| 4 | Mạng xã hội | `footer_facebook_url`, `_zalo_url`, `_instagram_url`, `_youtube_url`, `_tiktok_url`, `_x_url`, `_linkedin_url`, `_shopee_url`, `_lazada_url` | `list-socials.liquid` (footer), `floating-contact-channels.liquid` (nút liên hệ nổi dùng lại link) |
| 5 | Popup đăng ký nhận tin | xem §1 | `newsletter-popup.liquid` |
| 6 | Thông báo đơn hàng gần đây | xem §2 | `recent-orders.liquid` |

**Hợp đồng nhóm 1–4**

- **Logo**: `use_logo` tắt thì hiện tên shop dạng chữ; ảnh gọi theo **tên asset** `'logo.png' | asset_url` (không đọc
  `settings['logo.png']`), có width/height cố định để không nhảy bố cục, và được preload khi bật. File lấy từ bộ logo
  (`02-lockup-ngang/*-header@2x.png`, tải bản **@2x** để không mờ trên màn hình mật độ cao).
- **Favicon**: thẻ `<link rel="icon">` phải dùng **`'favicon.png' | asset_url`** (bản `.ico` từ bộ logo nếu dùng
  `ico_favicon`). **Lỗi đang có ở FOX:** `head_meta.liquid` đọc `settings.favicon` (key không tồn tại) và `ico_favicon`
  không được dùng, nên favicon merchant upload không lên site; theme mới phải nối đúng ngay từ đầu.
- **Kiểu chữ**: chỉ 2 lựa chọn (nội dung, tiêu đề); tiêu đề mặc định theo font nội dung. Danh sách font trong `<select>`
  giữ chung giữa các theme; theme mới đổi **giá trị mặc định** (`selected`), không đổi key.
- **Màu sắc**: 2 bộ màu nút là nguồn của hệ nút `btn btn-primary` / `btn btn-secondary`; mọi khối mới dùng hệ nút này,
  không tự đặt màu nút (xem §1). Màu theme phải trùng token của bộ logo (`ink`, `accent`).
- **Mạng xã hội**: ô bỏ trống thì **không tạo icon**; một nguồn link duy nhất dùng chung cho footer và nút liên hệ nổi
  (không tạo bộ link thứ hai).

---

## 0.1. **** Tính năng mua hàng **** (công tắc bán hàng toàn site)

| Mục | Quy định |
|---|---|
| Settings | nhóm cấp 1 **"**** Tính năng mua hàng ****"**, ngay **trước** "1. Thiết lập chung" |
| Key | `shop_buying` (checkbox "Sử dụng?", **mặc định bật**) |

**Khi bỏ tích** (chế độ catalog: chỉ trưng bày):

- **Không render**: icon giỏ trên header (`header.liquid`, gán vào `fox_header_cart`), mini cart (`layout/theme.liquid`),
  thanh mua nhanh (`product-main.liquid`).
- `<body>` có class **`fox-buying-off`**; `style-global` ẩn (`display: none !important`, công tắc toàn site nên phải thắng
  mọi quy tắc khối): mọi `add-to-cart` (Thêm vào giỏ / Mua ngay ở trang sản phẩm, quick view, featured product, story,
  lookbook…), ô số lượng `.fox-product__quantity`, nút "Thêm cả bộ" `[data-bundle-variants]`, "Thêm tất cả vào giỏ" của
  trang yêu thích.
- **Chốt chặn JS** ở `cart.js` → `rawAdd()` (đường duy nhất của `add`, `addMany`, `buyNow`, `swapVariant`): từ chối với lỗi
  "Tính năng mua hàng đang tạm tắt.", nên không có đường nào thêm được vào giỏ.
- **Trang `/cart`**: dòng đầu `cart.liquid` là
  `{%- unless settings.shop_buying -%}<script>window.location = '/';</script>{%- endunless -%}`.
- Khối mới có nút mua hàng phải dùng `add-to-cart` (hoặc thêm selector vào danh sách ẩn) và gọi `FOX.cart`, để công tắc
  này luôn bao phủ.

**Cảnh báo bắt buộc**: checkbox kiểm tra trực tiếp, nên key **chưa có giá trị** trên store = **tắt bán hàng**. Phải đồng
bộ `settings_data.json` (có `"shop_buying": true`) **cùng lúc** với code, hoặc vào settings bấm Lưu ngay sau khi đồng bộ.

---

## 1. Popup đăng ký nhận tin

| Mục | Quy định |
|---|---|
| Settings | **Thiết lập chung → 5. Popup đăng ký nhận tin** |
| Key | `newsletter_popup_show`, `_mode` (`form` / `banner`), `_delay` (giây), `_days` (ngày, ≥ 1); Banner: `newsletter_popup_banner.jpg`, `_banner_mobile.jpg`, `_banner_alt`, `_banner_url`; Form: `newsletter_popup_form_image.jpg`, `_badge`, `_eyebrow`, `_title`, `_desc`, `_placeholder`, `_button`; Sau khi đăng ký: `_success_title`, `_success_desc` |
| File | `snippets/newsletter-popup.liquid`, `assets/newsletter-popup.js`, `assets/newsletter-popup.css`, 3 ảnh mặc định `assets/newsletter_popup_*.jpg` |
| Gắn vào | `layout/theme.liquid` (sau `floating-contact`); CSS / JS nạp **chỉ khi** `newsletter_popup_show` và `template == 'index'` |

**Hành vi bắt buộc**

- **Chỉ hiện ở trang chủ** (`template == 'index'`); không có setting chọn trang.
- Hiện sau `_delay` giây. **Ghi mốc `localStorage` ngay khi popup hiện** (không đợi khách đóng), nên mở web lần sau / chuyển
  trang / tải lại đều không hiện lại tới hết `_days` ngày. Đăng ký thành công hoặc bấm banner thì ẩn 365 ngày.
- Đang có `dialog[open]` khác thì hoãn, thử lại sau.
- Form: `{% form 'customer' %}` của Haravan, tag `Đăng ký nhận bản tin, Popup nhận tin`; gửi bằng `fetch` rồi chuyển sang
  màn cảm ơn (focus vào tiêu đề); lỗi mạng thì gửi kiểu thường và đánh dấu phiên để popup mở lại đúng màn cảm ơn.
- Dùng `modal-component` chung (Esc, bấm nền, khoá focus) và nút đóng tròn chung (`fox-quick-view__close`).
- Nút **dùng hệ nút của theme**: `btn btn-secondary btn-effect--out` + `button-effect` (`btn__label` +
  `data-btn-effect-span`). CSS popup chỉ đặt kích thước / vị trí nút, không đặt màu.
- Ảnh gọi `render-img` với **tên asset** (có ảnh mặc định), không kiểm tra settings ảnh theo tên file.
- Thiết kế đã chốt: **Form mẫu A** (ảnh trái + nội dung phải; mobile xếp dọc, ảnh 180px).

**Không làm**: ghi chú đồng ý, nút "Không, cảm ơn", mã ưu đãi trong popup (đã gỡ theo yêu cầu); hiện ở trang khác trang chủ.

**Kiểm tra**: `haravan-content-manager/scripts/debug-newsletter-popup.mjs` (không gửi form: sẽ tạo khách hàng thật).
Sau khi đồng bộ phải **Lưu settings một lần** để checkbox có giá trị.

---

## 2. Thông báo đơn hàng gần đây (Sales Pop)

| Mục | Quy định |
|---|---|
| Settings | **Thiết lập chung → 6. Thông báo đơn hàng gần đây** |
| Key | chung: `recent_orders_show`, `_delay`, `_duration`, `_gap`, `_max_days` (mặc định 7), `_mobile`; 6 mục: `recent_order_N_show`, `_name`, `_place`, `_time`, `_handle` (N = 1…6) |
| File | `snippets/recent-orders.liquid`, `assets/recent-orders.js`, `assets/recent-orders.css` |
| Gắn vào | `layout/theme.liquid` (sau `newsletter-popup`); CSS / JS nạp khi bật, **trừ trang giỏ và tài khoản** |

**Hành vi bắt buộc**

- Dữ liệu **nhập tay 6 mục** trong settings (đã chốt, không dùng menu). Ghi chú đầu nhóm nhắc **nhập theo đơn thật**, tên
  rút gọn (vd "Ngọc A.").
- `_handle` nhận **nguyên link hoặc handle**: Liquid cắt `split: '/products/' | last | split: '?' | first | split: '#' | first | remove: '/'`; không cần chú thích.
- `_time` là **thời điểm đặt hàng** (`dd/mm/yyyy hh:mm`, chấp nhận `dd/mm/yyyy`, `yyyy-mm-dd hh:mm`). JS **tự tính** nhãn
  mỗi lần hiện: Vừa xong / x phút / x giờ / Hôm qua / x ngày trước.
  - thời điểm **chưa tới** → **bỏ qua mục**, tới giờ tự hiện;
  - cũ hơn `_max_days` → bỏ qua mục;
  - bỏ trống / sai định dạng → hiện thẻ, không dòng thời gian.
- Sản phẩm lấy từ `/products/<handle>.js` (lưu đệm), ảnh cỡ `_compact`; sản phẩm không có → bỏ qua mục.
- Xoay vòng: hiện `_duration` giây, nghỉ `_gap` giây, **tối đa 2 vòng** mỗi lần xem trang; di chuột / focus giữ thẻ; có
  `dialog[open]` thì hoãn; ✕ tắt cho cả phiên (`sessionStorage`).
- Vị trí: góc trái dưới, **ngay trên nút chọn ngôn ngữ** (cùng biến khoảng cách với `translate-switcher.css`), tự ẩn khi
  có hộp thoại mở; mobile là dải ngang, cộng `--fox-sticky-buy-offset`.
- Thiết kế đã chốt: **mẫu A** (thẻ kính có ảnh), **không có nhãn "Đã xác thực"**.

**Không làm**: tự sinh **thời gian / số người mua ngẫu nhiên** để giả như thật (thông tin gây hiểu lầm cho người tiêu dùng;
rủi ro theo Luật Bảo vệ quyền lợi người tiêu dùng 2023). Không hiện ở trang giỏ / tài khoản.

**Kiểm tra**: `haravan-content-manager/scripts/test-recent-orders.mjs` (hành vi, đồng hồ cố định, `--now=`),
`debug-recent-orders.mjs` (vị trí so với nút ngôn ngữ trên store), `list-product-handles.mjs` (lấy handle mẫu).

---

## 2.1. Đánh giá sản phẩm (App Review)

| Mục | Quy định |
|---|---|
| Settings | **"***** Ecommerce Solutions App *****" → App Review** |
| Key | `app_review_show` (mặc định tắt), `app_review_app`: `none` / `easy_review` / `omni_review` (mặc định `none`) |
| File | `snippets/product-review-badge.liquid` (nơi duy nhất đọc 2 key); CSS `.fox-review-badge` trong `style-global` |
| Gắn vào | **ngay dưới tên sản phẩm** trong `product-loop.liquid` (mọi lưới / carousel) và trong `product-form.liquid` (trang sản phẩm, quick view, featured product) |

- Easy Review: metafield `product.metafields.starbap['starbaprv.badge']`, đổi "x đánh giá" thành "(x)"; chưa có đánh giá thì
  hiện 5 sao + "(0)" bằng **SVG** (theme không nạp Font Awesome), giữ class `starbap-*` cho app.
- Omni Review: `product.metafields.onistudio['reviewapp.loop']` (dùng biến `product`, không phải `product_layout` của theme Omni).
- Thêm app đánh giá mới: thêm `<option>` vào `app_review_app` và một nhánh `when` trong snippet; không gắn markup app ở nơi khác.
- **Tab "Đánh giá"** ở trang chi tiết: settings **"3. Trang sản phẩm → 3. Tab thông tin sản phẩm" → Tab Đánh giá**
  (`product_review_tab_show`, `product_review_tab_title`, mặc định "Đánh giá"). Tab dựng trong `product-info-tabs.liquid`
  (sau 2 tab tuỳ chỉnh, cùng kiểu nút), nội dung là `snippets/product-review-widget.liquid`: khối đánh giá đầy đủ của app
  (Omni: `onistudio['reviewapp.detail']` + `#onireviewapp`; Easy: `#startbap_product_reviews` + `starbap['starbaprv.widget']`).
  Giữ nguyên id / class / `data-*` của app. Tab chỉ hiện khi bật App Review, đã chọn app và bật tab.
- Quick view và featured product có badge dưới tiêu đề (dùng chung `product-form.liquid`), không có tab đánh giá.

---

## 3. Các tính năng toàn site khác (đã có trong core)

| Tính năng | Settings | File chính |
|---|---|---|
| Header: mega menu, tìm kiếm dropdown, tài khoản, yêu thích, giỏ | Thiết lập tổng quát → 3. Đầu trang; 8. Trang Tìm kiếm & Dropdown Search | `header.liquid`, `search-panel.*`, `mini-account.*` |
| Mini cart + trang giỏ (thời gian giao, khuyến mãi, ghi chú, hoá đơn, gợi ý, cam kết) | 7. Trang giỏ hàng & Minicart | `cart-content.*`, `mini-cart.*`, `cart-page.css`, `cart.js`, `cart-add.js`, `cart-root.js` |
| Thanh tiến trình thêm vào giỏ (thay toast) | — | `cart-add.js` (`FOX.cart.progress`), `cart-content.css` |
| Quick view, size guide, sticky buy, còn hàng tại cửa hàng | 3. Trang sản phẩm | `quick-view.*`, `size-guide.*`, `product-sticky-buy.*`, `product-store-stock.*` |
| Yêu thích (lưu trình duyệt, chia sẻ bằng bảng chia sẻ của hệ điều hành) | 14. Trang yêu thích | `wishlist.*` |
| Thanh bên nội dung dùng chung (blog, bài viết, trang nội dung) | 5, 6, 9 (bộ setting riêng mỗi trang) | `content-sidebar.liquid`, `blog.css` |
| Cam kết mua sắm (nội dung một nơi, công tắc mỗi trang) | 2 → 6. Cam kết mua sắm (+ công tắc ở 7, 9) | `collection-policy.liquid`, `policy.css` |
| Nút liên hệ nổi, chọn ngôn ngữ | Thiết lập tổng quát | `floating-contact.*`, `translate-switcher.*` |

Thêm tính năng chuẩn mới: ghi vào file này (vị trí settings, key, file, hành vi bắt buộc, không làm, kiểm tra) và cập nhật
bản đồ trong `settings-structure.md`.
