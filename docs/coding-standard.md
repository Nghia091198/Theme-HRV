# Coding Standard

## 1. Naming


## 1.1. Project Prefix

Prefix chuẩn của project là:

```text
fox
```

Áp dụng `fox` cho:

- File project-specific dùng tên tính năng không prefix; các identifier dưới đây dùng `fox`.
- CSS class và modifier.
- ID.
- Data attribute.
- Setting key.
- Local storage key.
- Custom event namespace riêng của theme nếu không thuộc component domain chung.
- Object key hoặc constant namespace không phải function.

Ví dụ:

```text
scroll-viewport.js
fox-home-slider
data-fox-module
recently_viewed
FOX_THEME_CONFIG
```

Function thuộc theme namespace hoặc function public bắt buộc dùng prefix chữ hoa `FOX`:

```js
function FOXInitTheme() {}
function FOXInitSlider() {}
function FOXRefreshCart() {}
```

Method nội bộ trong class/module không cần prefix:

```js
class CartDrawer {
  refresh() {}
  open() {}
  close() {}
}
```

Không tạo identifier mới dùng prefix cũ:

```text
tyt
TYT
Tyt
```

Quy tắc migration:

```text
tyt-home-slider.liquid → home-slider.liquid (tên file)
tyt-*        → fox-* (selector/identifier)
tyt_*       → (remove prefix, use contextual names)
TYT_*       → FOX_*
tytFunction → FOXFunction
```

Không đổi nội dung text thương hiệu do merchant nhập chỉ vì nó có chữ `TYT`.

### JavaScript

```text
ClassName
functionName
variableName
CONSTANT_NAME
#privateField
```

Custom element name phải có dấu gạch nối:

```text
slider-component
tabs-component
cart-drawer
product-form
```

Tên class nên mô tả behavior:

```text
SliderComponent
TabsComponent
CartDrawer
ProductForm
```

### File

```text
core-foundation-dom.js
core-component-slider.js
core-commerce-cart.js
media-progress.css
scroll-viewport.js
home.js
```

Feature behavior hoặc skin riêng của FOX dùng tên ngắn:

```text
{feature}.js
{feature}.css
```

`core-*` chỉ dành cho module brand-agnostic có mục tiêu tái sử dụng giữa nhiều
theme. Không tạo tên dài như `core-component-media-progress.css` cho feature
thuộc FOX. Snippet reusable tiếp tục dùng prefix `component-*`; snippet riêng
của theme, kể cả markup commerce, dùng tên tính năng không prefix.
Alternate template dùng tên view không prefix, ví dụ `product.quick-view.liquid`
cho `?view=quick-view`.

### Báo cáo file mới

Trước khi tạo file mới, phải report:

- Đường dẫn chính xác.
- Mục đích.
- Caller hoặc điểm load.
- File deploy lên Haravan hay chỉ dùng cho docs/tooling.

Nếu không tạo file mới, ghi rõ:

```text
Không tạo file mới.
```

Nếu phát sinh file ngoài danh sách, phải report bổ sung trước khi tạo. Khi bàn
giao, đối chiếu file dự kiến, file thực tế, file đã hủy và file phát sinh kèm lý
do.

### Event

```text
domain:action
```

Ví dụ:

```text
slider:ready
tabs:change
cart:updated
product:variant-change
```

### Data attribute

Dùng kebab-case:

```html
data-autoplay-delay="3000"
data-slides-mobile="1"
data-active-index="0"
```

---

## 2. JavaScript Style

### Early return

Ưu tiên:

```js
if (!element) return;
```

thay vì bọc toàn bộ function trong nhiều cấp `if`.

### Dependency guard

```js
if (typeof Swiper === 'undefined') {
  console.warn('[SliderComponent] Swiper is not available.');
  return;
}
```

### Listener cleanup

```js
this.abortController?.abort();
this.abortController = new AbortController();

button.addEventListener('click', this.handleClick, {
  signal: this.abortController.signal,
});
```

### Timer cleanup

Mọi `setTimeout`, `setInterval`, animation frame phải có reference và cleanup.

### Observer cleanup

Mọi `MutationObserver`, `ResizeObserver`, `IntersectionObserver` phải disconnect.

### Custom element guard

```js
if (!customElements.get('slider-component')) {
  customElements.define('slider-component', SliderComponent);
}
```

