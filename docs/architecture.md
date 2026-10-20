# Architecture — Haravan Theme Core

## 1. Mục tiêu kiến trúc

Kiến trúc đích:

```text
Haravan settings và objects
        ↓
Liquid templates/snippets render HTML
        ↓
Core markup contracts
        ↓
Reusable Web Components
        ↓
Commerce services / Haravan APIs
        ↓
Theme-specific CSS skin
```

Các lớp phải có ranh giới rõ ràng:

```text
Foundation
UI Components
Commerce Components
Theme Implementation
```

---

## 2. Cấu trúc deploy Haravan

Trong repository hiện tại, theme deploy nằm trong `Theme/`:

```text
Theme/
├── assets/
├── config/
├── layout/
├── locales/
├── snippets/
└── templates/
```

### `Theme/assets/`

Chứa:

- JavaScript.
- CSS/SCSS.
- Image.
- Font asset nếu có.
- Asset Liquid do Haravan hỗ trợ, ví dụ `.js.liquid`, `.scss.liquid`.
- Vendor library.

### `Theme/config/`

Chứa:

```text
settings.html
settings_schema.json
settings_data.json
```

### `Theme/layout/`

Chứa layout gốc, hiện tại là:

```text
theme.liquid
```

### `Theme/locales/`

Chứa translation JSON.

### `Theme/snippets/`

Chứa:

- Header/footer fragments.
- Product item.
- Slider markup.
- Navigation.
- Shared render helper.
- Component markup.
- Page composition fragments.

### `Theme/templates/`

Chứa template theo page type và alternate template naming của Haravan.

Không tạo `Theme/sections/`.

---

## 3. Kiến trúc source đề xuất

Vì Haravan deploy dùng cấu trúc phẳng, module dùng chung mang prefix `core-*`;
file riêng của giao diện dùng tên tính năng không prefix.

```text
Theme/assets/
├── core-foundation-dom.js
├── core-foundation-events.js
├── core-foundation-focus.js
├── core-component-slider.js
├── core-component-tabs.js
├── core-component-drawer.js
├── core-component-modal.js
├── core-commerce-cart.js
├── core-commerce-product-form.js
├── core-commerce-search.js
├── core-foundation.css
├── core-component-slider.css
├── core-component-tabs.css
├── core-component-drawer.css
├── core-commerce-cart.css
├── section.css
├── media-progress.css
├── global.css
├── home.css
└── vendor-swiper.js
```

```text
Theme/snippets/
├── core-responsive-image.liquid
├── core-json-data.liquid
├── component-slider.liquid
├── component-slider-controls.liquid
├── component-tabs.liquid
├── component-drawer.liquid
├── product-card.liquid
├── cart-item.liquid
├── home-slider.liquid
└── icon-*.liquid
```

Prefix là convention tổ chức logic, không phải subfolder.

Feature behavior hoặc skin riêng của FOX dùng tên tính năng không prefix, ví dụ
`scroll-viewport.js` và `media-progress.css`. Prefix `core-*` chỉ dành cho module
brand-agnostic được thiết kế để tái sử dụng giữa nhiều theme.

Trước khi bổ sung một node mới vào kiến trúc deploy, task phải report đường dẫn,
trách nhiệm, caller/load point và phạm vi deploy. Bàn giao phải đối chiếu node dự
kiến với file thực tế đã tạo.

### 3.1. Layout Container Convention

Theme dùng **chỉ 2 class container**:

- **`.container`** — boxed layout với max-width 1400px, padding responsive
- **`.container-fluid`** — full-width layout

**Không** tạo CSS container riêng cho từng section (ví dụ `__inner`, `__wrapper`).

Mọi section áp dụng một trong hai class trên trực tiếp.

**Ngoại lệ:** Scroll-driven sections có cấu trúc animation đặc biệt (`__inner` là stage, không phải container) — giữ nguyên implementation hiện tại:
- `fox-home-countdown`
- `fox-media-banner`
- `fox-scroll-media-text`

### 3.2. Shared Typography Convention

Shared typography classes trong `section.css` dùng cho title và description của section header:

- **`.fox-section__title`** — section heading
- **`.fox-section__subtitle`** — optional subheading
- **`.fox-section__desc`** — section description

Mỗi class style qua CSS custom properties (tokens):

```css
.fox-section__title {
  font-size: var(--fox-section-title-size, 2rem);
  font-weight: var(--fox-section-title-weight, 600);
  letter-spacing: var(--fox-section-title-spacing, normal);
  line-height: var(--fox-section-title-leading, 1.2);
  color: var(--fox-section-title-color, inherit);
  font-family: var(--fox-section-title-font, var(--base-font-title));
}
```

Section-specific CSS override tokens theo nhu cầu:

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

**Quy tắc áp dụng:**
- Section header chung dùng shared classes
- Card-level title/description không dùng shared classes (ví dụ: policy card item, product card, footer newsletter)
- Section không có header chuẩn (không layout flex `.fox-section__header`) cần scoped margin rule nếu desc cần khoảng cách trên

---

## 3.3. Project Prefix

Project-specific namespace dùng `fox`.

```text
tên tính năng không prefix cho file riêng của theme
fox-* cho class, ID và data attribute riêng của FOX
FOX* cho function public hoặc function thuộc theme namespace
```

Ví dụ:

