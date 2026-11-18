# FOX Fashion — Ghi chú kiến trúc

Quy ước bắt buộc khi sửa theme. Đọc trước khi viết code mới; cập nhật file này khi có quy ước mới.
File nằm ngoài các thư mục theme nên không được đồng bộ lên Haravan.

---

## 1. Ảnh từ settings: gọi thẳng `render-img`

**Quy tắc:** ảnh upload qua settings (input `type="file"`, tên asset như `about_hero_image.jpg`) được render bằng
**một lệnh gọi `render-img` ngay tại chỗ dùng**, truyền tên asset vào `src`. `render-img` tự gắn `asset_url`,
`width/height`, `sizes`, `loading`, `decoding`.

```liquid
{%- assign image_alt = settings.about_hero_alt | strip | escape -%}
<div class="fox-page-media">{%- include 'render-img' with src: 'about_hero_image.jpg', alt: image_alt, w: '1200', h: '900', loading: 'eager', sizes: '(min-width: 992px) 66vw, 100vw' -%}</div>
```

Trong vòng lặp, ghép tên asset bằng `capture` rồi truyền biến:

```liquid
{%- capture image_key -%}about_process_{{ item_index }}_image.jpg{%- endcapture -%}
<div class="fox-page-media">{%- include 'render-img' with src: image_key, alt: image_alt, w: '600', h: '800', sizes: '(min-width: 992px) 25vw, 50vw' -%}</div>
```

**Không làm:**

- Không tạo snippet trung gian bọc ảnh (đã xoá `snippets/page-media.liquid` vì lý do này).
- Không viết chuỗi điều kiện kiểu:
  ```liquid
  {%- if media_file != blank -%}
    {%- if media_file contains '//' -%} <img src="{{ media_file }}"> {%- else -%} {%- include 'render-img' … -%} {%- endif -%}
  {%- endif -%}
  ```
  Ảnh luôn là asset upload qua settings; không hỗ trợ URL ngoài.
- Không tự dựng thẻ `<img>` với `src` ghép từ nhiều nhánh `contains '//'` / `asset_url`, ví dụ (đã gỡ khỏi Product story):
  ```liquid
  <img src="{%- if settings['favicon.png'] contains '//' -%}{{ settings['favicon.png'] }}{%- elsif settings['favicon.png'] != blank -%}{{ settings['favicon.png'] | asset_url }}{%- elsif settings['logo.png'] contains '//' -%}…{%- else -%}{{ 'logo.png' | asset_url }}{%- endif -%}">
  ```
  Gọi thẳng `render-img` với tên asset, **không đọc `settings['<tên file>']`** để kiểm tra hay chọn ảnh:
  ```liquid
  {%- include 'render-img' with src: 'favicon.png', alt: '', w: '28', h: '28' -%}
  ```
- Không dùng biến trung gian dùng chung (`media_class`, `media_sizes`…) giữa nhiều ảnh: giá trị của ảnh trước dễ
  dính sang ảnh sau. Truyền giá trị trực tiếp vào `render-img` tại từng chỗ.

**Lưu ý:** alt luôn `strip | escape` trước khi truyền.

**Không đọc `settings['<tên file>']` trong Liquid** (không kiểm tra `!= blank`, không `contains '//'`, không
`| asset_url` giá trị đó; giá trị ô file là URL nên đưa qua `asset_url` sẽ ra link hỏng, đã làm thẻ Product story
trống). URL ảnh luôn tạo từ **tên asset**: `render-img` với `src: image_key`, hoặc `image_key | asset_url` khi cần
URL thô (nền CSS, `poster` của video).

**Ẩn / hiện ảnh bằng checkbox** trong settings (ví dụ `customer_auth_banner_show` "Hiển thị banner?",
`collection_image_show`, `iwto_N_show`), không suy ra từ việc ô file có giá trị hay không. Ảnh dùng làm nền CSS
(`background-image` qua biến) thì chỉ gán biến khi checkbox bật, và CSS luôn có dự phòng `var(--bien, none)`: biến
thiếu mà không có dự phòng làm hỏng cả khai báo `background` (mất lớp gradient đi kèm).

---

## 2. Không dựng dữ liệu mẫu trong Liquid

**Quy tắc:** Liquid chỉ hiển thị dữ liệu thật từ settings / Haravan. Không viết cứng làm giá trị dự phòng:

