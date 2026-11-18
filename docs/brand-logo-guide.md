# Brand & Logo Guide

Quy trình tạo **bộ nhận diện (logo kit)** cho mỗi theme. Rút ra từ bộ **FOX Activewear** (phương án 5A "Cân đối"), dùng lại
cho theme mới: **giữ nguyên quy trình, cấu trúc bộ file và tiêu chí**, chỉ đổi **hình tượng, tên và màu** theo chủ đề theme.

Được gọi từ `docs/THEME-BUILD-PLAYBOOK.md` (giai đoạn 1). Ảnh mẫu tham chiếu FOX: `FOX-Activewear-logo-tong-quan.png`,
`FOX-Activewear-logo-dang-tron.png` (bộ zip FOX lưu tại `brand/fox/` nếu đã tải về máy).

## 1. Đầu vào (hỏi user nếu chưa có)

| Mục | Ví dụ FOX |
|---|---|
| Tên theme / thương hiệu | "Fox Activewear - Thời trang thể thao" (đặt theo mẫu kho theme Haravan: `Tên - Ngành`) |
| Chủ đề / ngành hàng | đồ tập thể thao (yoga, pilates, chạy bộ) |
| Hình tượng gợi ý | con cáo: nhanh, linh hoạt |
| Tính cách | hiện đại, tối giản, năng động |
| Màu chủ đạo | mực `#1B2631` + nhấn theo ngành hàng (Activewear `#FF7A45`; Beauty `#E48AA8`; Home `#79A58C`) |
| Phong cách giao diện theme | kính tối (glassmorphism), bo góc lớn |

## 2. Các bước

1. **Kiểm tra tên trước khi vẽ:** tra nhãn hiệu (Cục SHTT, WIPO Global Brand Database). Ghi rủi ro vào brief
   (FOX: "Fox Racing" đã có trong ngành thể thao → khuyên tra cứu trước khi dùng thương mại).
2. **5 hướng ý tưởng** cho biểu tượng (mỗi hướng 1 ảnh PNG, cùng khung trình bày):
   - hình khối hình học (FOX: lăng kính);
   - ô / tile;
   - vòng tròn;
   - chi tiết đặc trưng của hình tượng (FOX: đuôi);
   - biểu tượng rút gọn tối đa (FOX: đôi tai).
   Đặt tên `{THEME}-logo_{n}_{ten-huong}.png`. Đánh giá **rủi ro giống logo nổi tiếng** cho từng hướng
   (FOX hướng 1 giống kiểu logo GitLab → loại).
3. **User chọn 1–2 hướng → 3–5 biến thể** (`{THEME}-logo-{n}{A..E}_{ten}.png`), khác nhau ở tỉ lệ, nét, cách tách khối.
4. **User chốt 1 biến thể** → dựng **bộ logo chuẩn** (mục 3).
5. Xuất **ảnh tổng quan** cả bộ (`{THEME}-logo-tong-quan.png`) + ảnh **dạng tròn** (`{THEME}-logo-dang-tron.png`) và zip.
6. Lưu bộ zip vào `brand/{theme}/` trong repo (thư mục kết quả của phiên làm việc không lưu lâu dài).

## 3. Bộ logo chuẩn (bắt buộc đủ 8 thư mục)

```text
{Theme}-logo/
├─ 00-svg/            {mark}.svg, {mark}-white.svg                      (biểu tượng vector)
├─ 01-bieu-tuong/     mau · trang · den-1-mau · trang-1-mau  × 512 / 1024 (PNG nền trong suốt)
├─ 02-lockup-ngang/   mau · dao-mau  × lon (≈866×359) / header@2x (≈444×184)
├─ 03-lockup-doc/     mau · dao-mau
├─ 04-logo-chung/     master mau · dao-mau (logo thương hiệu mẹ, không kèm ngành hàng)
├─ 05-favicon/        favicon-16/32/48/192/512.png · apple-touch-icon-180.png (tràn viền)
│                     favicon.ico (16/32/48/64) · favicon-tron.ico (16/32/48/64)
├─ 06-mang-xa-hoi/    avatar-1080.png · og-share-1200x630.png
└─ 07-dang-tron/      tron-kinh · tron-trang · tron-muc · tron-nhan  × 1024 / 512 / 256 (ngoài vòng tròn trong suốt)
```

- `05-favicon` (trừ PNG gốc 16/32/48/512), `.ico` và `07-dang-tron` sinh tự động:
  `python scripts/brand/derive-logo-assets.py <thư-mục-kit> --ink "#1B2631" --accent "#FF7A45"`.
- Bản **tròn trên nền màu nhấn** dùng biểu tượng **trắng một màu** (chi tiết màu nhấn sẽ chìm trên nền cùng màu).
- Bản "1 màu" phải là **một màu đặc thật** nếu dùng để khắc / in một màu (FOX còn thiếu bản đặc: 2 sắc độ cùng màu).

## 4. Tiêu chí thiết kế

- Biểu tượng **không chứa chữ**; đọc được ở **16px** (kiểm tra favicon 16 trước khi chốt).
- Hình học, ít chi tiết; tối đa 2 màu + trắng; một **chấm / chi tiết màu nhấn** làm điểm nhớ (FOX: chấm cam ở mũi).
- Biến thể trên nền tối dùng nền **kính tối chuyển sắc** của theme (cùng gradient với panel kính trong CSS) để logo và UI
  đồng bộ.
- Tỉ lệ biểu tượng trong khung tròn / vuông: rộng **≈48%** cạnh (theo avatar FOX).
- Không dùng hiệu ứng khó in (bóng đổ, gradient nhiều điểm) cho bản chính; gradient chỉ cho nền kính và một chi tiết nhấn.

## 5. Gắn vào theme

| Chỗ dùng | File |
|---|---|
| Logo header (upload trong settings "Thiết lập chung → Logo") | `02-lockup-ngang/*-header@2x.png` |
| Favicon (settings) | `05-favicon/favicon-32.png` hoặc `favicon.ico` |
| Ảnh đại diện story / chatbot / mạng xã hội | `07-dang-tron/tron-kinh` hoặc `tron-trang` |
| Ảnh chia sẻ link (OG) | `06-mang-xa-hoi/og-share-1200x630.png` |
| Avatar mặc định trong story (asset theme) | biểu tượng nền trong suốt, theo hướng dẫn trong settings của section |

Màu `ink` / `accent` của logo phải **trùng** token màu của theme (settings màu + biến CSS), không tạo bảng màu thứ hai.
