# Component Library Contract

## 1. Contract chung

Mỗi component phải xác định:

```text
Purpose
Markup contract
Configuration
State
Events
Public API
Dependencies
Accessibility
Empty state
Single-item state
Destroy behavior
```

---

## 2. Slider Component

### Purpose

Cung cấp một adapter duy nhất cho Swiper và dùng lại ở hero, product, logo, testimonial, gallery.

### Markup contract

```html
<slider-component
  data-preset="hero"
  data-autoplay="true"
  data-autoplay-delay="3000"
  data-transition-duration="600"
  data-slides-mobile="1"
  data-slides-tablet="1"
  data-slides-desktop="1"
>
  <div class="swiper" data-role="viewport">
    <div class="swiper-wrapper">
      <div class="swiper-slide">...</div>
    </div>
  </div>

  <div data-role="pagination"></div>

  <button type="button" data-action="previous" aria-label="Slide trước"></button>
  <button type="button" data-action="next" aria-label="Slide tiếp theo"></button>
</slider-component>
```

### Preset

Core có thể hỗ trợ:

```text
hero
product
logo
testimonial
gallery
announcement
```

Preset cung cấp default; attribute explicit override preset.

Ba attribute `data-slides-mobile`, `data-slides-tablet` và `data-slides-desktop`
nhận số dương hoặc chuỗi `auto`. Giá trị `auto` cho phép CSS quyết định chiều rộng
từng `.swiper-slide`; slider bật `slidesPerGroupAuto` để navigation tiến theo nhóm
slide đang nhìn thấy.

### State

```text
data-state="idle|loading|ready|error|disabled"
data-active-index
data-slide-count
data-playing
```

### Events

```text
slider:ready
slider:change
slider:play
slider:pause
slider:destroy
slider:error
```

### Public API

```text
next()
previous()
goTo(index)
play()
pause()
refresh()
destroy()
```

### Single slide

Khi chỉ có một slide:

- Không bật loop.
- Không bật autoplay.
- Ẩn navigation.
- Ẩn pagination nếu không có ý nghĩa.
- Vẫn set `data-state="ready"`.
- Vẫn phát `slider:ready`.
- Không buộc extension phải nghe event riêng chỉ cho single slide.

### Dependency

Swiper chỉ được khởi tạo bên trong slider component.

Implementation hiện tại của FOX Fashion:

```text
FOX Fashion/assets/core-component-slider.js
FOX Fashion/assets/core-component-slider.css
FOX Fashion/assets/core-component-slider-media.js
```

Thứ tự load:

```text
Swiper 8.4.4
    ↓
core-component-slider.js
    ↓
core-component-slider-media.js
    ↓
theme/page scripts
```

### Empty slider

Khi không có slide:

- Không khởi tạo Swiper.
- Set `data-state="disabled"`.
- Set `data-slide-count="0"`.
- Ẩn và disable navigation/pagination.
- Vẫn phát `slider:ready` với `swiper: null` để caller không phải chờ vô hạn.

---

## 3. Slider Progress Extension

### Purpose

Hiển thị progress và play/pause cho autoplay.

### Contract

Extension target slider qua DOM relationship hoặc ID rõ ràng.

Không truy cập private field của slider.

Giao tiếp qua:

- Public method.
- State attribute.
- Slider events.

### Events consumed

```text
slider:ready
slider:change
slider:play
slider:pause
slider:destroy
```

### Accessibility

Play/pause phải là button và cập nhật accessible label.

---

## 4. Media Component

### Purpose

Quản lý image, YouTube và MP4 trong slider hoặc standalone block.

### Responsibility

- Lazy create YouTube iframe.
- Play active media.
- Pause inactive media.
- Cleanup player.
- Không autoplay nhiều media cùng lúc.
- Tôn trọng reduced motion/data constraints khi có thể.

Media source và fallback markup phải được Liquid render.

---

## 5. Tabs Component

### Markup contract

```html
<tabs-component data-default="details">
  <div role="tablist" aria-label="Thông tin sản phẩm">
    <button
      type="button"
      role="tab"
      data-target="details"
    >
      Chi tiết
    </button>
  </div>

  <div id="details" role="tabpanel">
    ...
  </div>
</tabs-component>
```

### Keyboard

- Arrow Left/Right.
- Arrow Up/Down nếu layout phù hợp.
- Home.
- End.

### Event

```text
tabs:change
```

Detail:

```text
tabId
index
sourceId
```

### Public API

```text
activate(target)
activeIndex
activePanel
```

### Nested

Mỗi `<tabs-component>` chỉ nhận diện `[role="tablist"]` và `[role="tabpanel"]` là con
trực tiếp của chính nó. Một `<tabs-component>` lồng bên trong một tabpanel của
`<tabs-component>` khác hoạt động độc lập, không bị instance ngoài bắt nhầm tab/panel.

---

## 6. Drawer Component

### Markup contract

```html
<drawer-component data-state="closed">
  <button type="button" data-action="close" aria-label="Đóng"></button>
  <div data-role="overlay"></div>
  <div data-role="panel" role="dialog" aria-modal="true">
    ...
  </div>
</drawer-component>
```

### Responsibility

- Open/close.
- Focus trap.
- Escape.
- Overlay click.
- Restore focus.
- Scroll lock.
- Cleanup.

### Events

```text
drawer:open
drawer:opened
drawer:close
drawer:closed
```

---

## 7. Modal Component

### Purpose

`<modal-component>` điều phối một native `<dialog>` brand-agnostic. Core chỉ quản lý
behavior, state, lifecycle và accessibility; toàn bộ nội dung phải được Liquid/HTML
render sẵn.

