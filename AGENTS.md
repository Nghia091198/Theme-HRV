# AGENTS.md — Haravan Theme Core

## 1. Mission

Repository này phát triển một bộ source core tái sử dụng cho nhiều theme Haravan.

Mục tiêu của mọi thay đổi:

1. Giữ theme chạy đúng trên Haravan.
2. Tăng khả năng tái sử dụng.
3. Giảm logic trùng lặp.
4. Tách behavior khỏi giao diện thương hiệu.
5. Không làm giảm khả năng truy cập, SEO hoặc hiệu năng.
6. Không phá vỡ code hiện tại ngoài phạm vi task.

Đọc thêm:

- `docs/architecture.md`
- `docs/coding-standard.md`
- `docs/component-library.md`
- `docs/haravan-guidelines.md`
- `docs/migration-guide.md`

---

## 2. Repository Structure

Cấu trúc theme deploy lên Haravan:

```text
Theme/
├── assets/
├── config/
├── layout/
├── locales/
├── snippets/
└── templates/
```

Không tạo thư mục `sections/` trong `Theme/`.

Không giả định Haravan hỗ trợ cấu trúc theme của Shopify Online Store 2.0.

Tài liệu nội bộ, script tooling và source chưa build có thể nằm ngoài `Theme/`.

---

## 3. Core Principles

### 3.1. Liquid renders markup

Liquid chịu trách nhiệm render HTML và dữ liệu ban đầu.

JavaScript chỉ tăng cường behavior.

Không tạo một khối UI lớn bằng chuỗi HTML trong JavaScript khi Liquid có thể render nó.

Không nhúng Liquid markup phức tạp vào template string JavaScript.

### 3.2. Core owns behavior

Core quản lý:

- Lifecycle.
- State.
- Accessibility.
- Events.
- DOM behavior.
- Haravan API adapter.
- Slider engine.
- Drawer, modal, tabs và commerce behavior.

Theme quản lý:

- Màu sắc.
- Font.
- Khoảng cách theo thiết kế.
- Layout cụ thể.
- Animation mang tính thương hiệu.
- Hình dạng button và navigation.

### 3.3. Progressive enhancement

Nội dung chính phải đọc và thao tác được trước khi JavaScript hoàn tất.

Không để JavaScript là cách duy nhất tạo ra:

- Tiêu đề.
- Link.
- Product information.
- Slide markup.
- Cart item markup ban đầu.
- Nội dung SEO quan trọng.

### 3.4. Reusable by default

Không tạo core component chỉ hoạt động với một page hoặc một snippet.

Component dùng chung phải có ít nhất hai use case hợp lý.

Logic đặc thù một giao diện phải nằm ở file theme-specific, không đưa vào engine dùng chung.

### 3.5. Safe migration

Không xóa legacy implementation khi chưa kiểm tra mọi nơi đang sử dụng.

Không đổi markup contract công khai mà không cập nhật toàn bộ caller liên quan trong cùng task.

Không refactor ngoài phạm vi chỉ để “làm sạch”.

---

## 4. Mandatory Workflow

Trước khi sửa code:

1. Đọc file được yêu cầu.
2. Tìm mọi nơi tham chiếu đến class, selector, event, snippet hoặc asset liên quan.
3. Xác định implementation đang là core hay legacy.
4. Kiểm tra thứ tự load script và stylesheet.
5. Kiểm tra behavior khi JavaScript chưa sẵn sàng.
6. Trước khi tạo file mới, report đường dẫn chính xác, mục đích, caller/load point và
   file sẽ deploy lên Haravan hay chỉ dùng nội bộ. Nếu không tạo file mới, ghi rõ
   `Không tạo file mới`.
7. Nêu rõ assumptions trong phần tóm tắt nếu source không đủ thông tin.

Nếu phát sinh file mới ngoài danh sách đã report, phải thông báo bổ sung trước khi
tạo file đó.

Sau khi sửa code:

