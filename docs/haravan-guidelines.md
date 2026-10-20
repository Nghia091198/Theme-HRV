# Haravan Guidelines

## 1. Cấu trúc bắt buộc

Theme deploy:

```text
Theme/
├── assets/
├── config/
├── layout/
├── locales/
├── snippets/
└── templates/
```

Không dùng `sections/`.

Các module trang chủ trong source hiện tại được compose qua `templates/index.liquid` và snippets như:

```text
home-slider.liquid
home-category.liquid
topbar.liquid
header.liquid
footer.liquid
```

---

## 2. File có Liquid trong assets

Repository hiện có dạng:

```text
header-script.js.liquid
script-global.js.liquid
script-index.js.liquid
style-global.scss.liquid
```

Chỉ dùng `.js.liquid` hoặc `.scss.liquid` khi asset thật sự cần Liquid data.

Ưu tiên truyền config bằng HTML hoặc JSON payload để JavaScript core vẫn là file `.js` thuần và tái sử dụng được.

### 2.1. Dialect Liquid được hỗ trợ

Theme này dùng cú pháp Liquid Haravan hiện có trong repository, không dùng dialect Shopify Online Store 2.0.

Các tag được phép gồm:

```text
assign
capture / endcapture
if / elsif / else / endif
case / when / endcase
for / endfor
unless / endunless
include
comment / endcomment
paginate / endpaginate
form / endform
cycle
layout
```

Không dùng:

```text
{% liquid %}
{% echo %}
{% render %}
{% schema %}
```

Khi cần tạo key setting động, dùng `capture`:

```liquid
{%- capture setting_key -%}slide_{{ index }}_title{%- endcapture -%}
{%- assign title = settings[setting_key] -%}
```

Không dùng `echo` để nối key. Không dùng `render` thay cho `include`. Không đặt `schema` trong snippet.

---

## 3. Settings

Settings nằm trong:

```text
Theme/config/settings.html
Theme/config/settings_schema.json
Theme/config/settings_data.json
```

Khi thêm setting:

1. Giữ naming convention.
2. Kiểm tra default.
3. Kiểm tra setting rỗng.
4. Không đổi ID setting hiện có nếu sẽ làm mất dữ liệu merchant.
5. Migration tên setting cần backward compatibility khi có thể.

Naming mới:

```text
feature_context_property
```

Ví dụ:

```text
hero_slide_01_enabled
hero_slide_01_media_type
hero_slide_01_image_desktop
hero_slide_01_image_mobile
hero_slide_01_video_url
hero_slide_01_heading
hero_slide_01_description
hero_slide_01_button_label
hero_slide_01_button_url
```

Không tạo thêm tên kiểu không thống nhất:

```text
btnlink
btnurl
d_image
m_image
```

---


## 3.1. FOX Prefix

Các identifier riêng của theme dùng prefix `fox`.

```text
fox_* cho setting hoặc key
data-fox-* cho data attribute
fox-* cho class/ID riêng của FOX
tên tính năng không prefix cho file riêng của theme
FOX* cho function public
```

Không tạo key hoặc selector mới dùng `tyt`/`TYT`.

## 4. Templates

Haravan alternate template trong source có naming như:

```text
collection.data.liquid
collection.home-collection-tab.liquid
collection.product-tab.liquid
product.quick-view.liquid
product.lookbook-card.liquid
search.article-json.liquid
customers[login].liquid
```

Không đổi naming template theo giả định Shopify nếu chưa kiểm tra Haravan routing.

Khi tạo alternate template, bám pattern repository hiện tại.
Tên sau dấu chấm là giá trị `view` trong URL, ví dụ
`product.quick-view.liquid` phục vụ `?view=quick-view`. View riêng của theme
dùng tên tính năng không prefix.

---

## 5. Snippets

Snippet là đơn vị composition chính.

Snippet nên:

- Có mục đích rõ.
- Nhận input nhỏ.
- Không mutate global.
- Không đăng ký JavaScript component.
- Không chứa API request.
- Không duplicate markup lớn.

Ví dụ phân nhóm bằng prefix:

```text
core-responsive-image.liquid
component-slider-controls.liquid
product-card.liquid
home-slider.liquid
icon-arrow-right.liquid
```

---

## 6. Script Loading

Kiểm tra các điểm load hiện tại:

```text
Theme/layout/theme.liquid
Theme/snippets/footer-scripts.liquid
Theme/snippets/plugins-js.liquid
Theme/snippets/shop-optimize.liquid
Theme/assets/header-script.js.liquid
```

Không thêm script mới trước khi xác định:

- Dependency.
- Có cần mọi page không.
- Có cần `defer` không.
- Có phụ thuộc thứ tự không.
- Có bị load trùng không.

Không kết hợp `async` với script phụ thuộc thứ tự.

---

## 7. Haravan Global Objects

Global object có thể tồn tại:

```text
Haravan
window.main
```

Không mở rộng global tùy ý.

Nếu cần config mới, gom vào namespace rõ ràng thay vì nhiều global rời rạc.

Không overwrite property hiện có nếu không thuộc phạm vi task.

---

## 8. Commerce API

Mọi request cart/product/search cần bám endpoint và response thực tế đang dùng trong source.

Trước khi refactor API:

1. Tìm implementation hiện tại.
2. Tìm caller.
3. Xác định response shape.
4. Xác định error behavior.
5. Giữ compatibility.

Các file hiện tại cần audit:

```text
Theme/assets/cart-api.js
Theme/assets/add-to-cart.js
Theme/assets/cart-drawer.js
Theme/assets/search-drawer.js
Theme/assets/scroll-viewport.js
Theme/assets/script-global.js.liquid
```

Không đoán endpoint hoặc response Haravan.

---

## 9. Images

Helper ảnh Liquid dùng chung:

```text
Theme/snippets/render-img.liquid
```

Khi tạo hoặc sửa markup ảnh, dùng `{% include 'render-img' %}` thay vì
viết trực tiếp `<img>` trong caller. Truyền tên file asset gốc; helper tự
áp `asset_url`. Chỉ include khi `src != blank`. Với URL ảnh từ object
Haravan, kiểm tra contract của helper trước khi truyền vì helper hiện áp
`asset_url` lên `src`. Xem `docs/image-guide.md` cho alt, kích thước
và lazy loading.

Image rule:

- Có width/height khi có thể.
- Alt text có nghĩa.
- Hero đầu eager.
- Ảnh sau lazy.
- Mobile source khi thiết kế cần.
- Không dùng background image cho content image nếu làm mất semantics/SEO.

---

## 10. Locales

Text UI tái sử dụng nên dùng locale khi phù hợp.

Không hard-code text lặp lại như:

```text
Đóng
Tạm dừng
Phát
Thêm vào giỏ
```

nếu component được dùng nhiều theme/ngôn ngữ.

Khi thêm key:

- Cập nhật locale mặc định.
- Dùng key namespace rõ ràng.
- Không xóa key cũ nếu còn caller.

---

## 11. Haravan CLI Local File

File:

```text
Theme/.haravan-cli_local.json
```

có thể chứa cấu hình môi trường local.

Không commit secret.

Không chỉnh file này nếu task không yêu cầu.
