# Roadmap — Haravan Theme Core

## Phase 0 — Baseline

Mục tiêu:

- Chốt AGENTS rules.
- Chốt naming.
- Chốt event convention.
- Chốt folder/prefix convention.
- Chốt browser support.
- Tạo inventory dependency.

Deliverables:

```text
AGENTS.md
docs/
component inventory
legacy inventory
script loading map
```

---

## Phase 1 — Slider Reference Architecture

Mục tiêu:

- Một slider engine duy nhất.
- Liquid render toàn bộ slide.
- Hero, topbar và product carousel dùng cùng core.

Tasks:

1. Audit mọi `new Swiper`.
2. Audit `.js-swiper-slider`.
3. Tách slider component.
4. Tách progress.
5. Tách media lifecycle.
6. Chuyển hero.
7. Chuyển topbar.
8. Chuyển product carousel.
9. Xóa legacy slider path.

Definition of Done:

- Không direct `new Swiper` ngoài core.
- Không JavaScript chèn slide markup.
- Single slide hoạt động.
- Keyboard control có label.
- Reconnect không duplicate.

---

## Phase 2 — UI Primitive Core

Thứ tự:

1. Tabs.
2. Accordion.
3. Drawer.
4. Modal.
5. Quantity input.
6. Disclosure.
7. Media.

Mục tiêu:

- Chung lifecycle.
- Chung event naming.
- Chung focus/scroll-lock foundation.
- Không branding.

---

## Phase 3 — Foundation

Tạo hoặc chuẩn hóa:

```text
DOM utility
Event helper
Focus trap
Scroll lock
Fetch wrapper
Route config
Money format adapter
Breakpoints
```

Không tạo utility nếu chỉ có một caller và chưa có giá trị tái sử dụng.

---

## Phase 4 — Product Core

Tasks:

1. Product card contract.
2. Variant selector.
3. Product form.
4. Quantity.
5. Product gallery.
6. Quick view nếu thực sự cần.

Mục tiêu:

- Variant state thống nhất.
- Add-to-cart qua commerce adapter.
- UI không duplicate logic.

---

## Phase 5 — Cart Core

Tasks:

1. Cart service.
2. Cart item renderer/update.
3. Cart drawer.
4. Cart badge.
5. Cart page sync.
6. Error/empty/loading state.

Mục tiêu:

- Một request layer.
- Nhiều UI subscribe event.
- Chống double submit.

---

## Phase 6 — Search and Collection

Tasks:

1. Search service.
2. Search drawer.
3. Search result markup contract.
4. Collection filter.
5. Pagination/load-more strategy.
6. URL state.

---

## Phase 7 — Starter Theme

Starter theme gồm:

```text
Header
Footer
Home hero
Featured collection
Collection page
Product page
Cart drawer
Search drawer
Core tokens
Core components
```

Starter theme ưu tiên correctness và khả năng tái sử dụng, không ưu tiên visual hoàn chỉnh.

---

## Phase 8 — Documentation and Quality

Tasks:

- Component examples.
- Migration examples.
- Accessibility review.
- Performance baseline.
- Lighthouse/manual checklist.
- Haravan deployment checklist.
- Release/versioning convention.

---

## Quy tắc ưu tiên

Mỗi phase chỉ bắt đầu khi contract phase trước đủ ổn định.

Không mở nhiều component refactor song song nếu slider reference architecture chưa hoàn tất.

Ưu tiên giảm duplicated behavior trước khi tối ưu build phức tạp.