### Markup contract

```html
<modal-component id="example-modal" data-state="closed">
  <dialog data-role="dialog" aria-labelledby="example-modal-title">
    <div data-role="surface">
      <header data-role="header">
        <h2 id="example-modal-title">Tiêu đề</h2>
        <button type="button" data-action="close" aria-label="Đóng"></button>
      </header>
      <div data-role="body">...</div>
    </div>
  </dialog>
</modal-component>
```

Child `<dialog>` phải có accessible name qua `aria-label` hoặc `aria-labelledby` hợp
lệ. Không đặt `hidden`, `role="dialog"` hoặc `aria-modal` thủ công; `showModal()` cung
cấp native modal semantics, top layer, focus containment và `::backdrop`.

### Configuration

```text
data-close-on-overlay="false"
data-close-on-escape="false"
```

Mặc định click backdrop, Escape và `[data-action="close"]` đều đóng modal.

### State

```text
data-state="closed|opening|open|closing|error"
```

Mặc định chỉ một FOX native modal được active. Bootstrap modal và
`TYT.Component.Modal` là legacy độc lập trong giai đoạn migration. Khi modal B mở
trong lúc A đang active, A hoàn tất `close('replaced')` trước khi B gọi
`showModal()`.

Modal có `data-modal-stack="true"` giữ modal active trước đó mở ở trạng thái
`data-modal-suspended="true"`. Khi modal trên cùng đóng, core gỡ trạng thái suspended,
khôi phục modal cha làm active modal và trả focus về trigger.

### Events

```text
modal:open
modal:opened
modal:close
modal:closed
modal:suspended
modal:resumed
```

Tất cả event bubble. Detail ổn định:

```text
modal
trigger
reason
```

Foundation phát `overlay:show`, `overlay:hide` và `overlay:click` trên `document`.
Visual backdrop dùng native `dialog::backdrop`; foundation không tạo overlay DOM.

### Public API

```text
open(trigger?) -> Promise<boolean>
close(reason?) -> Promise<boolean>
toggle(trigger?) -> Promise<boolean>
isOpen
```

Promise `open()` resolve sau `modal:opened`; `close()` resolve sau `modal:closed`. Các
operation được serialize toàn trang để không có hai FOX modal cùng mở.

### Accessibility and lifecycle

Native dialog giới hạn focus trong top layer. Sau khi mở, core ưu tiên `[autofocus]`,
control focusable đầu tiên, rồi dialog. Khi đóng, focus trả về trigger nếu trigger vẫn
còn trong DOM. `cancel` native được intercept để exit animation hoàn tất trước
`dialog.close()`.

`disconnectedCallback()` abort listener, đóng dialog, clear active modal, gỡ scroll
lock và không attach listener trùng khi connect lại. Empty body vẫn là modal hợp lệ;
single/multiple item do markup caller quản lý.

Dependencies:

```text
FOX Fashion/assets/core-foundation-overlay.js
FOX Fashion/assets/core-foundation-overlay.css
FOX Fashion/assets/core-component-modal.js
FOX Fashion/assets/core-component-modal.css
```

---

## 8. Accordion Component

Tag: `<accordion-component>`.

```html
<accordion-component data-multiple="false">
  <div class="fox-accordion__item">
    <button
      type="button"
      aria-expanded="false"
      aria-controls="panel-1"
      id="trigger-1"
    >
      Câu hỏi 1
    </button>
    <div id="panel-1" role="region" aria-labelledby="trigger-1" hidden>
      ...
    </div>
  </div>
  <!-- lặp lại .fox-accordion__item -->
</accordion-component>
```

Mặc định single-open (mở 1 panel thì đóng các panel khác cùng instance). Thêm
`data-multiple="true"` để cho phép mở nhiều panel cùng lúc.

Panel có ID unique.

Event:

```text
accordion:change
```

Detail:

```text
panelId
expanded
sourceId
```

Không dùng click handler trên heading không focus được.

### Nested

Mỗi `<accordion-component>` chỉ nhận diện các button trigger có ancestor
`accordion-component` gần nhất là chính nó. Một `<accordion-component>` lồng bên trong
panel của `<accordion-component>` khác hoạt động độc lập.

---

## 9. Product Form

### Responsibility

- Variant selection integration.
- Quantity.
- Add-to-cart request.
- Loading state.
- Error state.
- Success event.
- Sold-out/unavailable state.

### Events

```text
product:variant-change
product:add-start
product:add-success
product:add-error
cart:updated
```

Không để product form tự viết lại toàn bộ cart drawer.

---

## 10. Cart Drawer

Cart drawer compose:

```text
Drawer Component
Cart Service
Cart Item Renderer
Cart Summary
```

Không gọi cart API riêng biệt trong từng button.

State:

```text
idle
loading
ready
empty
error
```

Events consumed/emitted:

```text
cart:updating
cart:updated
cart:error
drawer:open
drawer:close
```

---

## 11. Responsive Image Snippet

Snippet phải nhận tối thiểu:

```text
desktop source
mobile source
alt
width
height
loading
decoding
class
link optional
```

Hero slide đầu:

```text
loading=eager
decoding=sync hoặc auto theo quyết định dự án
```

Slide sau:

```text
loading=lazy
decoding=async
```

Không preload mọi slide image.

---

## 12. FOX Scroll Viewport

Nền tảng scroll dùng attribute, gồm scroll-progress và viewport-triggered preset.

Contract đầy đủ:

