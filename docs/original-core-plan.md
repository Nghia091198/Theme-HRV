# Kế hoạch xây dựng bộ Source Core Theme Haravan


> **Quy ước prefix đã cập nhật:** dùng `fox` cho file, selector, ID, data attribute và setting; dùng `FOX` cho function public/theme namespace. Không tạo mới prefix `tyt`/`TYT`.


## 1. Mục tiêu

Xây dựng một bộ source core có thể tái sử dụng để phát triển nhiều theme Haravan khác nhau.

Core không nên là một theme hoàn chỉnh có giao diện cố định. Core nên cung cấp:

- Nền tảng Liquid.
- Bộ UI component dùng lại.
- JavaScript behavior dùng chung.
- CSS foundation.
- Quy chuẩn cấu trúc source.
- Quy chuẩn naming.
- Quy trình build và phát triển theme.

Khi làm một theme mới, developer chủ yếu tập trung vào:

- Branding.
- Layout.
- CSS giao diện.
- Section riêng.
- Cấu hình merchant.
- Một số behavior đặc thù.

Không cần làm lại các phần nền tảng như:

- Slider.
- Tabs.
- Drawer.
- Modal.
- Add to cart.
- Cart API.
- Product card behavior.
- Responsive image.
- Accordion.
- Lazy loading.
- Accessibility cơ bản.
- Component lifecycle.

---

## 2. Đánh giá cấu trúc hiện tại

Source hiện tại đang đi theo hướng:

```text
Liquid / HTML
    ↓
Custom Element
    ↓
Component JavaScript
    ↓
Thư viện ngoài như Swiper
```

Ví dụ slider:

```text
home-slider.liquid
    ↓
<swiper-component>
    ↓
SwiperComponent trong components.js
    ↓
Swiper.js
```

Điểm tốt là Liquid không trực tiếp gọi:

```js
new Swiper(...)
```

Thay vào đó, cấu hình slider được khai báo bằng HTML:

```html
<swiper-component
  data-items="1"
  data-loop="true"
  data-autoplay="true"
>
```

Cách này phù hợp để phát triển thành một core component tái sử dụng.

---

## 3. Luồng slider hiện tại

### 3.1. Liquid render slide đầu tiên

Trong `home-slider.liquid`, slide đầu tiên được render trực tiếp.

Mục đích:

- Hiển thị nội dung ngay khi tải trang.
- Cải thiện Largest Contentful Paint.
- Ảnh đầu tiên dùng `loading="eager"`.
- Không cần chờ JavaScript mới thấy banner.

Đây là hướng xử lý hợp lý.

### 3.2. JavaScript chèn các slide còn lại

Trong `shop-optimize.liquid`, hàm `mainSlider()`:

- Tìm `heroslider swiper-component`.
- Tạo chuỗi HTML cho slide 2 đến slide 5.
- Chèn navigation.
- Chèn `slide-progress`.
- Sau đó mới đăng ký custom element.

Luồng hiện tại:

```text
Slide 1 render server-side
        ↓
DOMContentLoaded
        ↓
JavaScript chèn slide 2–5
        ↓
Đăng ký swiper-component
        ↓
connectedCallback()
        ↓
new Swiper()
```

### 3.3. Component quản lý hành vi

`SwiperComponent` đang chịu trách nhiệm:

- Khởi tạo Swiper.
- Đọc cấu hình từ `data-*`.
- Tạo responsive breakpoint.
- Autoplay.
- Navigation.
- Pagination.
- Destroy khi component bị remove.
- Re-init khi attribute thay đổi.
- Dispatch event `swiper-ready`.
- Xử lý trường hợp chỉ có một slide.
- Xử lý iframe YouTube bị clone khi loop.

Đây là nền móng tốt để phát triển thành slider core.

---

## 4. Các vấn đề hiện tại

### 4.1. `components.js` đang trở thành monolith

Hiện tại `components.js` chứa nhiều loại logic:

- Button effect.
- Tabs.
- Slider.
- Slide content reveal.
- Expand description.
- Countdown.
- Cursor effect.
- Các component khác.

Về lâu dài sẽ có các vấn đề:

- Khó tìm component.
- Khó kiểm soát dependency.
- Một lỗi syntax có thể làm toàn bộ component ngừng chạy.
- Trang chỉ dùng tabs vẫn phải tải code slider, countdown, cursor.
- Khó copy riêng một component sang theme khác.
- Khó version và test từng component.

