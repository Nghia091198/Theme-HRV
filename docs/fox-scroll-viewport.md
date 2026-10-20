# FOX Scroll Viewport

## 1. Mục đích

`scroll-viewport.js` cung cấp behavior scroll dùng chung cho các section
Haravan. Liquid vẫn render toàn bộ nội dung; JavaScript chỉ tăng cường chuyển
động.

Assets:

```text
FOX Fashion/assets/scroll-viewport.js
FOX Fashion/assets/scroll-style.css
```

Hai asset được load toàn theme. Khi trang không có
`data-fox-scroll-viewport`, engine không tạo instance.

## 2. Kích hoạt

Đặt preset trên chính section:

```html
<section
  data-fox-scroll-viewport="collections"
  data-fox-scroll-effects="translate tilt fade header clip"
  data-fox-scroll-breakpoint="1024"
>
  ...
</section>
```

`data-fox-scroll-effects` là tùy chọn. Khi bỏ attribute này, preset dùng bộ effect
mặc định. Khi khai báo, danh sách explicit thay thế default của preset.

## 3. Preset

| Preset | Effect mặc định | Use case |
|---|---|---|
| `collections` | `translate tilt fade header clip` | Card collection chạy ngang |
| `shrink` | `clip scale translate` | Khung thu/mở và scale media |
| `section-shrink` | `clip scale translate` | Clip section và scale media |
| `hero-stack` | `translate scale parallax` | Stack hero chạy ngang |
| `media-text-horizontal` | `translate` | Danh sách media-text ngang |
| `morph-footer` | `translate fade` | Logo footer đi vào viewport |
| `media-text-reveal` | `clip scale fade translate` | Media mở từ tâm và reveal content |
| `hero-media-sequence` | `clip scale fade translate` | Hero nhiều layer theo timeline |
| `reveal` | `reveal` | Reveal element khi vào viewport |
| `counter` | `counter` | Counter chạy khi vào viewport |
| `lookbook-reveal` | `reveal` | Reveal tab, image, pin và content |

## 4. Hook dùng chung

| Hook | Trách nhiệm |
|---|---|
| `data-fox-scroll-window` | Vùng nhìn thấy dùng để đo overflow |
| `data-fox-scroll-inner` | Nhóm item được translate |
| `data-fox-scroll-item` | Một item trong sequence |
| `data-fox-scroll-media` | Media nhận scale, clip hoặc parallax |
| `data-fox-scroll-media-effect` | Element media cụ thể nhận zoom/parallax trong preset `shrink` |
| `data-fox-scroll-content` | Content nhận fade/translate và được đo chiều cao |
| `data-fox-scroll-header` | Header nhận fade/scale |
| `data-fox-scroll-background` | Background nhận clip-path |
| `data-fox-scroll-fade` | Target nhận edge-fade opacity |
| `data-fox-scroll-focus` | Control tự cuộn vào vùng nhìn thấy khi focus |
| `data-fox-scroll-sticky` | Layer sticky của preset |

Class giao diện có thể thay đổi mà không ảnh hưởng behavior. Không dùng class
visual làm hook JavaScript.

## 5. Collections

```html
<section
  data-fox-scroll-viewport="collections"
  data-fox-scroll-breakpoint="1024"
  data-fox-scroll-focus-overscan="144"
  data-fox-scroll-tilt-max="7"
  data-fox-scroll-tilt-span="0.5"
  data-fox-scroll-fade-start="0.9"
  data-fox-scroll-header-distance="200"
  data-fox-scroll-header-scale-min="0.82"
  data-fox-scroll-clip-start="0.05"
  style="--fox-scroll-item-count: 6"
>
  <div data-fox-scroll-background></div>
  <div data-fox-scroll-content>
    <header data-fox-scroll-header>...</header>
    <div data-fox-scroll-window data-fox-scroll-fade>
      <div data-fox-scroll-inner>
        <article data-fox-scroll-item data-fox-scroll-tilt>
          <a href="/collections/all" data-fox-scroll-focus>...</a>
        </article>
      </div>
    </div>
  </div>
</section>
```

Section tự quyết định scroll duration qua height:

```css
[data-fox-scroll-viewport='collections'][data-fox-scroll-state='ready'] {
  min-height: 230vh;
  height: clamp(
    230vh,
    calc(50vh * var(--fox-scroll-item-count, 1)),
    1000vh
  );
}
```

Engine không tự gán `height` hoặc `min-height`.

## 6. Shrink và section-shrink

Shrink:

```html
<section data-fox-scroll-viewport="shrink">
  <div data-fox-scroll-sticky>
    <div data-fox-scroll-inner>
      <div data-fox-scroll-translate="-20%,0%">...</div>
    </div>
  </div>
</section>
```