```text
docs/fox-scroll-viewport.md
```

Implementation:

```text
FOX Fashion/assets/scroll-viewport.js
FOX Fashion/assets/scroll-style.css
```

Caller production:

```text
home-category.liquid             -> collections
home-media-banner.liquid  -> shrink + data-fox-scroll-expand
home-scroll-media-text.liquid -> media-text-reveal
```

---

## 13. Standalone Media Progress

```html
<media-progress
  data-autoplay="true"
  data-loop
  data-scroll-pause="true"
  data-state="idle"
>
  <video muted playsinline preload="metadata">...</video>
  {% include 'component-media-progress-control' with
    fox_media_play_label: 'Phát video',
    fox_media_pause_label: 'Tạm dừng video'
  %}
</media-progress>
```

Control dùng `data-fox-media-progress-bar` để nhận progress thực từ MP4 hoặc
YouTube. Stylesheet dùng chung:

```text
FOX Fashion/assets/media-progress.css
```

MP4 ưu tiên `currentTime / duration`; YouTube ưu tiên
`getCurrentTime() / getDuration()`. `data-duration` mặc định `5000ms` chỉ là
fallback khi duration chưa khả dụng. Với `data-loop`, media và ring trở về `0`
rồi chạy lại.

State:

```text
data-state="idle|playing|paused|error"
data-fox-media-ready="true"
```

Public API:

```text
play()
pause()
toggle()
isPaused
```

Events:

```text
media:complete
media:error
```

`media-complete` vẫn được phát để tương thích caller cũ. Với
`prefers-reduced-motion: reduce`, standalone media chỉ phát sau thao tác người
dùng.

---

## 14. FOX Home Images With Text Overlay

### Purpose

Hiển thị nhóm hoạt động bằng các thẻ ảnh có nội dung phủ, chồng nhẹ trên desktop
và cuộn ngang native trên mobile/tablet.

### Markup contract

```html
<section class="fox-iwto-section">
  <div class="container">
    <div class="fox-iwto-section__header">...</div>
    <div class="fox-iwto-list" role="list" data-item-count="5">
      <article class="fox-iwto-card" role="listitem">
        <div class="fox-iwto-card__media">...</div>
        <div class="fox-iwto-card__content">...</div>
      </article>
    </div>
  </div>
</section>
```

Implementation:

```text
FOX Fashion/snippets/home-images-overlay.liquid
FOX Fashion/assets/home-images-overlay.css
```

Configuration dùng các key `fox_iwto_*` trong `settings.html`. Label tiêu đề chính
của section dùng `Tiêu đề`, không dùng `Tiêu đề khu vực` hoặc `Tiêu đề section`.
Mỗi item sở hữu file upload `fox_iwto_N_image.jpg`, alt, tiêu đề, mô tả, CTA và
URL riêng.

Section không có state, event hoặc public API JavaScript. Mobile/tablet dùng
`overflow-x: auto` và `scroll-snap`; link CTA là phần tử keyboard-focusable.
Nếu không có item bật, Liquid không render section. Một item chiếm toàn bộ chiều
rộng desktop; từ hai đến năm item tự tính độ rộng theo `data-item-count`.

Dependencies:

```text
button.css
home-images-overlay.css
```

---

## 15. FOX Scroll Media With Text

### Purpose

Kết hợp hai hàng marquee chạy ngược chiều với ảnh mở từ tâm theo scroll và nội dung
campaign phủ trên ảnh. Liquid luôn render sẵn ảnh, heading, mô tả và CTA; scroll engine
chỉ tăng cường chuyển động trên thiết bị có chuột chính xác và không yêu cầu giảm motion.

### Markup contract

```html
<section
  class="fox-smt"
  data-fox-scroll-viewport="media-text-reveal"
  data-fox-scroll-breakpoint="767"
  data-fox-scroll-state="idle"
>
  <div class="fox-smt__sticky" data-fox-scroll-sticky>
    <div class="fox-smt__marquee-panel">
      <fox-marquee direction="rtl" speed-factor="0.2">...</fox-marquee>
      <fox-marquee direction="ltr" speed-factor="0.2" aria-hidden="true">...</fox-marquee>
    </div>
    <div class="fox-smt__media" data-fox-scroll-media>...</div>
    <div class="fox-smt__content" data-fox-scroll-content>...</div>
  </div>
</section>
```

Implementation:

```text
FOX Fashion/snippets/home-scroll-media-text.liquid
FOX Fashion/assets/scroll-media-text.css
FOX Fashion/assets/fox_scroll_media_text_image.jpg
```

Settings contract:

```text
fox_scroll_media_text_show
fox_scroll_media_text_image.jpg
fox_scroll_media_text_alt
fox_scroll_media_text_text_1
fox_scroll_media_text_text_2
fox_scroll_media_text_text_3
fox_scroll_media_text_title
fox_scroll_media_text_desc
fox_scroll_media_text_btn_title
fox_scroll_media_text_btn_url
fox_scroll_media_text_marquee_color
fox_scroll_media_text_content_color
fox_scroll_media_text_overlay_opacity
```

Khi file upload rỗng, ảnh fallback là `fox_scroll_media_text_image.jpg`. Nếu cả ba
`fox_scroll_media_text_text_*` rỗng, panel marquee không được render nhưng media và
content vẫn hoạt động. CTA chỉ render khi có cả title và URL.

Hàng marquee thứ hai và clone do engine tạo đều ẩn khỏi screen reader. Trên touch,
no-JS, state `disabled|error` hoặc `prefers-reduced-motion: reduce`, section dùng layout
tĩnh: marquee nằm trước media, ảnh và content vẫn đọc được, không sticky hoặc pin viewport.