Trong core mới, `components.js` chỉ nên là entry point hoặc nơi đăng ký component.

### 4.2. Có hai hệ thống slider song song

Hiện tại có ít nhất hai cách dùng slider.

Cách mới:

```html
<swiper-component>
```

Cách cũ:

```html
<div class="swiper js-swiper-slider" data-items="1">
```

Điều này dẫn đến:

- Hai nơi khởi tạo slider.
- Hai chuẩn data attribute.
- Hai cách xử lý navigation.
- Khó bảo trì.
- Người dựng theme không biết nên dùng chuẩn nào.
- Fix bug phải sửa ở nhiều nơi.

Core mới nên chọn một chuẩn duy nhất, ưu tiên `swiper-component`.

### 4.3. Markup slider bị chia ở nhiều file

Markup slide hiện nằm một phần trong:

```text
home-slider.liquid
```

và một phần được dựng thành chuỗi JavaScript trong:

```text
shop-optimize.liquid
```

Hậu quả:

- Markup bị lặp.
- Sửa HTML slide phải sửa nhiều nơi.
- Dễ lệch cấu trúc slide đầu và các slide sau.
- Khó đọc.
- Khó debug.
- Dễ lỗi dấu nháy khi nội dung setting chứa ký tự đặc biệt.
- JavaScript đang làm công việc đáng lẽ Liquid nên đảm nhận.

Core nên render toàn bộ slide bằng Liquid.

### 4.4. Registration phụ thuộc timing

`shop-optimize.liquid` đăng ký:

```js
customElements.define('swiper-component', SwiperComponent);
```

Trong khi class `SwiperComponent` nằm trong `components.js`.

Khi kết hợp `defer`, `async defer` hoặc thứ tự script khác nhau, có nguy cơ:

- File đăng ký chạy trước khi class tồn tại.
- Component chưa được define.
- Custom element upgrade trễ.
- Logic chèn slide phụ thuộc logic init.

Core cần một bootstrap rõ ràng.

### 4.5. Breakpoint bị hard-code

Breakpoint hiện tại:

```text
0
768
992
```

Core dùng cho nhiều theme cần hỗ trợ:

- Breakpoint mặc định.
- Override theo theme.
- Desktop lớn.
- Quy chuẩn breakpoint thống nhất.

### 4.6. `data-speed` dễ gây nhầm

Hiện tại:

- `speed` của Swiper là thời gian animation.
- `data-speed` lại được dùng làm autoplay delay.

Nên tách thành hai khái niệm rõ ràng:

```text
transition duration
autoplay delay
```

### 4.7. Single slide cần contract rõ ràng

Khi slider chỉ có một slide, cần thống nhất:

- Có giữ trạng thái initialized không.
- Navigation có bị ẩn không.
- Pagination có bị ẩn không.
- Video có autoplay không.
- Event nào báo component sẵn sàng.
- Instance slider có tồn tại không.

Không nên để component phụ phải xử lý quá nhiều trường hợp riêng.

---

## 5. Kiến trúc core đề xuất

### 5.1. Foundation layer

```text
core/
├── foundation/
│   ├── breakpoints
│   ├── design-tokens
│   ├── accessibility
│   ├── dom-utils
│   ├── events
│   ├── lifecycle
│   └── haravan-adapter
```

Chức năng:

- Quy chuẩn breakpoint.
- CSS variables.
- DOM helper.
- Event bus.
- Component lifecycle.
- Format money.
- Haravan Ajax API adapter.
- Route URL helper.
- Section ID helper.
- Focus trap.
- Scroll lock.

### 5.2. Primitive components

```text
components/
├── tabs
├── accordion
├── modal
├── drawer
├── slider
├── media
├── countdown
├── disclosure
├── sticky
├── quantity-input
└── button-effect
```

Đặc điểm:

- Không phụ thuộc template cụ thể.
- Không biết đang nằm ở trang chủ hay trang sản phẩm.
- Có public API rõ ràng.
- Có event rõ ràng.
- Tự cleanup.
- Hoạt động khi DOM được render lại.

### 5.3. Commerce components

```text
commerce/
├── product-card
├── product-form
├── variant-selector
├── cart-drawer
├── cart-items
├── mini-cart
├── predictive-search
├── collection-filter
├── recently-viewed
└── quick-view
```

Ví dụ:

```text
cart-drawer
    dùng drawer component

product-gallery
    dùng slider component

product-tabs
    dùng tabs component
```

### 5.4. Theme sections