- link video / ảnh mẫu (đặc biệt từ shop hoặc CDN khác, ví dụ `athora-theme.myshopify.com`);
- handle sản phẩm, collection, bài viết mẫu;
- nội dung giả (tên, giá, đánh giá…).

Thiếu dữ liệu thì **ẩn mục / phần tử đó** (kiểm tra `!= blank`), không thay bằng mẫu. Giá trị mặc định trong
`config/settings.html` cũng không trỏ tới link bên ngoài; chữ mặc định (tiêu đề, nhãn nút) thì được.

**Đầu vào sản phẩm trong settings là "Đường dẫn sản phẩm"** (dễ copy từ trình duyệt). Liquid tự cắt handle:

```liquid
{%- assign product_handle = settings[product_key] | split: '/products/' | last | split: '?' | first | split: '#' | first | remove: '/' | strip -%}
```

Nhập handle trần vẫn chạy. Khi đổi nhãn ô cũ ("Handle sản phẩm") sang "Đường dẫn sản phẩm", giữ nguyên tên key để
không mất dữ liệu shop đã nhập.

---

## 3. Giỏ hàng: 3 file JS, mỗi file một vai trò

Nạp sau khi trang tải xong (`scriptcallafter` trong `snippets/shop-config.liquid`):

| File | Vai trò |
|---|---|
| `assets/cart.js` | Lõi: `FOX.cart` (gọi API, thêm / sửa / xoá / ghi chú, render từ `/cart?view=data`, event `cart:changed`) + lớp tương thích `FOX.cartAction` cho code ngoài theme. Không thao tác DOM của component |
| `assets/cart-add.js` | `<add-to-cart>`: nút thêm giỏ / mua ngay |
| `assets/cart-root.js` | `<cart-root>` (danh sách, số lượng, đổi phân loại) + `<mini-cart>` (ngăn kéo) |

Logic giỏ hàng mới đặt vào đúng 1 trong 3 file trên; không tạo file giỏ hàng mới. Bản cũ đã thay thế
(`cart-api.js`, `cart-action.js`, `cart-drawer.js`) nằm ở `tmp/backup-cart-legacy/` để khôi phục khi cần.

---

## 4. Checkbox trong settings: kiểm tra trực tiếp

**Quy tắc:** checkbox (`<input type="checkbox">`) đọc thẳng giá trị, **không so với `false`**:

```liquid
{%- if settings.about_hero_show -%}            ✅ đúng
{%- if settings.about_hero_show != false -%}   ❌ sai, không cần thiết
{%- if settings.about_hero_show == true -%}    ❌ thừa
```

Muốn mục mặc định bật thì đặt `checked="checked"` cho ô trong `config/settings.html`; không dùng `!= false` để "giả"
mặc định bật trong Liquid. Phủ định viết `{%- unless settings.x_show -%}`, không viết `== false`.

Khác với setting dạng `<select>` (xem "Lỗi đã gặp"): select phải so sánh đúng giá trị (`== 'group'`).

---

## 5. Lỗi đã gặp (đừng lặp lại)

- **Ảnh trang trí bằng `render-img`:** truyền `alt: ''` **không** cho alt rỗng (helper đổi rỗng thành tên shop). Ảnh đứng cạnh
  chữ đã nói cùng nội dung (nhãn, tên shop, viên ảnh minh hoạ) dùng `decorative: true`. Ảnh là nội dung duy nhất của link
  thì phải có alt thật.

- **Grid chứa slider làm tràn cả trang (≈33 triệu px):** cột grid ngầm định (`auto`) co theo nội dung lớn nhất của Swiper.
  Mọi grid / cột chứa slider khai báo `grid-template-columns: minmax(0, 1fr)` và `min-width: 0` cho khung chứa slider.
- **Phần tử bám theo chuột bị trễ / nhấp nháy:** di chuyển bằng `transform` (không `left` / `top`), ghi một lần mỗi khung
  hình (`requestAnimationFrame`), và **không nhận sự kiện chuột** khi đang bám (`pointer-events: none`); cú bấm để lớp nền
  xử lý.