Dependencies:

```text
button.css
marquee-scroll.min.css
marquee-scroll.min.js
scroll-style.css
scroll-viewport.js
scroll-media-text.css
```

---

## 16. FOX Image Comparison

### Purpose

Hiển thị hai hình ảnh cùng tỷ lệ trong một khung so sánh kéo ngang. Liquid render
đầy đủ hai `figure`; JavaScript chỉ chuyển layout tĩnh thành lớp ảnh có divider và
range tương tác.

### Markup contract

```html
<fox-image-compare
  data-state="idle"
  data-position="50"
  data-default-position="50"
>
  <div data-role="media">
    <figure data-role="left-panel">
      <img data-role="left-image" alt="...">
      <figcaption>...</figcaption>
    </figure>
    <figure data-role="right-panel">
      <img data-role="right-image" alt="...">
      <figcaption>...</figcaption>
    </figure>
  </div>
  <input data-role="range" type="range" min="0" max="100" step="1">
  <div data-role="divider" aria-hidden="true">...</div>
</fox-image-compare>
```

`data-default-position` là cấu hình Liquid ban đầu. `data-position` luôn phản ánh
vị trí thực tế trong khoảng `0..100`.

### Settings contract

```text
fox_image_compare_show
fox_image_compare_title
fox_image_compare_desc
fox_image_compare_position
fox_image_compare_left_image.jpg
fox_image_compare_left_alt
fox_image_compare_left_label
fox_image_compare_right_image.jpg
fox_image_compare_right_alt
fox_image_compare_right_label
```

Khi upload rỗng, component dùng lần lượt
`fox_image_compare_left_image.jpg` và `fox_image_compare_right_image.jpg` trong
assets. Cả hai ảnh dùng kích thước `1920x987`, lazy loading và cùng crop trên mọi
breakpoint.

### State

```text
data-state="idle|ready|error"
data-position="0..100"
```

State `idle` và `error` giữ layout tĩnh với hai ảnh riêng. Chỉ state `ready` mới
chồng ảnh, hiện divider và mở range tương tác.

### Events

```text
image-compare:ready  detail: { position }
image-compare:change detail: { position, source: "user|api" }
image-compare:error  detail: { reason }
```

Tất cả event đều bubble.

### Public API

```text
position
setPosition(value)
```

`setPosition(value)` clamp giá trị về `0..100`, đồng bộ range/CSS state và phát
`image-compare:change` với source `api` khi component đang ready.

### Accessibility and motion

Range native phủ toàn bộ media, có accessible name và giữ behavior chuột, touch,
Arrow, Home, End của browser. Focus-visible được phản ánh lên handle. Divider và
handle chỉ mang tính trực quan nên ẩn khỏi accessibility tree.

Lần đầu component đi vào viewport, divider reveal từ `0` tới vị trí mặc định.
Animation bị bỏ qua với `prefers-reduced-motion: reduce`, khi thiếu
`IntersectionObserver`, hoặc ngay khi người dùng bắt đầu tương tác.

### Empty/error and destroy behavior

Title, description và từng caption có thể để trống độc lập. Hai ảnh luôn có
fallback asset nên section không có single-item mode. Nếu thiếu hook bắt buộc hoặc
ảnh lỗi, component chuyển `error`, phát event và trả về layout tĩnh.

`disconnectedCallback()` abort toàn bộ listener, disconnect observer, hủy animation
frame và đưa state về `idle`. Registration có guard để không define custom element
hai lần.

Dependencies:

```text
FOX Fashion/snippets/home-image-compare.liquid
FOX Fashion/assets/image-compare.css
FOX Fashion/assets/image-compare.js
```

---

## 17. FOX Latest Stories

### Purpose

Hiển thị các bài viết mới nhất của một blog trong track ngang. Phần heading và CTA
giữ trong container cố định. Mobile để lộ một phần card kế tiếp; tablet hiển thị
hai card và desktop hiển thị ba card trong viewport.

### Markup contract

```html
<section class="fox-latest-stories" aria-labelledby="fox-latest-stories-heading">
  <header class="fox-latest-stories__header">...</header>
  <slider-component
    class="fox-latest-stories__slider"
    data-state="idle"
    data-slides-mobile="auto"
    data-slides-tablet="auto"
    data-slides-desktop="auto"
  >
    <div class="fox-latest-stories__viewport swiper" data-role="viewport">
      <div class="fox-latest-stories__track swiper-wrapper">
        <div class="fox-latest-stories__slide swiper-slide">
          <article class="fox-latest-stories__article">
            <div class="fox-latest-stories__card">
              <div class="fox-latest-stories__media">
                <a class="fox-latest-stories__media-link" href="...">...</a>
                <time class="fox-latest-stories__date">...</time>
              </div>
              <div class="fox-latest-stories__card-content">
                <h3><a class="fox-latest-stories__article-title-link fox-text-link" href="...">...</a></h3>
                <p class="fox-latest-stories__summary">...</p>
                <a class="fox-latest-stories__read-more btn btn-secondary" button-effect href="...">
                  <span class="btn__label">...</span>
                  <span class="btn--icon"><svg class="icon-svg">...</svg></span>
                  <span data-btn-effect-span></span>
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </slider-component>
</section>
```