```text
sections/
├── hero-slider
├── featured-collection
├── category-banner
├── image-with-text
├── testimonials
├── blog-posts
└── newsletter
```

Section chỉ nên chịu trách nhiệm:

- Liquid data.
- HTML structure.
- Section settings.
- CSS giao diện.
- Kết nối với core component.

Không nên chứa logic JavaScript phức tạp.

---

## 6. Cấu trúc thư mục đề xuất đúng với Haravan Theme

Haravan theme trong source hiện tại sử dụng cấu trúc deploy thực tế sau:

```text
Theme/
├── assets/
├── config/
├── layout/
├── locales/
├── snippets/
└── templates/
```

Haravan không sử dụng thư mục `sections/` theo cấu trúc Shopify Online Store 2.0. Vì vậy, các khối giao diện như hero slider, featured collection, category banner hoặc image-with-text cần được tổ chức bằng `snippets/`, sau đó được gọi từ `templates/` hoặc `layout/theme.liquid`.

### 6.1. Cấu trúc thư mục được upload lên Haravan

```text
Theme/
├── assets/
│   ├── core-foundation.css
│   ├── core-components.css
│   ├── core-components.js
│   ├── core-commerce.js
│   ├── component-slider.css
│   ├── component-slider.js
│   ├── component-tabs.css
│   ├── component-tabs.js
│   ├── component-drawer.css
│   ├── component-drawer.js
│   ├── section-hero-slider.css
│   ├── section-featured-collection.css
│   ├── global.css
│   ├── index.css
│   ├── product.css
│   ├── collection.css
│   └── vendor-swiper.js
│
├── config/
│   ├── settings.html
│   ├── settings_schema.json
│   └── settings_data.json
│
├── layout/
│   └── theme.liquid
│
├── locales/
│   ├── vi.default.json
│   └── vi.json
│
├── snippets/
│   ├── core-component-slider.liquid
│   ├── core-slider-controls.liquid
│   ├── core-responsive-image.liquid
│   ├── core-button.liquid
│   ├── core-icon.liquid
│   ├── section-hero-slider.liquid
│   ├── section-featured-collection.liquid
│   ├── section-image-with-text.liquid
│   ├── product-card.liquid
│   ├── product-form.liquid
│   ├── cart-drawer.liquid
│   ├── header.liquid
│   ├── footer.liquid
│   └── footer-scripts.liquid
│
└── templates/
    ├── index.liquid
    ├── product.liquid
    ├── collection.liquid
    ├── cart.liquid
    ├── search.liquid
    ├── page.liquid
    ├── blog.liquid
    ├── article.liquid
    ├── 404.liquid
    └── customers[...].liquid
```

Đây là thư mục cuối cùng được đồng bộ hoặc upload lên Haravan.

### 6.2. Vai trò của từng thư mục

#### `assets/`

Chứa toàn bộ tài nguyên tĩnh và file được trình duyệt tải trực tiếp:

- JavaScript.
- CSS, SCSS hoặc file `.liquid` sinh CSS/JS.
- Hình ảnh mặc định.
- Font của theme nếu được phép phân phối.
- Thư viện bên thứ ba.

Do Haravan không hỗ trợ module folder lồng nhau theo cách source development thông thường, tên file nên có prefix rõ ràng:

```text
core-
component-
commerce-
section-
theme-
vendor-
```

Ví dụ:

```text
component-slider.js
component-slider.css
cart-drawer.js
section-hero-slider.css
product.css
vendor-swiper.js
```

#### `config/`

Chứa cấu hình theme editor và dữ liệu setting:

```text
settings.html
settings_schema.json
settings_data.json
```

Mọi setting dành cho hero slider, header, footer, màu sắc, typography và các module trang chủ phải tuân theo naming convention thống nhất.

#### `layout/`

Chứa layout gốc của theme:

```text
theme.liquid
```

`theme.liquid` chịu trách nhiệm:

- Khai báo cấu trúc HTML tổng.
- Render phần `<head>`.
- Gọi header và footer.
- Nạp CSS/JavaScript dùng chung.
- Render `{{ content_for_layout }}`.

Không nên đặt logic riêng của hero slider, product card hoặc cart trong layout.

#### `locales/`

Chứa nội dung đa ngôn ngữ:

```text
vi.default.json
vi.json
```

Text hiển thị trong component core nên ưu tiên lấy từ locale thay vì viết cứng trong Liquid hoặc JavaScript.

#### `snippets/`