```text
home-slider.liquid
global.js
.fox-header
data-fox-component
FOXInitTheme()
FOXRegisterComponents()
```

Prefix cũ `tyt`/`TYT` không được dùng trong code mới.

## 4. Layer 1 — Foundation

Foundation không biết page hoặc business UI cụ thể.

Phạm vi:

- DOM utilities.
- Event helpers.
- Focus management.
- Scroll lock.
- Breakpoints.
- Money formatting adapter.
- Route/config adapter.
- Fetch wrapper.
- Base component utilities.
- Accessibility helpers.

Foundation không phụ thuộc slider, cart hoặc product form.

---

## 5. Layer 2 — UI Components

UI component quản lý behavior dùng chung:

```text
slider
tabs
accordion
drawer
modal
disclosure
quantity-input
media
countdown
sticky
```

Component không biết:

- Nó đang ở homepage hay product page.
- Màu thương hiệu.
- Product object cụ thể.
- Cart API cụ thể, trừ commerce component.

Ví dụ `slider` chỉ quản lý engine và lifecycle.

Hero, product carousel và logo carousel cùng dùng slider core.

---

## 6. Layer 3 — Commerce Components

Commerce component hiểu domain bán hàng:

```text
product-card
product-form
variant-selector
cart-drawer
cart-items
search-drawer
collection-filter
quick-view
recently-viewed
```

Commerce component có thể compose UI component:

```text
cart-drawer
    → drawer

product-gallery
    → slider

product-information
    → tabs / accordion
```

API request phải đi qua service/adapter chung.

---

## 7. Layer 4 — Theme Implementation

Theme implementation gồm:

- Snippet composition.
- Page-specific markup.
- CSS skin.
- Settings mapping.
- Content position.
- Branding animation.
- Template-specific orchestration.

Theme không được sao chép engine core chỉ để thay đổi visual.

Nếu visual khác, dùng:

- CSS custom properties.
- Modifier class.
- Preset.
- Extension.
- Theme-specific wrapper.

---

## 8. Asset Loading

Thứ tự logic:

```text
Vendor dependency
        ↓
Foundation
        ↓
Core components
        ↓
Commerce components
        ↓
Theme/page scripts
```

Custom element registration phải nằm trong asset JavaScript, không nằm trong snippet.

Không dùng `async` cho các script có dependency thứ tự.

Dùng `defer` khi script cần DOM và phải giữ execution order.

Page-specific asset chỉ load ở page cần nó khi có thể.

---

## 9. Slider Reference Architecture

Slider được dùng làm reference architecture đầu tiên.

```text
Liquid slider markup
        ↓
Slider core custom element
        ↓
Swiper adapter
        ↓
Optional extensions
```

### Slider core

Quản lý:

- Swiper initialization.
- Breakpoints.
- Navigation.
- Pagination.
- Autoplay.
- State.
- Public API.
- Events.
- Cleanup.

### Slider extensions

Quản lý:

- Progress ring.
- YouTube lifecycle.
- MP4 lifecycle.
- Content reveal.
- Thumbnail sync.
- Slide counter.

### Hero theme layer

Quản lý:

- Heading/description/button.
- Media source.
- Content alignment.
- Theme styling.
- Settings mapping.

---

## 10. Data Flow

Dữ liệu ưu tiên theo luồng:

```text
Haravan object/settings
        ↓
Liquid normalization
        ↓
Semantic HTML
        ↓
data-* hoặc JSON payload
        ↓
JavaScript component
```

Dùng `data-*` cho scalar nhỏ.

Dùng JSON script cho object hoặc array.

Không để file JavaScript thuần chứa Liquid expression.

---

## 11. State Management

Không cần global state framework cho theme core.

State local nằm trong component.

State chia sẻ qua:

- DOM attributes.
- Custom events.
- Commerce service.
- Một namespace config nhỏ nếu cần.

Ví dụ cart:

```text
Cart service nhận request
        ↓
Phát cart:updating
        ↓
Cập nhật response chuẩn hóa
        ↓
Phát cart:updated
        ↓
Cart icon, drawer và cart page đồng bộ
```

---

## 12. Compatibility Strategy

Trong giai đoạn migration:

- Giữ legacy code chạy.
- Không tạo usage legacy mới.
- Có compatibility event nếu caller cũ còn dùng.
- Tách từng component, không big-bang rewrite.
- Xóa legacy sau dependency audit.

Các target legacy quan trọng:

```text
Theme/assets/components.js
.js-swiper-slider
shop-optimize.liquid mainSlider HTML injection
inline customElements.define(...)
direct new Swiper(...)
```

---

## 13. Architecture Decision Rules

Khi phân vân đặt logic ở đâu:

### Đặt trong Liquid khi:

- Render content.
- Lặp product/slide/menu.
- Đọc settings.
- Tạo URL.
- Tạo alt text.
- Chọn class/preset ban đầu.

### Đặt trong core component khi:

- Quản lý interaction.
- Quản lý lifecycle.
- Quản lý focus.
- Quản lý state UI.
- Bọc third-party library.

### Đặt trong commerce service khi:

- Gọi cart API.
- Gọi search API.
- Chuẩn hóa response.
- Quản lý request concurrency.

### Đặt trong theme CSS/JS khi:

- Behavior hoặc visual chỉ thuộc một thiết kế.
- Không có use case tái sử dụng hợp lý.