Liquid render toàn bộ article card trước khi JavaScript chạy. Link ảnh, tiêu đề
và read-more là các interactive element độc lập; không bọc toàn bộ nội dung card
trong một anchor. Ngày đăng nằm trên ảnh; phần tóm tắt lấy excerpt, fallback
sang content và chỉ hiển thị khi có text. CSS giới hạn tiêu đề hai dòng và
tóm tắt ba dòng để các nút đọc tiếp thẳng hàng. Nút đọc tiếp và CTA section
dùng `btn btn-secondary`, `button-effect` và icon `ic-arrow-45top-r` chung.
Khi slider chưa sẵn sàng hoặc lỗi dependency, viewport dùng native horizontal
overflow và scroll snap; nội dung, link và metadata bài viết vẫn đọc và thao tác được.

### Settings contract

```text
latest_stories_show
latest_stories_blog_handle
latest_stories_title
latest_stories_desc
latest_stories_limit
latest_stories_cta_label
latest_stories_read_more_label
latest_stories_show_date
```

`latest_stories_blog_handle` được resolve qua `blogs[handle]`. Section không
render khi bị tắt, blog không tồn tại hoặc blog không có bài viết. Limit được clamp
trong khoảng `1..8`. Ảnh bài viết trống dùng fallback `no-image-blog.jpg`.

### State and behavior

State, lifecycle, navigation, events và public API dùng contract của
`slider-component`. Một bài viết vẫn render card và core ẩn/disable navigation;
nhiều bài viết dùng slide width responsive do CSS quản lý với `slidesPerView: auto`.

Heading/description/CTA/read-more/date có thể ẩn độc lập theo setting. Hai nút
navigation có accessible name; link ảnh, title, read-more và CTA nhận
focus-visible riêng. Màu section và CTA lấy từ token global `--color-bg-theme`,
`--color-text-theme` và `--color-btn-*`; animation hover bị tắt với
`prefers-reduced-motion: reduce`.

Dependencies:

```text
FOX Fashion/snippets/home-latest-stories.liquid
FOX Fashion/snippets/article-card-overlay.liquid
FOX Fashion/assets/latest-stories.css
FOX Fashion/assets/link-effect.css
FOX Fashion/assets/core-component-slider.js
FOX Fashion/assets/core-component-slider.css
```

---

## 18. FOX Link Effect

### Purpose

Utility link tái sử dụng hiệu ứng underline dạng SVG chạy ngang. Graphic rộng `300%`
chứa ba đoạn line liên tiếp và dịch `66.6%` khi hover hoặc focus-visible, bám behavior
của link effect trong theme tham chiếu mà không cần JavaScript.

### Markup contract

```html
<a class="fox-link-effect" href="...">
  <span class="fox-link-effect__label">Read more</span>
  <svg
    class="fox-link-effect__graphic"
    aria-hidden="true"
    focusable="false"
    width="300%"
    height="100%"
    viewBox="0 0 1200 60"
    preserveAspectRatio="none"
  >
    <path d="M0,56.5c0,0,298.666,0,399.333,0C448.336,56.5,513.994,46,597,46c77.327,0,135,10.5,200.999,10.5c95.996,0,402.001,0,402.001,0"></path>
  </svg>
</a>
```

### Styling contract

```text
--fox-link-effect-color
--fox-link-effect-stroke-width
```

Modifier `.fox-link-effect--fade` ẩn graphic ở trạng thái nghỉ và reveal khi hover/focus.
Utility tự đảo hướng trong `[dir='rtl']`, giữ focus outline và tắt chuyển động khi
`prefers-reduced-motion: reduce`.

Title hoặc inline text link dùng `.fox-text-link`. Utility này bám `.hdt-link` của
theme tham chiếu: underline là background gradient bắt đầu ở `0`, mở tới `100%`
trong `500ms cubic-bezier(.3,1,.3,1)` khi hover hoặc focus-visible. Link phải giữ
`display: inline` và không đặt trong wrapper `line-clamp`; việc clamp làm background
underline rơi vào fragment bị ẩn và phá behavior của theme tham chiếu.

```html
<h3 class="card-title">
  <a class="fox-text-link" href="...">Article title</a>
</h3>
```

Dependency:

```text
FOX Fashion/assets/link-effect.css
```

---

## 19. FOX Home Policies

### Purpose

Hiển thị tối đa bốn chính sách mua sắm trong khung bo tròn. Liquid render toàn bộ
nội dung; `slider-component` chỉ tăng cường thao tác swipe trên màn hình nhỏ.

### Markup contract

```html
<section class="fox-home-policies" aria-label="Chính sách mua sắm">
  <slider-component
    class="fox-home-policies__slider"
    data-state="idle"
    data-slides-mobile="1"
    data-slides-tablet="2"
    data-slides-desktop="4"
  >
    <div class="fox-home-policies__viewport swiper" data-role="viewport">
      <div class="fox-home-policies__track swiper-wrapper">
        <div class="fox-home-policies__slide swiper-slide">
          <article class="fox-home-policies__item">...</article>
        </div>
      </div>
    </div>
  </slider-component>
</section>
```

### Configuration and behavior

Settings dùng `fox_home_policies_show` và nhóm
`fox_home_policy_1..4_show/title/description`. Số slide tablet/desktop được giới hạn
theo số item đang bật để các item luôn lấp đầy container. Không item thì section
không render; một item vẫn hiển thị toàn chiều rộng.

Khi JavaScript chưa sẵn sàng hoặc slider lỗi, viewport dùng native horizontal
overflow và scroll snap trên mobile. State, events, API và destroy behavior kế thừa
contract `slider-component`. Component không autoplay, không loop và không tạo
custom element mới.