Đây là thư mục quan trọng nhất để thay thế vai trò của `sections/` trong kiến trúc đề xuất trước đó.

Có thể phân loại bằng prefix tên file:

```text
core-*       Thành phần nền tảng dùng chung
section-*    Khối giao diện lớn được template gọi
product-*    Thành phần liên quan sản phẩm
cart-*       Thành phần liên quan giỏ hàng
header-*     Thành phần thuộc header
footer-*     Thành phần thuộc footer
```

Ví dụ:

```text
section-hero-slider.liquid
section-featured-collection.liquid
core-component-slider.liquid
core-responsive-image.liquid
product-card.liquid
cart-drawer.liquid
```

Haravan không bắt buộc prefix này, nhưng prefix giúp mô phỏng phân lớp khi tất cả snippet nằm chung một thư mục.

#### `templates/`

Chứa template của từng loại trang:

```text
index.liquid
product.liquid
collection.liquid
cart.liquid
page.liquid
blog.liquid
article.liquid
search.liquid
404.liquid
customers[...].liquid
```

Template chỉ nên:

- Chuẩn bị dữ liệu cấp trang.
- Gọi các snippet lớn.
- Sắp xếp thứ tự module.
- Khai báo một lượng nhỏ markup đặc thù của trang.

Ví dụ `templates/index.liquid` có thể gọi:

```liquid
{% include 'section-hero-slider' %}
{% include 'section-featured-collection' %}
{% include 'section-image-with-text' %}
```

### 6.3. Workspace phát triển nằm ngoài thư mục `Theme`

Để source dễ bảo trì, có thể giữ mã nguồn module hóa bên ngoài thư mục deploy:

```text
project-root/
├── Theme/                         # Thư mục đúng chuẩn Haravan để upload
│   ├── assets/
│   ├── config/
│   ├── layout/
│   ├── locales/
│   ├── snippets/
│   └── templates/
│
├── src/                           # Source development, không upload trực tiếp
│   ├── javascript/
│   │   ├── foundation/
│   │   ├── components/
│   │   ├── commerce/
│   │   └── entries/
│   ├── styles/
│   │   ├── foundation/
│   │   ├── components/
│   │   ├── sections/
│   │   └── templates/
│   └── docs/
│
├── scripts/                       # Build, copy hoặc kiểm tra source
├── package.json
└── README.md
```

Quy trình:

```text
src/javascript/components/slider/*
                    ↓ build
Theme/assets/component-slider.js

src/styles/components/slider/*
                    ↓ build
Theme/assets/component-slider.css
```

Liquid vẫn được viết trực tiếp trong:

```text
Theme/snippets/
Theme/templates/
Theme/layout/
```

hoặc có thể dùng script copy từ một thư mục source riêng nếu đội dự án thật sự cần.

### 6.4. Nguyên tắc quan trọng

- Chỉ `Theme/` phải tuân thủ tuyệt đối cấu trúc Haravan.
- Không tạo `Theme/sections/` vì Haravan theme hiện tại không sử dụng thư mục này.
- Không đặt JavaScript source dạng nhiều module lồng nhau trực tiếp trong `Theme/assets/` nếu Haravan CLI hoặc hệ thống upload không hỗ trợ.
- Dùng prefix tên file để phân nhóm các asset và snippet.
- Có thể bundle nhiều module source thành một hoặc vài file output trong `Theme/assets/`.
- Không đặt build tool, tài liệu kỹ thuật hoặc source chưa compile bên trong thư mục upload nếu không cần thiết.
- `templates/index.liquid` đóng vai trò sắp xếp các module trang chủ bằng cách include snippet tương ứng.


## 7. Thiết kế slider core

### 7.1. Slider engine

Slider engine chỉ chịu trách nhiệm bọc Swiper.

Nó không cần biết:

- Hero slider là gì.
- Product slider là gì.
- Banner hay video.
- Nội dung slide đặt trái hay phải.

Nó chỉ quản lý:

- Init.
- Destroy.
- Responsive.
- Navigation.
- Pagination.
- Loop.
- Autoplay.
- Events.
- Dynamic DOM.
- Accessibility.

### 7.2. Slider markup contract

Mọi slider trong theme nên theo cùng cấu trúc:

```text
slider root
├── viewport
│   └── wrapper
│       └── slide
├── pagination
├── previous button
└── next button
```

Không nên để mỗi snippet tự định nghĩa một cấu trúc hoàn toàn khác.

### 7.3. Slider preset