---

## 3. Component Skeleton

```js
class ExampleComponent extends HTMLElement {
  #abortController = null;
  #initialized = false;

  connectedCallback() {
    if (this.#initialized) return;

    this.#abortController = new AbortController();

    if (!this.#collectElements()) {
      this.dataset.state = 'error';
      return;
    }

    this.#bindEvents();
    this.#initialized = true;
    this.dataset.state = 'ready';

    this.dispatchEvent(new CustomEvent('example:ready', {
      bubbles: true,
      detail: {},
    }));
  }

  disconnectedCallback() {
    this.destroy();
  }

  refresh() {
    if (!this.#initialized) return;
  }

  destroy() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#initialized = false;
    this.dataset.state = 'idle';
  }

  #collectElements() {
    return true;
  }

  #bindEvents() {}
}
```

Skeleton là guideline, không ép component vô ích phải có mọi method.

---

## 4. Liquid Style

Tổ chức file:

```liquid
{%- capture setting_key -%}item_{{ index }}_title{%- endcapture -%}
{%- assign item_title = settings[setting_key] -%}

<h2>{{ settings.title | default: shop.name | escape }}</h2>
<p>{{ item_title | escape }}</p>
```

Không gom nhiều lệnh vào block `{% liquid %}`. Viết từng tag Liquid riêng để tương thích với dialect Haravan của repository.

Gọi trực tiếp `settings.*` trong markup khi giá trị chỉ được dùng 1 hoặc 2 lần để
xuất ra, kiểm tra `blank` hoặc áp dụng filter đơn giản như `default`, `strip`,
`escape`, `times`.

Khi cùng một `settings.*` được tham chiếu quá 2 lần trong một file, bắt buộc tạo
`assign` ở phần prepare data. Tên biến ngắn gọn phù hợp với ngữ cảnh component:

```liquid
{%- assign title = settings.banner_title -%}

{%- if title != blank -%}
  <h2 title="{{ title | strip | escape }}">
    {{ title | escape }}
  </h2>
{%- endif -%}
```

Không tạo biến trung gian chỉ để đổi tên một setting được dùng không quá 2 lần:

```liquid
{%- assign title = settings.title -%}
<h2>{{ title | escape }}</h2>
```

Việc này phải viết thành:

```liquid
<h2>{{ settings.title | escape }}</h2>
```

Chỉ dùng `assign` hoặc `capture` trước markup khi giá trị thật sự cần biến đổi,
chuẩn hóa qua nhiều nhánh, tạo dynamic key, hoặc biểu thức phức tạp được tái sử
dụng nhiều lần. Tránh lặp lại nhiều lần biểu thức `settings[setting_key]` phức tạp.

Trong snippet component-specific (ví dụ home-product-tabs.liquid), biến
local nên tối giản theo ngữ cảnh:

```liquid
{%- assign limit = settings.product_tabs_limit | default: 8 -%}
{%- assign count = 0 -%}
{%- assign buttons_html = '' -%}
```

Không:
```liquid
{%- assign product_tabs_limit = settings.product_tabs_limit -%}
{%- assign product_tabs_count = 0 -%}
{%- assign product_tabs_buttons_html = '' -%}
```

Khi item markup dài hoặc lặp, tách snippet.

Dùng whitespace control có chủ đích, không làm file khó đọc.

### Money formatting

Giá tiền hiển thị do Liquid render phải dùng filter `money`, kể cả giá được đưa
qua `data-*` để JavaScript cập nhật giao diện khi đổi variant:

```liquid
{{ variant.price | money }}
```

Không dùng `money_without_currency` và không nối ký hiệu/đơn vị tiền tệ trực tiếp
vào giá bằng text như `₫`, `đ` hoặc `VND`. Để định dạng tiền của Haravan quyết
định vị trí và cách hiển thị tiền tệ.

### Include

Giữ tương thích syntax mà repository hiện dùng.

Snippet phải gọi bằng `{% include %}` theo syntax hiện có của repository.

Không dùng các tag Shopify Liquid sau trong theme Haravan này:

```text
{% liquid %}
{% echo %}
{% render %}
{% schema %}
```

Không tự động đổi `{% include %}` sang `{% render %}`.

### Text

Text từ merchant/user cần escape khi không chủ đích render HTML.