Phần chính sách hiện chỉ là contract tài liệu; snippet và CSS riêng chưa có trong
theme. Các dependency dự kiến khi triển khai:

```text
FOX Fashion/snippets/home-policies.liquid
FOX Fashion/assets/home-policies.css
FOX Fashion/assets/core-component-slider.js
FOX Fashion/assets/core-component-slider.css
FOX Fashion/snippets/svg-cache.liquid
```

---

## 20. Product and Quick View

### Purpose

`product-component` owns variant state for both the product page and quick view.
Liquid renders the complete product markup and JSON payload; JavaScript only
synchronizes options, gallery, price, availability, actions, URL, and events.

### Markup contract

```html
<product-component
  data-state="idle"
  data-context="page|quickview"
  data-update-url="inherit|true|false"
  data-change-image-with-alt="inherit|true|false">
  <script type="application/json" data-role="product-data">...</script>
  <div data-role="media" data-media-index="0" data-media-src="..." data-media-alt="..."></div>
  <div data-role="price-wrap">...</div>
  <div data-role="variant-picker">...</div>
  <div data-role="purchase">...</div>
  <div data-role="contact" hidden>...</div>
</product-component>
```

Option controls use `data-option-index`, `data-role="option"`, and
`data-option-value`. Commerce actions remain existing `add-to-cart` elements;
the product component updates their variant ID, quantity, and disabled state.

State:

```text
data-state="idle|ready|unavailable|error"
data-variant-id="<variant id>"
data-available="true|false"
data-active-media-index="<zero-based index>"
```

Public API:

```text
selectedVariant
productData
selectVariant(id, source?)
selectOptions(values, source?)
destroy()
```

Events bubble with product, variant, previous variant, and source where relevant:

```text
product:ready
product:variant-change
product:variant-unavailable
```

The gallery first matches `variant.featured_image`. If no exact image exists and
`changeSrcImageWithAlt` is enabled, it falls back to matching option values against
image alt text. A missing match keeps the current image. A zero-price variant uses
contact mode; unavailable variants keep state `unavailable` and disable purchase.
A product with only `Default Title` needs no visible option picker.

### Quick view contract

One `<quick-view-component>` in the layout delegates
`[data-action="quickview"][data-product-handle]`, requests the server-rendered
fragment below, caches successful responses per handle, and opens the shared native
modal only after the fragment is ready:

```text
GET /products/<handle>?view=quick-view
```

Quick view state is `idle|loading|ready|error`. Events are `quickview:opened` and
`quickview:error`. Retry and direct product links remain available on request error.

Dependencies:

```text
FOX Fashion/snippets/product-main.liquid
FOX Fashion/snippets/product-gallery.liquid
FOX Fashion/snippets/product-form.liquid
FOX Fashion/snippets/variant-picker.liquid
FOX Fashion/snippets/quick-view-modal.liquid
FOX Fashion/templates/product.quick-view.liquid
FOX Fashion/assets/core-commerce-product.js
FOX Fashion/assets/core-commerce-product.css
FOX Fashion/assets/core-commerce-quick-view.js
FOX Fashion/assets/quick-view.css
FOX Fashion/assets/core-component-modal.js
```

---

## 21. FOX Footer

### Purpose

Footer toàn site gồm nhận tin, social, cột liên lạc, hai menu linklist, copyright và ảnh phương
thức thanh toán tùy chọn. Markup và trạng thái form được render bằng Liquid.

### Markup contract

```html
<footer class="fox-footer">
  <div class="fox-footer__main">
    <div class="fox-footer__brand">...</div>
    <div class="fox-footer__contact">...</div>
    <fox-footer-menu data-state="idle">
      <details class="fox-footer__menu-group">...</details>
    </fox-footer-menu>
    <fox-footer-menu data-state="idle">
      <details class="fox-footer__menu-group">...</details>
    </fox-footer-menu>
  </div>
  <div class="fox-footer__bottom">...</div>
</footer>
```

### Configuration and behavior

Settings hiện tại dùng namespace `footer_*`; ảnh thanh toán dùng upload key
`footer_payment_image.png`. Cột liên lạc dùng `footer_contact_show`,
`footer_contact_title`, `footer_contact_address`, `footer_contact_phone`,
`footer_contact_email` và `footer_contact_extra`. Cột chỉ render khi được bật và có
ít nhất một trường nội dung; từng trường trống được ẩn. Địa chỉ và thông tin thêm
giữ xuống dòng bằng CSS. Số điện thoại và email được render thành liên kết `tel:`
và `mailto:`. Newsletter dùng form customer Haravan với tag
`newsletter`, input email native và thông báo thành công/lỗi phía server. Menu trống,
social URL trống và ảnh thanh toán trống được ẩn độc lập.

Hai menu luôn giữ native `<details>/<summary>` để vẫn thao tác được khi JavaScript chưa
sẵn sàng. Custom element `<fox-footer-menu>` đồng bộ breakpoint `767px`: desktop luôn
mở menu và loại summary khỏi tab order; mobile khôi phục trạng thái người dùng đã chọn.
`aria-expanded`, `data-mode="mobile|desktop"` và `data-open` luôn phản ánh trạng thái
thực tế. Attribute tùy chọn `open-default-mobile` mở menu mặc định trên mobile;
`break` giữ menu luôn mở.

State:

```text
data-state="idle|ready|error"
```

Component dùng `AbortController`, cleanup listener `MediaQueryList` khi disconnect và
có registration guard. Menu link dùng utility `.fox-text-link`; focus-visible và
animation accordion tôn trọng `prefers-reduced-motion`.