Nên có các preset:

```text
hero
product
logo
testimonial
announcement
gallery
```

Preset hero mặc định:

```text
items: 1
loop: true
autoplay: true
pagination: progress
navigation: true
```

Preset product mặc định:

```text
mobile: 2
tablet: 3
desktop: 4
loop: false
autoplay: false
```

Section có thể override từng giá trị khi cần.

### 7.4. Slider extension

Các chức năng đặc biệt không nên nhét hết vào slider engine.

Nên tách thành extension:

```text
slider
├── autoplay-progress extension
├── media-controller extension
├── content-reveal extension
└── thumbnail-controller extension
```

Extension giao tiếp với slider qua event.

---

## 8. Luồng hero slider mục tiêu

Hero slider nên render toàn bộ slide bằng Liquid.

Luồng mục tiêu:

```text
Liquid render toàn bộ slide
        ↓
Slide đầu eager
Slide còn lại lazy
        ↓
Browser parse HTML
        ↓
Slider component init
        ↓
Media và progress extension kết nối
```

Không cần JavaScript chèn slide 2 đến slide 5.

Để giữ hiệu năng:

- Slide đầu dùng ảnh eager.
- Slide sau dùng lazy.
- YouTube slide chưa active không tạo iframe.
- MP4 slide chưa active chưa play.
- Có thể dùng `content-visibility`.
- Chỉ preload hero image đầu tiên.
- Slider JavaScript init sau khi HTML sẵn sàng.

---

## 9. Vai trò mới của `components.js`

`components.js` nên trở thành bootstrap nhỏ.

Nó chỉ chịu trách nhiệm:

```text
Import hoặc đăng ký component core
Đảm bảo component chỉ define một lần
Khởi tạo global lifecycle
Phát theme-ready
```

Không nên chứa toàn bộ implementation.

Source development:

```text
components.js
├── register slider
├── register tabs
├── register accordion
├── register drawer
└── register commerce components
```

Production vẫn có thể bundle thành một file.

```text
Source architecture: nhiều module
Production output: một hoặc vài bundle
```

---

## 10. Chuẩn component

### 10.1. Lifecycle

```text
connected
initialized
updated
destroyed
```

### 10.2. Public API

Ví dụ slider:

```text
next
previous
goTo
play
pause
refresh
destroy
```

### 10.3. Event

Nên dùng event có namespace thống nhất:

```text
slider:ready
slider:change
slider:play
slider:pause
slider:destroy
```

Không nên trộn nhiều kiểu đặt tên không đồng nhất.

### 10.4. State attribute

Component nên phản ánh trạng thái ra DOM:

```text
data-state="ready"
data-active-index="1"
data-slide-count="5"
data-playing="true"
```

CSS và extension có thể đọc state mà không cần truy cập instance nội bộ.

### 10.5. Error behavior

Component cần đảm bảo:

- Thiếu markup thì warn một lần.
- Thiếu dependency không làm crash toàn trang.
- Init nhiều lần không tạo nhiều instance.
- Remove khỏi DOM phải cleanup.
- Render lại section vẫn init được.

---

## 11. Quy chuẩn Liquid section

Một section core nên có ba phần:

```text
1. Prepare data
2. Render markup
3. Section-scoped style/config
```

Không nên:

- Tạo HTML lớn trong JavaScript.
- Viết business logic trong inline script.
- Đăng ký custom element trong snippet.
- Lặp markup ở nhiều nơi.
- Dùng global variable tùy ý.

Snippet nên nhỏ và rõ mục đích:

```text
hero-slide-item
responsive-image
slider-controls
button
icon
```

---

## 12. Naming convention cho setting

Hiện tại các tên như sau chưa đồng nhất:

```text
btnlink
btnurl
mp4_url
youtube_url
d_image
m_image
```

Core nên dùng cùng một convention:

```text
button_label
button_url
desktop_image
mobile_image
media_type
video_url
```

Nếu Haravan chưa hỗ trợ block động, có thể dùng:

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

---

## 13. CSS architecture

CSS nên chia thành ba lớp:

```text
CSS foundation
CSS component structure
CSS theme skin
```

### Foundation

- Reset.
- Container.
- Grid.
- Spacing.
- Typography scale.
- Utility tối thiểu.
- Accessibility.

### Component structure

Ví dụ slider:

- Overflow.
- Slide sizing.
- Navigation hook.
- Hidden state.
- Loading state.

### Theme skin