1. Kiểm tra syntax.
2. Kiểm tra selector không bị trùng hoặc sai scope.
3. Kiểm tra custom element không define hai lần.
4. Kiểm tra listener được cleanup.
5. Kiểm tra trạng thái empty và single item.
6. Kiểm tra mobile và desktop.
7. Kiểm tra keyboard và ARIA cho UI tương tác.
8. Ghi lại file đã sửa và lý do.
9. Đối chiếu file dự kiến tạo với file thực tế; ghi rõ file đã hủy hoặc phát sinh
   và lý do.

---

## 5. File Placement Rules

### 5.1. JavaScript

JavaScript deploy đặt trong:

```text
Theme/assets/
```

Quy ước tên file mới:

```text
core-foundation-*.js
core-component-*.js
core-commerce-*.js
vendor-*.js
```

Ví dụ:

```text
core-foundation-dom.js
core-foundation-events.js
core-component-slider.js
core-component-tabs.js
core-component-drawer.js
core-commerce-cart.js
scroll-viewport.js
home.js
```

Feature behavior riêng của theme dùng tên tính năng ngắn, không thêm prefix
`commerce-`, `fox-` hoặc `theme-`. Chỉ dùng `core-*` khi module brand-agnostic
và có mục tiêu tái sử dụng giữa nhiều theme.

Không thêm logic mới vào `components.js` nếu component có thể tách độc lập.

`components.js` được xem là legacy monolith trong quá trình migration.

### 5.2. CSS

CSS deploy đặt trong:

```text
Theme/assets/
```

Quy ước:

```text
core-foundation-*.css
core-component-*.css
core-commerce-*.css
template-*.css
```

Feature hoặc skin riêng của FOX dùng tên tính năng ngắn, ví dụ
`media-progress.css`. Không dùng tên dài như
`core-component-media-progress.css` cho feature thuộc FOX.

### 5.3. Liquid

Liquid reusable đặt trong:

```text
Theme/snippets/
```

Quy ước prefix:

```text
core-*
component-*
icon-*
```

Snippet riêng của theme dùng tên tính năng không prefix, ví dụ
`collection-page.liquid` hoặc `product-form.liquid`.

Template page đặt trong:

```text
Theme/templates/
```

Layout chỉ đặt trong:

```text
Theme/layout/
```

Settings chỉ đặt trong:

```text
Theme/config/
```

Translation chỉ đặt trong:

```text
Theme/locales/
```

---


## 5.6. FOX Project Prefix

Prefix thương hiệu/project cũ `tyt` hoặc `TYT` đã bị deprecate.

Trong mọi code mới và code được migration:

- Dùng tên tính năng không prefix cho file riêng của theme; giữ `core-*` cho module dùng chung và `component-*` cho snippet component dùng chung.
- Dùng `fox` cho CSS class, custom element modifier, data attribute, ID, key setting và namespace không phải function.
- Dùng `FOX` làm prefix cho function thuộc namespace/theme API.
- Không tạo thêm identifier mới bắt đầu bằng `tyt`, `TYT`, `Tyt`.
- Khi sửa một module legacy có prefix `tyt`, đổi toàn bộ caller liên quan trong cùng phạm vi task sang prefix mới.
- Không thay chuỗi nội dung hiển thị cho merchant nếu `TYT` là nội dung thương hiệu thực tế, trừ khi task yêu cầu đổi branding.

Ví dụ:

```text
tyt-home-slider.liquid → home-slider.liquid
tyt_slider             → fox_slider
TYT_THEME               → FOX_THEME
data-tyt-component      → data-fox-component
#tyt-header             → #fox-header
```

Function:

```js
function FOXInitSlider() {}
function FOXRegisterComponents() {}
function FOXUpdateCart() {}
```

Không dùng cho function mới:

```js
function tytInitSlider() {}
function foxInitSlider() {}
function TytInitSlider() {}
```

Function nội bộ thuần component không bắt buộc prefix nếu nằm trong module/class và không thuộc global theme API, ví dụ:

```js
class SliderComponent {
  init() {}
  destroy() {}
}
```

Nếu function được expose qua namespace toàn cục, dùng:

```js
window.FOX = window.FOX || {};
window.FOX.initSlider = FOXInitSlider;
```

---

## 6. JavaScript Rules

Sử dụng JavaScript hiện đại nhưng phải tương thích với browser target của theme.

Bắt buộc:

- Dùng `const` và `let`, không dùng `var` trong code mới.
- Ưu tiên early return.
- Một function chỉ làm một nhiệm vụ chính.
- Không tạo biến global mới.
- Không ghi trực tiếp vào `window` trừ public namespace đã được chấp thuận.
- Không dùng `eval`.
- Không dùng inline event handler như `onclick`.
- Không attach duplicate listener.
- Cleanup listener trong lifecycle teardown.
- Ưu tiên `AbortController` cho nhóm listener.
- Guard dependency trước khi dùng.
- Guard custom element trước khi define.
- Không swallow error quan trọng.
- Warning phải có namespace component.

Mẫu đăng ký custom element:

```js
if (!customElements.get('tabs-component')) {
  customElements.define('tabs-component', TabsComponent);
}
```

Không đăng ký custom element từ snippet tối ưu hóa hoặc template page.

Registration phải nằm trong asset JavaScript có thứ tự load rõ ràng.

---

## 7. Custom Element Rules

Không thực hiện DOM-heavy work trong constructor.

Dùng:

```text
constructor
```

chỉ để khởi tạo field nội bộ nếu cần.

Dùng:

```text
connectedCallback
```

để:

- Query DOM.
- Attach event.
- Khởi tạo dependency.
- Đồng bộ state ban đầu.

Dùng:

```text
disconnectedCallback
```

để:

- Abort listener.
- Disconnect observer.
- Destroy third-party instance.
- Hủy timer.
- Xóa reference không còn dùng.

Component phải idempotent:

- Connect lại không tạo instance trùng.
- Init lại không attach listener trùng.
- Destroy nhiều lần không throw error.

Public state nên phản ánh ra DOM:

```html
data-state="idle|loading|ready|error|disabled"
```

Các state phụ chỉ thêm khi cần:

```html
data-playing="true"
data-active-index="0"
data-item-count="4"
```

---

## 8. Event Rules

Dùng `CustomEvent`.

Event phải:

- Có namespace theo domain.
- Dùng chữ thường.
- Dùng dấu hai chấm.
- Bubble khi parent hoặc extension cần lắng nghe.
- Chứa `detail` nhỏ, ổn định và có ý nghĩa.

Ví dụ hợp lệ:

```text
slider:ready
slider:change
slider:play
slider:pause
slider:destroy
tabs:change
drawer:open
drawer:close
cart:updating
cart:updated
cart:error
product:variant-change
```

Không tạo event mới dạng:

```text
ready
change
update
swiper-ready
tab-change
```

Khi migration event legacy, có thể phát song song event cũ và mới trong giai đoạn chuyển tiếp nếu cần tương thích.

---

## 9. Liquid Rules

Liquid phải:

- Render HTML có nghĩa.
- Escape dữ liệu text khi phù hợp.
- Dùng URL từ settings đúng mục đích.
- Có fallback cho ảnh, alt text và giá trị rỗng.
- Khi tạo hoặc sửa markup ảnh Liquid, dùng `{% include 'render-img' %}` thay vì viết
  trực tiếp `<img>` tại caller; kiểm tra contract của helper và `docs/image-guide.md`.
- Không lặp markup lớn giữa nhiều slide hoặc product item.
- Tách item markup thành snippet khi lặp hoặc tái sử dụng.
- Giữ phần prepare data ở đầu file.
- Giữ markup chính dễ đọc.
- Tránh logic lồng sâu.
- Trong cùng một file, nếu một `settings.*` được tham chiếu quá 2 lần, tạo một
  `assign` có tên theo prefix component ở phần prepare data rồi dùng biến đó.
- Nếu một `settings.*` chỉ được dùng 1 hoặc 2 lần và không cần biến đổi phức tạp,
  gọi trực tiếp trong markup; không tạo biến trung gian chỉ để đổi tên.