Dependencies:

```text
FOX Fashion/snippets/footer.liquid
FOX Fashion/assets/footer.css
FOX Fashion/assets/footer.js
FOX Fashion/assets/link-effect.css
FOX Fashion/snippets/svg-cache.liquid
```

---

## 22. FOX Product Tabs

### Purpose

Section trang chủ hiển thị carousel sản phẩm theo nhóm collection, chuyển đổi bằng
tab dạng pill có icon. Tab đầu tiên render sẵn bằng Liquid ngay khi tải trang; các
tab còn lại chỉ fetch dữ liệu khi người dùng click, dữ liệu được cache trong DOM qua
`data-loaded` nên mỗi tab chỉ fetch một lần.

### Markup contract

```html
<section class="fox-product-tabs" aria-labelledby="fox-product-tabs-heading">
  <div class="fox-product-tabs__inner">
    <header class="fox-product-tabs__header">...</header>

    <tabs-component id="fox-product-tabs" class="fox-product-tabs__tabs" data-state="idle">
      <div class="fox-product-tabs__tab-bar">
        <button data-action="previous">...</button>
        <div role="tablist" aria-label="Product categories">
          <button type="button" role="tab" data-target="fpt-panel-1" data-collection="ban-chay">...</button>
        </div>
        <button data-action="next">...</button>
      </div>

      <div id="fpt-panel-1" role="tabpanel" class="fox-product-tabs__panel"
           data-fox-product-tabs-panel data-loaded="true">
        <div class="fox-product-tabs__controls">
          <button data-action="previous">...</button>
          <button data-action="next">...</button>
        </div>
        <div class="fox-product-tabs__viewport" data-role="viewport">
          <div class="fox-product-tabs__track" data-role="track">
            <div class="fox-product-tabs__slide">...</div>
          </div>
        </div>
        <div class="fox-product-tabs__skeleton" data-role="skeleton" hidden>...</div>
        <div class="fox-product-tabs__error" data-role="error" hidden>...</div>
      </div>
    </tabs-component>
  </div>
</section>
```

### Configuration and behavior

Settings hiện dùng namespace `product_tabs_*`: `show` (master toggle), `title`,
`desc`, `cta_label`/`cta_url` (ẩn nút CTA nếu label hoặc url trống), `limit` (số sản
phẩm mỗi tab, clamp 1-12). Danh sách tab lặp theo số `product_tabs_1..5_show/
label/collection`; hình ảnh đại diện upload dùng key `product_tabs_1..5_image.png` với
label `Hình ảnh` và chú thích `(160x160px)`. `collection` là text input chứa handle
(không có collection picker trong dialect Haravan này). Không cho merchant nhập ID
sprite hoặc tên icon; hình ảnh upload là nguồn media duy nhất của tab.
Section không render nếu tắt master toggle, không có tab nào hợp lệ (thiếu label
hoặc collection không tồn tại), hoặc tab hợp lệ đầu tiên không có sản phẩm.

Tab đầu tiên trong danh sách hợp lệ (không nhất thiết là slot N=1) luôn render
server-side và có `data-loaded="true"` sẵn. Các tab khác `hidden` và
`data-loaded="false"`, chỉ fetch khi `<tabs-component>` bắn event `tabs:change`:

```text
GET /collections/<handle>?view=product-tab
```

Endpoint dùng alternate template `templates/collection.product-tab.liquid`
(`{% layout none %}`, chỉ trả fragment các `product-loop` card) nên hoạt động ngay
với bất kỳ collection handle nào, không cần gán template thủ công trên admin.

State trên panel phản ánh `idle|loading|ready|error`; lỗi fetch hiện fallback text
kèm link trực tiếp tới trang collection, không throw ra console. Nút prev/next
`scrollBy` trên viewport scroll-snap ngang, tự `disabled` ở đầu/cuối track. Section
tái sử dụng `<tabs-component>` (`tabs.js`) nguyên trạng cho phần chuyển tab —
không mở rộng hay sửa custom element gốc.

Dependencies:

```text
FOX Fashion/snippets/home-product-tabs.liquid
FOX Fashion/templates/collection.product-tab.liquid
FOX Fashion/assets/product-tabs.css
FOX Fashion/assets/product-tabs.js
FOX Fashion/assets/tabs.js
FOX Fashion/snippets/product-loop.liquid
FOX Fashion/snippets/product-loop-no.liquid
FOX Fashion/snippets/svg-cache.liquid
```
---

## Slider Controls

Reusable slider navigation is rendered with `{% include 'component-slider-controls' %}` inside `slider-component`. Set `slider_controls_vertical = true` before the include for the compact vertical previous/progress/next layout. `core-component-slider.js` updates the progressbar state and hides the complete control when the slider has zero or one item.

---

## FOX Product Story

`home-product-story.liquid` renders the story carousel and one shared portrait
modal. Each card keeps media, product links, and the CTA as separate interactive
controls. Product thumbnails overlap horizontally at rest and expand to a `5px` gap
on hover or `focus-within`; the CTA reveals below them. On coarse pointers the full
action group stays visible so access never depends on hover. The CTA follows the
shared `btn btn-secondary` and `button-effect` contract.

The outer story slider uses `data-marquee="true"`: autoplay delay is zero, movement
uses a long linear transition, loop remains enabled, and no navigation controls are
rendered. `slider-component` owns the Swiper instance and maps marquee mode to the
continuous autoplay configuration.

