# Pattern Discovery & Design Intent Resolution

## Mục đích

Tài liệu này bắt buộc agent **nhìn vào project trước khi tự thiết kế pattern mới**.

Mục tiêu:

- reuse đúng component/pattern hiện có;
- tránh sinh UI song song chỉ khác style;
- không tự đoán visual/motion khi project có nhiều reference hợp lệ;
- không hỏi user những gì source đã trả lời được;
- chỉ hỏi đúng phần design intent còn mơ hồ.

## Khi nào phải chạy

Chạy trước implementation khi task:

- tạo section mới;
- thêm modal/drawer/popover/accordion/tabs/slider UI mới;
- tạo card/list pattern mới;
- thay đổi đáng kể layout/visual/motion của một section;
- cắt UI từ mockup/reference;
- thêm interaction mà project đã có pattern tương tự.

Không cần ceremony đầy đủ cho chỉnh sửa nhỏ đã rõ reference, ví dụ đổi 1 spacing token hoặc sửa typo CSS.

## Flow bắt buộc

```text
User request
    ↓
Inspect source + caller + rendered examples
    ↓
Find nearest existing project patterns
    ↓
Build pattern map
    ↓
Resolve behavior reuse
    ↓
Design intent clear?
    ├── Yes → record reference map → implement
    └── No  → ask user with concrete options → record choice → implement
```

## Pattern map

Mọi task UI non-trivial phải đánh giá tối thiểu 4 chiều:

```text
STRUCTURE
VISUAL
BEHAVIOR
MOTION
```

Responsive là chiều bổ sung khi breakpoint/layout khác đáng kể.

### Structure

So sánh:

- container/wrapper;
- DOM hierarchy;
- content order;
- modal/dialog/card/slider surface;
- desktop/mobile composition;
- size/aspect/column/track behavior.

### Visual

So sánh:

- typography;
- spacing;
- radius;
- border/shadow;
- color/token;
- button/link treatment;
- media crop/overlay.

### Behavior

So sánh:

- component contract hiện có;
- keyboard/focus;
- open/close/toggle;
- state/events/public API;
- async/load/error behavior;
- slider/tabs/drawer/modal lifecycle.

Ưu tiên reuse shared behavior. Visual khác không phải lý do để duplicate engine.

### Motion

So sánh:

- fade/scale/slide/reveal;
- duration/easing;
- scroll preset;
- reduced-motion fallback;
- open/close transition.

Không tự thêm animation chỉ để UI “đẹp hơn”.

## Search-first rule

Trước khi hỏi user, agent phải search:

- `docs/component-library.md`;
- relevant snippets/templates;
- relevant CSS/JS assets;
- current callers/load points;
- shared utilities/tokens;
- browser-rendered pattern nếu tooling có sẵn.

Nếu source đã xác định được một reference duy nhất hợp lý, tự resolve và report. Không hỏi user để xác nhận điều project đã trả lời rõ.

## Clarification rule

Chỉ hỏi khi còn **design ambiguity thực sự**.

### Phải hỏi

- Có 2+ pattern production đều hợp lý.
- Mockup không thể hiện motion/interaction và các pattern hiện tại khác nhau đáng kể.
- User nói “giống modal cũ/section cũ” nhưng repo có nhiều candidate hợp lý.
- Yêu cầu tạo pattern mới nhưng không đủ thông tin để chọn giữa các structure khác nhau có ảnh hưởng UX.

### Không hỏi

- User đã chỉ rõ reference.
- Mockup/reference đủ rõ.
- Chỉ có một pattern production phù hợp.
- Behavior đã được core contract quyết định và user chỉ yêu cầu skin/composition.
- Câu hỏi có thể tự trả lời bằng source/docs.

## Cách hỏi đúng

Đưa ra candidate thật trong project, không hỏi mở chung chung.

Ví dụ modal:

```text
Tôi đã kiểm tra project:
- Behavior nên reuse shared modal-component hiện tại.
- Visual có 2 pattern gần nhất:
  1. Quick View: dialog content chuẩn, width vừa.
  2. Product Story: media modal lớn.

Bạn muốn modal mới bám visual/size của pattern nào?
Motion giữ default shared modal hay theo Product Story?
```

Nếu chỉ còn một chiều chưa rõ, chỉ hỏi chiều đó.

## Reference map trước khi code

Trước edit, plan cần ghi ngắn gọn:

```text
Reference map
- Structure: <existing pattern/file>
- Visual: <existing pattern/file>
- Behavior: <shared component/contract>
- Motion: <existing motion/preset or none>
- Responsive: <existing breakpoint/pattern>
```

Có thể ghi `new by requirement` nếu một chiều thực sự mới và user đã yêu cầu.

## Ví dụ: thêm modal newsletter

Agent nên tìm trước:

- shared `modal-component` contract;
- Quick View modal;
- Product Story modal;
- legacy modal chỉ để biết và tránh reuse nếu đã deprecated.

Kết luận kỳ vọng:

```text
Behavior → shared modal-component
Visual/structure/motion → resolve từ existing production patterns hoặc hỏi user nếu có nhiều lựa chọn
```

Không tạo `newsletter-modal.js` chỉ để tự viết lại open/close/focus/backdrop nếu shared modal đã đáp ứng.

## Ví dụ: cắt section từ mockup

Trước code, map:

```text
Section header  → existing shared section typography/header pattern
Container       → .container hoặc .container-fluid theo project convention
Card            → nearest current card pattern, nếu có
Slider/scroll   → slider-component / native scroll / fox-scroll preset phù hợp
CTA             → shared button/link treatment
Motion          → existing motion pattern hoặc none
```

Nếu card mới nhưng slider/button/header đều đã có, chỉ phần card được xem là pattern mới.

## Browser verification

Sau implementation, browser/QC phải so sánh với reference đã chọn:

- hierarchy/spacing có lệch không;
- control/motion có đúng behavior reference không;
- mobile/tablet/desktop có giữ pattern tương ứng không;
- có accidental new style làm section tách khỏi visual language của theme không.

Không tuyên bố “bám pattern” nếu chưa inspect rendered result khi browser tooling có sẵn.