- Chỉ dùng dialect Liquid đã được xác nhận trong source Haravan hiện tại.
- Dùng tag riêng lẻ như `assign`, `capture`, `if`, `elsif`, `else`, `case`, `when`, `for`, `unless`, `include`, `comment`, `paginate` và `form`.

Không:

- Không dùng block `{% liquid %}`.
- Không dùng tag `{% echo %}`.
- Không dùng tag `{% render %}`; snippet phải gọi bằng `{% include %}` theo syntax hiện có của repository.
- Không dùng tag `{% schema %}` hoặc giả định cơ chế section của Shopify Online Store 2.0.
- Tạo HTML component bằng JavaScript template string.
- Đăng ký custom element trong Liquid.
- Đặt business logic commerce phức tạp trong inline script.
- Gọi trực tiếp variable Liquid từ file `.js` thuần.
- Dùng tên settings không nhất quán trong code mới.

Dữ liệu Liquid truyền sang JavaScript qua:

1. `data-*` cho dữ liệu nhỏ.
2. `<script type="application/json">` cho object hoặc array.
3. Global config duy nhất đã được chuẩn hóa, chỉ khi thực sự cần.

---

## 10. HTML Rules

Ưu tiên semantic HTML.

Button thực hiện action phải dùng:

```html
<button type="button">
```

Link điều hướng phải dùng:

```html
<a href="...">
```

Mọi control icon-only phải có accessible name.

Không dựa chỉ vào class visual để xác định behavior.

Dùng behavior hooks rõ ràng:

```html
data-action="next"
data-action="previous"
data-role="pagination"
data-component="slider"
```

Không dùng ID nếu component có thể xuất hiện nhiều lần, trừ khi ID cần cho ARIA hoặc liên kết target.

ID được tạo phải unique theo instance.

---

## 11. CSS Rules

Core CSS không chứa branding cố định.

Bắt buộc:

- Ưu tiên class và custom element selector.
- Không style bằng ID.
- Không dùng `!important` trừ trường hợp override third-party có giải thích.
- Không tạo selector phụ thuộc DOM quá sâu.
- Dùng CSS custom properties cho token có khả năng theme hóa.
- Giữ focus-visible rõ ràng.
- Tôn trọng `prefers-reduced-motion`.
- Mobile-first khi phù hợp với component.
- Không để trạng thái hidden chỉ phụ thuộc opacity nếu element vẫn focus được.
- Theme hiện đặt `html { font-size: 62.5%; }`, nên `1rem = 10px` ở root mặc định.
  Khi viết hoặc sửa CSS, tính kích thước `rem` theo root thực tế; không lấy
  `1rem = 16px` từ ví dụ bên ngoài. Với control cần cỡ chữ 16px, dùng
  `font-size: 16px` hoặc `1.6rem`; khoảng cách/icon đi cùng control có thể
  dùng `em` để theo cỡ chữ của chính control. Kiểm tra kích thước render
  desktop và mobile trước khi hoàn tất.

Core CSS quản lý structure và state.

Theme CSS quản lý visual skin.

---

## 12. Slider Rules

`SwiperComponent` hoặc slider core là nơi duy nhất được phép gọi:

```js
new Swiper(...)
```

Không khởi tạo Swiper trực tiếp trong:

- Snippet.
- Template.
- `shop-optimize.liquid`.
- File page-specific.
- Callback jQuery.

Mọi slide phải được Liquid render trước.

Không thêm slide bằng `insertAdjacentHTML` sau `DOMContentLoaded` nếu slide có thể render server-side.

Slider core quản lý:

- Init.
- Destroy.
- Breakpoints.
- Navigation.
- Pagination.
- Loop.
- Autoplay.
- Public API.
- State.
- Events.
- Single-slide behavior.

Extension quản lý:

- Progress ring.
- Video lifecycle.
- Content reveal.
- Thumbnail synchronization.

Không nhét logic hero-specific vào slider engine.

Tên cấu hình mới:

```text
data-transition-duration
data-autoplay-delay
data-slides-mobile
data-slides-tablet
data-slides-desktop
data-space-mobile
data-space-tablet
data-space-desktop
```

