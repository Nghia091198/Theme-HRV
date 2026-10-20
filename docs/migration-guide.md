# Migration Guide — Legacy to Core

## 1. Nguyên tắc

Migration theo từng vertical slice.

Không rewrite toàn theme trong một pull request.

Mỗi phase phải:

- Có inventory caller.
- Có compatibility plan.
- Có rollback đơn giản.
- Không tạo thêm legacy usage.
- Xóa code cũ chỉ khi không còn reference.

---


## 2. Prefix Migration: TYT to FOX

Prefix legacy:

```text
tyt
TYT
Tyt
```

Prefix đích:

```text
Tên tính năng không prefix — file riêng của theme
fox  — selector, data attribute, setting, ID, namespace không phải function
FOX  — function public hoặc function thuộc theme namespace
```

Migration phải kiểm tra đồng bộ:

1. Tên file.
2. Import hoặc asset include.
3. CSS selector.
4. JavaScript query selector.
5. Liquid class/ID/data attribute.
6. Setting key và nơi đọc setting.
7. Event hoặc storage key có prefix project.
8. Function declaration và caller.
9. Global namespace.

Ví dụ:

```text
tyt-home-slider.liquid → home-slider.liquid
.tyt-slider            → .fox-slider
data-tyt-slider        → data-fox-slider
TYTInitSlider()        → FOXInitSlider()
tytInitSlider()        → FOXInitSlider()
```

Không rename nửa chừng. Nếu đổi identifier trong một module, mọi caller trong phạm vi module đó phải được cập nhật cùng task.

Không tự động đổi text hiển thị cho người dùng hoặc dữ liệu merchant chứa tên thương hiệu `TYT`.

## 2. Slider Migration

### Legacy hiện tại

Có hai hướng:

```text
<swiper-component>
```

và:

```text
.js-swiper-slider
```

Ngoài ra hero slider đang:

- Render slide đầu trong Liquid.
- Chèn slide 2–5 bằng JavaScript trong `shop-optimize.liquid`.
- Chèn navigation bằng JavaScript.
- Chèn progress bằng JavaScript.
- Define custom elements từ inline script.

### Target

```text
Liquid render toàn bộ slide
        ↓
Slider core init
        ↓
Extensions kết nối qua event
```

### Bước migration

1. Tạo inventory tất cả nơi dùng Swiper.
2. Tạo slider markup contract mới.
3. Tách `SwiperComponent` khỏi `components.js`.
4. Tạo asset `core-component-slider.js`.
5. Đăng ký custom element trong asset.
6. Render slide 1–5 trong Liquid.
7. Render navigation/pagination trong Liquid.
8. Tách progress thành extension.
9. Tách video lifecycle thành media extension.
10. Giữ event compatibility nếu caller cũ cần.
11. Chuyển topbar/product slider sang core.
12. Xóa `.js-swiper-slider` sau khi không còn caller.
13. Xóa `mainSlider()` injection sau khi hero mới hoạt động.

### Không làm

- Không đổi toàn bộ hero visual trong cùng task.
- Không đổi settings ID nếu không cần.
- Không gọi `new Swiper` ở theme script.
- Không giữ hai slider engine sau migration hoàn tất.

---

## 3. `components.js` Migration

### Legacy

`Theme/assets/components.js` đang chứa nhiều component và effect.

### Target

```text
core-component-slider.js
core-component-tabs.js
core-component-*.js
effect-*.js
```

### Cách tách

Mỗi lần tách một component:

1. Copy implementation sang file mới.
2. Chuẩn hóa lifecycle.
3. Chuẩn hóa event.
4. Thêm registration guard.
5. Load file mới đúng thứ tự.
6. Xóa implementation cũ khỏi monolith.
7. Search tên class/tag/event để tránh duplicate.
8. Test reconnect và dynamic DOM.

Không để cùng một custom element class được define từ hai file.

---

## 4. Event Migration

Mapping đề xuất:

```text
swiper-ready  → slider:ready
swiper-single → bỏ event riêng; dùng slider:ready + data-slide-count="1"
tab-change    → tabs:change
```

Trong giai đoạn tương thích:

```js
this.dispatchEvent(new CustomEvent('slider:ready', ...));
this.dispatchEvent(new CustomEvent('swiper-ready', ...));
```

Chỉ phát event legacy khi có caller thực tế.

Ghi chú deprecation trong code.

---

## 5. jQuery Migration

jQuery hiện là legacy dependency.

Không cố xóa jQuery toàn dự án ngay.

Khi sửa một component:

- Nếu logic độc lập và nhỏ, dùng native DOM API.
- Không thêm jQuery usage mới.
- Giữ plugin bắt buộc jQuery nếu chưa có replacement.
- Không load hai bản jQuery.
- Không chuyển syntax máy móc mà chưa test behavior.

---

## 6. Liquid Markup Migration

Khi HTML đang được tạo trong JavaScript:

1. Xác định dữ liệu có sẵn ở Liquid không.
2. Chuyển loop về Liquid.
3. Tách item thành snippet nếu dài.
4. Render control tùy chọn bằng Liquid.
5. JavaScript chỉ query contract và init behavior.
6. Giữ lazy-loading/media optimization.
7. Chuyển logic sang các tag Haravan riêng lẻ; không dùng `{% liquid %}`, `{% echo %}`, `{% render %}` hoặc `{% schema %}`.
8. Search toàn bộ file đã sửa để bảo đảm không còn tag không được hỗ trợ trước khi hoàn tất.

---

## 7. CSS Migration

Không đổi toàn bộ selector cùng lúc.

Ưu tiên:

1. Thêm core structural CSS.
2. Map legacy class vào markup mới tạm thời.
3. Chuyển theme visual sang modifier/custom property.
4. Xóa selector legacy khi không còn markup.

Không để migration làm thay đổi pixel ngoài mục tiêu nếu task chỉ là kiến trúc.

---

## 8. Commerce Migration

Tạo cart service trước khi refactor mọi UI cart.

Trình tự:

```text
Inventory request hiện tại
        ↓
Chuẩn hóa adapter
        ↓
Product form dùng adapter
        ↓
Cart drawer dùng adapter
        ↓
Cart page dùng adapter
        ↓
Xóa request trùng
```

Không thay endpoint dựa trên suy đoán.

---

## 9. Completion Checklist

Một migration hoàn thành khi:

- Không còn caller legacy trong phạm vi.
- Không còn duplicate implementation.
- Event mới được dùng.
- Script load đúng thứ tự.
- Dynamic reconnect hoạt động.
- Mobile/desktop hoạt động.
- Empty/single/error state hoạt động.
- Documentation được cập nhật.