Rich-text setting chỉ render raw khi setting được thiết kế để chứa HTML.

### Empty value

Luôn kiểm tra:

```liquid
{% if value != blank %}
```

trước khi render block tùy chọn.

---

## 5. HTML Style

Dùng semantic tag.

Không dùng custom tag chỉ để styling nếu element đó không có behavior hoặc meaning.

Custom element hợp lệ khi có lifecycle JavaScript riêng.

Behavior hook:

```html
data-action="close"
data-role="panel"
```

Styling hook:

```html
class="drawer__panel"
```

Không dùng class styling làm API behavior nếu có thể tránh.

---

## 6. CSS Style

### Đơn vị kích thước

`FOX Fashion/assets/style-global.scss.liquid` đặt `html { font-size: 62.5%; }`.
Với root mặc định của browser là 16px, `1rem` trong theme bằng 10px
(`1.6rem = 16px`, `2.4rem = 24px`). Không sao chép giá trị `rem` từ
design system giả định `1rem = 16px` mà không quy đổi.

Với button/control cần chữ 16px, dùng `font-size: 16px` hoặc `1.6rem`.
Có thể dùng `em` cho padding, khoảng cách và icon để chúng tăng theo cỡ chữ
của control. Khi sửa UI, kiểm tra computed font size và kích thước thực tế ở
mobile/desktop; không chỉ đọc giá trị `rem` trong source.

### Layout Container

Theme dùng **chỉ 2 class container**:

- **`.container`** — boxed layout với max-width 1400px, padding responsive (định nghĩa trong `utilities.min.css`)
- **`.container-fluid`** — full-width layout

**Không** tạo CSS container riêng cho từng section như `__inner`, `__wrapper` với max-width và padding riêng.

**Ngoại lệ:** Scroll-driven sections có cấu trúc animation đặc biệt (`__inner` là animation stage, không phải container):
- `fox-home-countdown`
- `fox-media-banner`
- `fox-scroll-media-text`

### Shared Typography

Sử dụng shared classes cho section header typography (định nghĩa trong `section.css`):

- **`.fox-section__title`** — section heading
- **`.fox-section__subtitle`** — optional subheading
- **`.fox-section__desc`** — section description

Section-specific CSS override token theo nhu cầu:

```css
.fox-product-tabs {
  --fox-section-title-size: 2rem;
  --fox-section-title-weight: 600;
  --fox-section-desc-size: 0.9375rem;
}

@media (min-width: 768px) {
  .fox-product-tabs {
    --fox-section-title-size: 2.5rem;
  }
}
```

**Không áp dụng** shared classes cho:
- Card-level titles (product card, policy item, footer newsletter)
- Section không có header layout chuẩn (cần scoped margin rule riêng)

### Token

```css
:root {
  --core-space-1: 0.25rem;
  --core-space-2: 0.5rem;
  --core-duration-fast: 150ms;
}
```

Theme override bằng custom properties.

### Component scope

```css
slider-component {
  display: block;
}

slider-component [data-role="navigation"] {
  ...
}
```

Không dùng selector global chung như:

```css
.active { ... }
.hidden { ... }
```

nếu state chỉ thuộc component.

### State

```css
slider-component[data-state="loading"] { ... }
slider-component[data-state="ready"] { ... }
```

### Motion

```css
@media (prefers-reduced-motion: reduce) {
  ...
}
```

---

## 7. Error Handling

Error có thể recover:

- Set component state.
- Dispatch event error nếu caller cần.
- Log warning có namespace.
- Không crash toàn trang.

Ví dụ:

```js
console.warn('[CartDrawer] Missing required cart container.');
```

Không log object chứa dữ liệu nhạy cảm.

---

## 8. Public API

Chỉ expose method mà caller thực sự cần.

Ví dụ slider:

```text
next()
previous()
goTo(index)
play()
pause()
refresh()
destroy()
```

Không để caller truy cập field private hoặc internal Swiper option.

Có thể expose read-only getter:

```text
activeIndex
itemCount
isPlaying
```

---

## 9. Documentation Requirement

Component mới cần tài liệu ngắn gồm:

- Mục đích.
- Markup contract.
- Data attributes.
- Events.
- Public API.
- Empty/single behavior.
- Dependencies.
- Ví dụ usage.

Tài liệu có thể đặt trong `docs/component-library.md` nếu component nhỏ.