Không dùng `data-speed` cho hai ý nghĩa khác nhau.

Legacy selector sau bị deprecate:

```text
.js-swiper-slider
```

Không tạo usage mới với selector này.

---

## 13. Haravan Commerce Rules

Không gọi endpoint commerce rải rác trong nhiều component.

Dùng một adapter/service chung cho:

- Add to cart.
- Change quantity.
- Remove item.
- Get cart.
- Search.
- Collection data request.

Commerce UI phải xử lý đủ:

```text
idle
loading
success
empty
error
```

Khi cập nhật cart:

1. Disable action gây submit trùng.
2. Phát event `cart:updating`.
3. Gọi API qua adapter.
4. Đồng bộ UI liên quan.
5. Phát `cart:updated` hoặc `cart:error`.
6. Khôi phục control state.

Không giả định response luôn thành công.

Không log thông tin nhạy cảm.

---

## 14. Accessibility Rules

Mọi component tương tác phải hỗ trợ keyboard phù hợp.

Tối thiểu:

- Tabs: Arrow, Home, End và ARIA tabs pattern.
- Modal/drawer: focus trap, Escape, restore focus.
- Slider controls: button có label.
- Accordion: button và `aria-expanded`.
- Loading control: `aria-busy` khi phù hợp.
- Error message quan trọng: vùng thông báo phù hợp.
- Motion: giảm animation khi người dùng yêu cầu reduced motion.

Không remove focus outline mà không có replacement rõ ràng.

---

## 15. Dependency Rules

Third-party library phải:

- Được load một lần.
- Có version rõ ràng.
- Có guard trước khi dùng.
- Không bị duplicate giữa nhiều snippet.
- Có fallback hoặc graceful failure.

jQuery là legacy dependency.

Không dùng jQuery trong component mới nếu Web API chuẩn đáp ứng được.

Không refactor toàn bộ jQuery chỉ vì task chạm vào một file nhỏ.

---

## 16. Performance Rules

Không preload tất cả ảnh.

Hero image đầu tiên có thể dùng eager và fetch priority phù hợp.

Ảnh ngoài viewport dùng lazy khi hợp lý.

Không tạo YouTube iframe cho slide chưa active nếu có thể trì hoãn.

Không autoplay nhiều video cùng lúc.

Không chạy MutationObserver trên toàn document nếu component có thể scope nhỏ hơn.

Không giữ observer hoặc timer sau khi component bị remove.

Không tải component page-specific trên mọi trang nếu chưa cần.

---

## 17. Security Rules

Không đưa token, secret hoặc credential vào theme.

Không render raw user-controlled HTML nếu không có lý do rõ ràng.

Không dùng `innerHTML` với dữ liệu runtime không đáng tin cậy.

Khi dùng URL từ settings:

- Kiểm tra giá trị rỗng.
- Không tự tạo scheme nguy hiểm.
- Không nối URL bằng input không kiểm soát.

Không chỉnh file `.haravan-cli_local.json` trừ khi user yêu cầu rõ.

---

## 18. Legacy Migration Rules

Legacy hiện tại gồm:

- `Theme/assets/components.js` dạng monolith.
- `.js-swiper-slider`.
- Direct `new Swiper(...)` ngoài slider core.
- Event như `swiper-ready`, `swiper-single`, `tab-change`.
- HTML slide được chèn trong `shop-optimize.liquid`.
- Inline component registration trong Liquid.
- jQuery behavior có thể thay bằng native API.

Trong code mới:

- Không tăng thêm dependency vào legacy.
- Không copy legacy pattern.
- Tạo adapter hoặc compatibility layer khi cần.
- Migration theo từng component.
- Xóa legacy chỉ sau khi tìm không còn caller.

---

## 19. Testing Checklist

Trước khi hoàn tất task, kiểm tra phù hợp phạm vi:

### General