- **Thuộc tính giỏ hàng:** muốn xoá thì gửi giá trị rỗng (`attributes[Key]=`); không ghi chuỗi "mặc định" (vd "Giao khi có
  hàng") vào đơn, dễ nhầm khi xử lý đơn.

- **Custom element mặc định `display: inline`:** thẻ tự đặt (`<size-guide>`, `<cart-delivery>`…) mà mang nền, viền,
  padding hoặc bo góc sẽ chỉ được vẽ thành **mảnh rời theo dòng chữ** (dải hẹp, góc lệch), phần còn lại trong suốt.
  Mỗi custom element làm khung phải có `display` rõ ràng (`block` / `grid` / `flex`) trong CSS của nó. Đã gặp ở vùng
  thời gian giao (trang giỏ) và khối bảng size (trang hướng dẫn chọn size). Rà nhanh: `scripts/audit-custom-element-display.mjs`.

- **Phân trang hiện chữ "&hellip;":** với phần tử không phải link trong `paginate.parts`, Haravan trả `part.title` là
  **thực thể HTML** (`&hellip;`). Cho qua `| escape` sẽ in nguyên văn chuỗi. Không escape / không in `part.title` cho
  dấu ngắt quãng: phân biệt trang hiện tại (`part.title == paginate.current_page`), còn lại in ký tự `…`
  (`snippets/pagination.liquid`).

- **Icon `<use>` lệch góc trái trên dù CSS đã căn giữa khung:** symbol trong `svg-cache.liquid` có sẵn `width` / `height`
  (`ic-times` 14×14, `ic-arrow-right-s` / `ic-arrow-left-s` 10×8). Nếu `<svg>` bên ngoài **không có `viewBox`**, `<use>` vẽ symbol
  ở kích thước gốc, **neo góc trái trên**, không co giãn theo khung. Khi dùng các symbol này, `<svg>` bên ngoài phải có **đúng
  `viewBox` của symbol**: `<svg class="icon-svg" viewBox="0 0 14 14"><use xlink:href="#ic-times"></use></svg>`.
  Kiểm tra bằng cách đo `getBoundingClientRect()` của `<use>` (nét vẽ thật), không phải của `<svg>`.

- **Thẻ Liquid trong `{% comment %}`:** Liquid của Haravan vẫn phân tích thẻ nằm trong comment. Viết
  `{% paginate … %}` trong comment làm cả file lỗi cú pháp (`ThemeSyntaxError`). Comment chỉ ghi chữ thường.
- **`search.terms` đã được mã hoá HTML** (`á` → `&#225;`): in thẳng, không `| escape` / `| url_encode` thêm.
  Cần chuỗi đã giải mã (câu lọc, JS) thì đọc từ thuộc tính `data-*` phía trình duyệt.
- **Setting dạng `<select>`:** chuỗi bất kỳ (kể cả `"full"`) là "đúng" trong `{% if %}`. Luôn so sánh giá trị
  (`== 'group'`). Đổi checkbox sang select thì vẫn nhận giá trị `true` cũ để không đổi hành vi của shop đang dùng.
- **`!important` trên bộ chọn toàn cục** (`*`, `html`…) đè mọi component (từng làm mất toàn bộ `box-shadow`).
  Chỉ dùng `!important` khi bắt buộc và ghi lý do ngay tại chỗ.
- **Cookie do thư viện ngoài cũng ghi** (ví dụ `googtrans` của Google Translate): không dùng làm nguồn lựa chọn
  của khách; lưu lựa chọn trong cookie riêng của theme (`fox_lang`).
- **Dữ liệu tải từ asset của theme / shop khác** (`//theme.hstatic.net/<id shop khác>/…`): file bị xoá là trang
  hỏng (từng làm trống ô Quận/Phường ở trang Địa chỉ). Dữ liệu tĩnh đặt trong `assets/` của theme, gọi bằng
  `asset_url`; tải lỗi thì ẩn phần phụ thuộc và không chặn người dùng.
- **Danh sách chữ gọi theo chỉ số** (`'Đăng nhập;Đăng ký;…' | split: ';'` rồi `{{ list[13] }}`): khó đọc, thêm / bớt
  một câu là lệch mọi chỉ số phía sau, và dễ bị gán sang tên khác rồi bỏ sót khi sửa. Viết thẳng chữ tại chỗ dùng
  (chữ merchant cần đổi thì đưa vào settings).
- **Kiểm thử bằng bản dựng lại phải nạp đủ CSS nền** (`utilities.min.css`, `style-global`): thiếu file nền thì kết
  quả test khác trên store.