The modal retains the shared `modal-component` and `slider-component` lifecycle. It
uses a `9 / 16` media surface with an author header, per-story progress indicators,
and a horizontally scrollable product strip over the lower gradient. Product cards
are hydrated from the existing `lookbook-card` fragment and receive the
`product-card--story` modifier. The public events remain `product-story:open`,
`product-story:change`, and `product-story:close`.

Dependencies:

```text
FOX Fashion/snippets/home-product-story.liquid
FOX Fashion/snippets/product-story-item.liquid
FOX Fashion/assets/product-story.css
FOX Fashion/assets/product-story.js
FOX Fashion/assets/core-component-modal.js
FOX Fashion/assets/core-component-slider.js
```

---

## FOX Lookbook and Popover

`home-lookbook.liquid` renders two configurable looks with up to three product hotspots per look. Each look accepts a primary product handle for its featured image. Each hotspot accepts a product handle and retains the legacy `/products/<handle>` URL as a fallback. Product fragments are requested from `/products/<handle>?view=lookbook-card`; that view reuses the shared `product-loop` snippet and inserts the resulting `product-card` into server-rendered slider placeholders.

The lookbook does not use `<fox-popover>`. Hotspot selection and `slider-component` stay synchronized in both directions. Desktop uses a single-product slider with vertical previous/progress/next controls; tablet and mobile place the same slider below the image with horizontal controls. Events are `lookbook:change` and `lookbook:product-change`.

`<fox-popover>` is a reusable positioning and remote-content component. Triggers use `data-popover-trigger`, `data-popover-url`, `aria-controls`, and `aria-expanded`. The shared panel uses `data-popover-panel`, `data-popover-content`, optional `data-popover-arrow`, and `data-popover-close`. Public methods are `open(trigger)`, `close(options)`, `toggle(trigger)`, and `reposition()`. Events are `popover:opening`, `popover:opened`, `popover:closed`, and `popover:error`.

The component uses the existing Popper dependency with viewport flip and overflow prevention, and falls back to fixed viewport positioning. Remote HTML is cached by product handle. It closes on Escape, outside pointer interaction, look change, or disconnect and cleans up Popper, listeners, and pending requests.

---

## Pagination

`snippets/pagination.liquid` renders numbered links from the current Haravan
`paginate` object. Include it inside a `paginate` block. Pass
`pagination_page_size` for the progress count, `pagination_item_label` for its
unit, and `pagination_aria_label` for the navigation name. Progress and its
track are optional via `pagination_show_progress`; set
`pagination_progress_hidden` when keeping the count text hidden. The
`fox-pagination*` classes are shared across templates and styled by
`style-global.scss.liquid`. `data-role="pagination"` remains the stable hook
for collection AJAX updates.

## FOX Collection Page

`templates/collection.liquid` includes `collection-page.liquid`. The page
renders its heading, filters, product cards, and pagination with Liquid before
JavaScript runs. `collection.data.liquid` and `search.data.liquid` return a shared
`[data-role="results-content"]` fragment for enhanced updates. Product cards in
both fragments use `product_card_context = 'collection'`.

The merchant settings group has a banner, five primary filters (color, material,
size, price, fit), pagination, and advanced options. When enabled, the banner
uses `collection.image` first and `collection_banner.jpg` second; without an image,
the text heading remains. The 21 optional color entries match `color:Name` product
tags. A group remains visible when its setting is enabled, even if it has no
options: colors require enabled entries, material and fit require matching
collection tags, and price requires configured ranges above zero.

`core-commerce-collection.js` owns filter selection, sort, requests, history,
mobile filter focus, and the `collection:updated` event. It emits that event with
`detail.url`, `detail.query`, and `detail.append`. The root exposes
`data-state="ready|loading|error"`; results expose `aria-busy`. Pagination links
and the sort dropdown remain navigable without JavaScript. The mobile filter opens
as a dialog with Escape, focus return, and overlay scroll lock.
Each filter group renders a `ul` of labeled checkbox inputs. The input carries
`data-filter`, `data-filter-group`, `data-filter-value`, `data-filter-param-value`,
and `data-filter-label`;
the collection script reads its native `checked` state and listens for `change`.
The collection URL stores short, comma-separated filter values: `tag1` for color,
`tag2` for material, `variant` for size, `price` for ranges, and `tag3` for fit.
Tag values retain their `color:`, `material:`, or `fit:` prefix; price values use
`0-max`, `min-max`, or `min+`. The collection URL keeps `sort_by` for native
sorting. On reload, the script restores controls from these params and also
accepts older `q=filter=...` collection links before replacing them with the
short form.
Search requests use Haravan's `q=filter=(collectionid:product=...)` syntax:
`||` joins checked values in a group and `&&` joins distinct groups. The
`sortby` parameter maps the selected sort to a Haravan product field expression.
The request keeps `view=data` to load `templates/search.data.liquid`.
Price range settings are entered in VND for Haravan search; Liquid multiplies
them by 100 only when formatting their labels with `money`.

Files:

```text
FOX Fashion/config/settings.html
FOX Fashion/config/settings_data.json
FOX Fashion/snippets/collection-page.liquid
FOX Fashion/snippets/collection-filter.liquid
FOX Fashion/snippets/collection-results.liquid
FOX Fashion/snippets/pagination.liquid
FOX Fashion/templates/collection.data.liquid
FOX Fashion/templates/search.data.liquid
FOX Fashion/assets/core-commerce-collection.js
FOX Fashion/assets/core-commerce-collection.css
FOX Fashion/assets/collection.css
FOX Fashion/assets/style-global.scss.liquid
```