- Không có syntax error.
- Không có duplicate custom element registration.
- Không có undefined dependency rõ ràng.
- Không có listener hoặc timer leak.
- Không tạo global mới ngoài chủ đích.
- Không có tag Liquid không được Haravan hỗ trợ: `liquid`, `echo`, `render`, `schema`.

### Responsive

- Mobile.
- Tablet.
- Desktop.
- Nội dung dài.
- Không có item.
- Một item.
- Nhiều item.

### Interaction

- Mouse.
- Touch.
- Keyboard.
- Focus.
- Reconnect component.
- DOM được thêm động nếu component hỗ trợ.

### Commerce

- Success.
- Network/API error.
- Double click.
- Empty cart.
- Sold-out hoặc unavailable variant.

---

## 20. Definition of Done

Một core component chỉ hoàn thành khi:

- Có trách nhiệm rõ ràng.
- Có markup contract.
- Có configuration contract.
- Có lifecycle cleanup.
- Có state contract.
- Có event contract.
- Có accessibility cơ bản.
- Có empty/single/multiple behavior.
- Không chứa branding.
- Không phụ thuộc một template duy nhất.
- Có documentation hoặc example.
- Không tạo legacy usage mới.
- Các file caller liên quan đã được cập nhật đồng bộ.

---

## 21. Response Format for Codex

Khi hoàn thành task, trả về:

1. Tóm tắt thay đổi.
2. Danh sách file đã sửa.
3. Đối chiếu file dự kiến tạo và file thực tế đã tạo.
4. Quyết định kiến trúc quan trọng.
5. Kiểm tra đã thực hiện.
6. Rủi ro hoặc phần chưa thể kiểm tra.

Không tuyên bố đã test trên Haravan thật nếu chưa thực hiện.

Không che giấu assumption hoặc giới hạn.

---

## 22. Agent And Skill Routing (V2)

AGENTS.md này giữ các invariant chi tiết ở trên. Các quy tắc v2 dưới đây chỉ bổ sung cách định tuyến context và role; không thay thế các invariant hiện hành.

### Skill layers

- Global skills mô tả workflow kỹ thuật dùng chung cho mọi project.
- Project skills mô tả kiến trúc Haravan và contract riêng của repository.
- Không cài `frontend-ui-engineering` đồng thời ở global và project scope.
- `haravan-theme-settings` tiếp tục là skill chuyên biệt cho settings hiện có.
- Khi tạo, sửa hoặc audit merchant settings, đọc `docs/settings-guide.md` và
  `docs/FOXTHEME_Setting_Libs_Full_v3.md` qua skill `haravan-theme-settings`.
  Thư viện FOXTHEME là reference cho control/pattern; setting keys và label theo
  `docs/settings-guide.md` khi hai tài liệu khác nhau.

### Routing

Đọc `docs/AGENT-ROUTING.md` để chọn global workflow, project skill, tài liệu chuyên môn và agent role phù hợp. Chỉ load tài liệu liên quan đến task.

### Pattern Discovery gate

Với UI mới hoặc UI thay đổi đáng kể, đọc `docs/PATTERN-DISCOVERY.md` trước khi implement. Phải tìm pattern hiện có, lập reference map cho structure/visual/behavior/motion và chỉ hỏi user khi còn nhiều lựa chọn hợp lý. Chỉnh sửa nhỏ đã có reference rõ ràng không cần ceremony đầy đủ.

### Conflict precedence

Khi tài liệu mâu thuẫn, giữ invariant cụ thể của repository và ưu tiên guide chuyên môn phù hợp; dùng `docs/GUIDANCE-CONFLICTS.md` để ghi nhận quyết định. Với merchant setting keys, `docs/settings-guide.md` là nguồn ưu tiên.

### Agent roles

- `code_mapper`: mapping read-only trước thay đổi cross-file hoặc UI non-trivial.
- `frontend_implementer`: implementation có phạm vi rõ.
- `haravan_reviewer`: review Haravan compatibility và regression.
- `ui_qc`: rendered responsive/accessibility/runtime QA.
- `migration_reviewer`: review migration và compatibility legacy.

Không delegate task trivial chỉ để tạo ceremony.