- Màu nút.
- Border radius.
- Animation.
- Font.
- Hero content style.
- Navigation shape.

Core không nên chứa quá nhiều style thương hiệu.

---

## 14. Lộ trình triển khai

### Phase 1 — Audit và chuẩn hóa

Công việc:

- Liệt kê component trong `components.js`.
- Liệt kê slider cũ và mới.
- Tìm tất cả nơi gọi trực tiếp `new Swiper`.
- Tìm tất cả `js-swiper-slider`.
- Tìm inline script trong Liquid.
- Phân loại core component và theme-specific component.
- Chốt naming convention.
- Chốt event convention.
- Chốt breakpoint.

Kết quả:

```text
Core component inventory
Legacy inventory
Migration map
Naming document
```

### Phase 2 — Tách slider làm component mẫu

Công việc:

- Chọn markup contract.
- Chọn configuration contract.
- Tách slider engine.
- Tách media controller.
- Tách progress controller.
- Tách content reveal.
- Render toàn bộ slide bằng Liquid.
- Bỏ HTML injection từ `shop-optimize`.
- Chuyển topbar slider về cùng core.
- Chuẩn hóa event.
- Chuẩn hóa single-slide state.

Kết quả:

```text
Một slider core
Hero dùng slider core
Topbar dùng slider core
Product carousel tái sử dụng được
```

### Phase 3 — Tách `components.js`

Phân nhóm:

```text
UI primitives
Media
Commerce
Effects
Utilities
```

Sau đó tạo entry point chung.

### Phase 4 — Xây section contract

Chọn ba section đại diện:

- Hero slider.
- Featured collection.
- Image with text.

Chuẩn hóa:

- Class.
- ID.
- Setting.
- Snippet.
- CSS/JS loading.
- Responsive image.
- Data attribute.

### Phase 5 — Commerce core

Ưu tiên:

1. Product card.
2. Product form.
3. Variant selector.
4. Cart API.
5. Cart drawer.
6. Search drawer.
7. Collection filter.

### Phase 6 — Documentation và starter theme

Starter theme tối giản gồm:

- Header.
- Footer.
- Hero.
- Collection products.
- Product detail.
- Cart drawer.
- Search.
- Core tokens.
- Core components.

Starter theme không cần đẹp, chỉ cần chứng minh component hoạt động độc lập.

---

## 15. Definition of Done cho core component

Một component chỉ được đưa vào core khi:

- Không chứa style thương hiệu cụ thể.
- Không phụ thuộc một template duy nhất.
- Có markup contract.
- Có configuration mặc định.
- Có public API nếu cần.
- Có event contract.
- Init nhiều lần không lỗi.
- Cleanup khi remove khỏi DOM.
- Hoạt động với nội dung thêm động.
- Không crash khi thiếu phần tử tùy chọn.
- Có accessibility cơ bản.
- Có tài liệu sử dụng.
- Có ít nhất hai use case.

Ví dụ slider chỉ thực sự là core khi dùng được cho cả:

```text
Hero slider
Product carousel
```

mà không sửa slider engine.

---

## 16. Thứ tự ưu tiên

```text
1. Core conventions
2. Slider component
3. Component loader / registration
4. Tabs và accordion
5. Drawer và modal
6. Responsive media
7. Product card
8. Product form
9. Cart
10. Search
11. Starter theme
```

Không nên tách toàn bộ `components.js` cùng lúc.

Slider nên được dùng làm reference architecture, sau đó mới áp dụng cùng pattern cho component khác.

---

## 17. Kết luận

Source hiện tại đã có nền móng tốt ở các điểm:

- Dùng Custom Elements.
- Khai báo configuration bằng `data-*`.
- Tách behavior khỏi phần lớn Liquid markup.

Để phát triển thành một bộ source core dùng cho nhiều theme Haravan, cần xử lý bốn vấn đề chính:

```text
Không để components.js thành monolith
Không duy trì hai hệ thống slider
Không tạo Liquid markup bằng JavaScript
Không để snippet tự quản dependency và component registration
```

Kiến trúc đích:

```text
Haravan Liquid sections
        ↓
Core markup contracts
        ↓
Reusable web components
        ↓
Commerce services / Haravan APIs
        ↓
Theme-specific CSS skin
```

Hướng triển khai phù hợp nhất là lấy slider hiện tại làm module thử nghiệm đầu tiên, hoàn thiện kiến trúc core quanh slider, sau đó nhân rộng sang tabs, drawer, media và commerce components.