Thêm `data-fox-scroll-expand` trên root để đảo chiều progress.

Để khung bắt đầu full viewport rồi thu đúng theo mép content của `.container`, dùng
`data-fox-scroll-expand` cùng kích thước container:

```html
<section
  data-fox-scroll-viewport="shrink"
  data-fox-scroll-effects="clip scale"
  data-fox-scroll-expand
  data-fox-scroll-media-scale-max="1.12"
  data-fox-scroll-media-translate="4"
  data-fox-scroll-container-max="1400"
  data-fox-scroll-container-gutter="15"
  style="--fox-scroll-shrink-radius: 14"
>
  <div data-fox-scroll-sticky>
    <div data-fox-scroll-inner>
      <div data-fox-scroll-media>
        <img data-fox-scroll-media-effect src="..." alt="">
      </div>
    </div>
  </div>
</section>
```

`data-fox-scroll-container-max` là max-width của `.container`;
`data-fox-scroll-container-gutter` là padding inline của container. Hai giá trị dùng
đơn vị pixel và được engine đo lại khi viewport đổi kích thước.
`data-fox-scroll-media-scale-max` và `data-fox-scroll-media-translate` điều khiển zoom
và dịch dọc nhẹ của media bên trong, giúp khung vẫn giữ kích thước container nhưng
ảnh/video có chuyển động khi người dùng scroll qua section.

Section shrink:

```html
<section
  data-fox-scroll-viewport="section-shrink"
  data-fox-scroll-scale-max="1.3"
>
  <div data-fox-scroll-shift="start">...</div>
  <div data-fox-scroll-media>...</div>
  <div data-fox-scroll-shift="end">...</div>
</section>
```

`start` và `end` dịch ngược hướng nhau theo `--fox-scroll-clip-x`.

## 7. Horizontal stack

`hero-stack` và `media-text-horizontal` cùng dùng:

```html
<section data-fox-scroll-viewport="hero-stack">
  <div data-fox-scroll-window>
    <div data-fox-scroll-inner>
      <article data-fox-scroll-item>
        <img data-fox-scroll-media src="..." alt="">
        <a href="..." data-fox-scroll-focus>...</a>
      </article>
    </div>
  </div>
</section>
```

`hero-stack` bổ sung scale item đầu và parallax media. Preset
`media-text-horizontal` chỉ translate theo overflow.

## 8. Media reveal

```html
<section
  data-fox-scroll-viewport="media-text-reveal"
  style="--fox-scroll-section-height: 250vh"
>
  <div data-fox-scroll-sticky>
    <div data-fox-scroll-media style="--fox-scroll-media-radius: 35">
      <img src="..." alt="">
    </div>
    <div data-fox-scroll-content>...</div>
  </div>
</section>
```

Media mở clip từ tâm, scale từ `0.5` đến `1`; content fade và đi lên trong giai
đoạn tiếp theo.

## 9. Hero media sequence

```html
<section data-fox-scroll-viewport="hero-media-sequence">
  <div data-fox-scroll-sticky>
    <div data-fox-scroll-hero="first">
      <div data-fox-scroll-hero="first-content">...</div>
    </div>

    <div
      data-fox-scroll-hero="item"
      style="
        --fox-scroll-start-x: 20;
        --fox-scroll-start-y: 30;
        --fox-scroll-end-x: 50;
        --fox-scroll-end-y: 50;
      "
    >
      <img src="..." alt="">
    </div>

    <div data-fox-scroll-hero="second">
      <div data-fox-scroll-hero="second-content">...</div>
    </div>
  </div>
</section>
```

Các giá trị start/end là phần trăm viewport của section, viết dưới dạng số không
kèm `%`.

## 10. Reveal, counter và lookbook

Reveal:

```html
<section
  data-fox-scroll-viewport="reveal"
  data-fox-scroll-once="true"
  data-fox-scroll-distance="16"
  data-fox-scroll-duration="480"
  data-fox-scroll-stagger="90"
>
  <h2 data-fox-scroll-reveal="left">...</h2>
  <p data-fox-scroll-reveal="bottom">...</p>
</section>
```

Hướng hợp lệ: `top`, `bottom`, `left`, `right`.

Counter:

```html
<section data-fox-scroll-viewport="counter">
  <strong
    data-fox-scroll-counter="1500"
    data-fox-scroll-counter-start="0"
    data-fox-scroll-duration="1200"
    data-fox-scroll-decimals="0"
    data-fox-scroll-prefix=""
    data-fox-scroll-suffix="+"
  >1,500+</strong>
</section>
```

Giá trị hoàn chỉnh phải có sẵn trong Liquid để no-JS vẫn đọc được.

Lookbook:

```html
<section data-fox-scroll-viewport="lookbook-reveal">
  <button type="button" data-fox-scroll-lookbook="tab">...</button>
  <div data-fox-scroll-lookbook="content">...</div>
  <img data-fox-scroll-lookbook="image" src="..." alt="">
  <button type="button" data-fox-scroll-lookbook="pin" aria-label="..."></button>
</section>
```

## 11. State và event

Root phản ánh:

```text
data-fox-scroll-state="idle|ready|disabled|error"
```

Events bubble:

```text
scroll-viewport:ready
scroll-viewport:refresh
scroll-viewport:change
scroll-viewport:destroy
scroll-viewport:error
```

`scroll-viewport:change` có `detail.progress` từ `0` đến `1`.

## 12. CSS variables

Engine có thể cập nhật:

```text
--fox-scroll-progress
--fox-scroll-direction
--fox-scroll-overflow
--fox-scroll-item-count
--fox-scroll-content-height
--fox-scroll-tilt
--fox-scroll-fade-opacity
--fox-scroll-header-progress
--fox-scroll-header-scale
--fox-scroll-media-scale
--fox-scroll-content-opacity
--fox-scroll-content-y
```

Section có thể cung cấp:

```text
--fox-scroll-clip-x
--fox-scroll-gap
--fox-scroll-section-height
--fox-scroll-media-radius
--fox-scroll-item-width
--fox-scroll-media-width
--fox-scroll-media-width-tablet
--fox-scroll-media-width-desktop
```

## 13. Capability và fallback

Effect chỉ chạy khi:

```text
hover: hover
pointer: fine
prefers-reduced-motion: no-preference
viewport lớn hơn data-fox-scroll-breakpoint
```

Khi không đủ điều kiện, root có state `disabled`, inline effect được reset và nội
dung dùng layout tĩnh hoặc native horizontal scroll.

Zero item, single item hoặc không có overflow không tạo scroll listener. Hook bắt
buộc bị thiếu đặt state `error` nhưng không throw làm dừng script khác.

Listener, observer, animation và timer được cleanup khi section bị remove.

## 14. Quy tắc Haravan

- Render toàn bộ nội dung bằng Liquid trước khi JavaScript chạy.
- Dùng `{% include %}` cho snippet tái sử dụng.
- Không đặt registration hoặc business logic trong inline script Liquid.
- Không dùng cú pháp Liquid không được Haravan theme này hỗ trợ.

## 15. FOX Home Media Banner

FOX Home Media Banner dùng preset `shrink` đảo chiều:

```text
FOX Fashion/snippets/home-media-banner.liquid
```

Section bắt đầu full viewport, sau đó clip ngang về đúng mép `.container` và tăng
bo góc khi rời viewport. `data-fox-scroll-inner` bao trọn media lẫn content để hai
layer thu đồng bộ. Poster/video/YouTube dùng `data-fox-scroll-media-effect` để zoom
và dịch nhẹ bên trong khung khi scroll, tạo cảm giác section đang tương tác dù không
sticky/pin viewport. Section dùng `media-progress` cho MP4/YouTube và render poster
bằng Liquid. Khi scroll engine bị disabled trên touch hoặc reduced-motion, cùng
markup trở thành banner tĩnh và không ẩn nội dung.

Poster mặc định được giữ dưới 1 MB mỗi file để `haravan theme push-only` có thể
upload binary:

```text
assets/fox_hmb_d_image.png (960x540)
assets/fox_hmb_m_image.png (576x864)
```

## 16. FOX Scroll Media With Text

Caller production:

```text
FOX Fashion/snippets/home-scroll-media-text.liquid
```

Caller dùng preset `media-text-reveal` với `data-fox-scroll-breakpoint="767"` và chiều
dài scroll `250vh`/`250svh`. `data-fox-scroll-media` cung cấp
`--fox-scroll-media-radius` theo breakpoint để clip tròn bắt đầu khoảng `70px` trên
mobile và `130px` trên desktop. Timeline thuộc engine hiện có:

```text
0%  -> 40%  : clip tròn và scale media mở thành full viewport
40% -> 50%  : content fade-in và translate lên
50% -> 100% : giữ media và content ở trạng thái hoàn chỉnh
```

Hai hàng chữ dùng `<fox-marquee>` hiện có, cùng markup item nhưng direction ngược nhau.
Hàng thứ hai đặt `aria-hidden="true"`; clone của marquee engine cũng tự đặt
`aria-hidden="true"` và loại control khỏi tab order.

CSS caller chỉ pin viewport khi root có `data-fox-scroll-state="ready"`. Khi engine trả
`disabled` vì touch, reduced-motion hoặc breakpoint, cùng markup trở thành layout tĩnh.
Không có custom element, event hoặc global API mới; caller tiếp tục dùng state và event
`scroll-viewport:*`, `marquee:*` hiện có.
