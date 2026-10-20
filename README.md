# Haravan Theme Core — Codex Agent Kit

Bộ tài liệu này được thiết kế để đặt trực tiếp vào root repository theme Haravan.

## Cách cài đặt

Sao chép:

```text
AGENTS.md
docs/
```

vào cùng cấp với thư mục:

```text
Theme/
```

Cấu trúc sau khi cài:

```text
project-root/
├── AGENTS.md
├── docs/
│   ├── architecture.md
│   ├── coding-standard.md
│   ├── component-library.md
│   ├── haravan-guidelines.md
│   ├── migration-guide.md
│   └── roadmap.md
├── Theme/
│   ├── assets/
│   ├── config/
│   ├── layout/
│   ├── locales/
│   ├── snippets/
│   └── templates/
└── ...
```

## Cách sử dụng với Codex

Codex phải đọc `AGENTS.md` trước khi sửa code.

Khi task liên quan kiến trúc hoặc component, Codex tiếp tục đọc tài liệu tương ứng:

- Kiến trúc tổng thể: `docs/architecture.md`
- Quy chuẩn code: `docs/coding-standard.md`
- Component contract: `docs/component-library.md`
- Đặc thù Haravan: `docs/haravan-guidelines.md`
- Chuyển đổi code cũ: `docs/migration-guide.md`
- Thứ tự triển khai: `docs/roadmap.md`

## Quy ước prefix

- `fox`: file, selector, ID, data attribute, setting và namespace project.
- `FOX`: function public hoặc function thuộc theme namespace.
- Prefix cũ `tyt`/`TYT` không được dùng trong code mới.

## Phạm vi áp dụng

Các quy tắc này áp dụng cho:

- Liquid.
- JavaScript.
- CSS/SCSS.
- Custom Elements.
- Swiper.
- Cart, product, search và collection behavior.
- Việc tạo mới hoặc chỉnh sửa file trong `Theme/`.

## Lưu ý

Bộ tài liệu định nghĩa kiến trúc đích. Codex không được tự động refactor toàn bộ source trong một task nhỏ. Mỗi thay đổi phải đúng phạm vi, giữ tương thích và có kế hoạch migration rõ ràng.
