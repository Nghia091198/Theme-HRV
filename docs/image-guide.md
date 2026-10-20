# Image Creation Guide

Tài liệu này chuẩn hóa việc chọn, tạo, xử lý và bàn giao hình ảnh cho theme.
Mọi ảnh mặc định được thêm vào `Theme/assets/` phải vượt qua các kiểm tra trong
guide này trước khi hoàn tất task.

## 1. Nguyên Tắc Bắt Buộc

- Ảnh phải bám sát ngành hàng, đối tượng khách hàng, bảng màu và phong cách hình
  ảnh của theme đang build.
- Không dùng một ảnh đẹp nhưng sai chủ đề chỉ để lấp chỗ trống.
- Phải xem ảnh, screenshot và asset hiện có của theme trước khi chọn hoặc tạo ảnh
  mới.
- Nếu boss/user cung cấp ảnh hoặc theme mẫu, giữ đúng tinh thần, bố cục và mục
  đích của mẫu; không sao chép logo hoặc nội dung có bản quyền không được phép.
- Không để chữ tiếng Anh nằm sẵn trong ảnh nếu theme đang dùng nội dung tiếng
  Việt, trừ khi user yêu cầu giữ nguyên hoặc đó là tên thương hiệu.
- Không hoàn tất task khi ảnh còn vượt ngưỡng dung lượng.

## 2. Kích Thước Và Dung Lượng

Các ngưỡng dưới đây là giới hạn sau cùng của file được đưa vào theme:

| Loại ảnh | Kích thước khuyến nghị | Giới hạn dung lượng |
| --- | --- | --- |
| Banner lớn / hero Desktop | Rộng `1920px`, chiều cao theo tỷ lệ thiết kế | Nhỏ hơn `1MB` |
| Banner lớn Mobile | Rộng `960–1080px`, tỷ lệ dọc theo thiết kế | Nhỏ hơn `500KB` |
| Banner section / media lớn | Rộng `1600–1920px` | Nhỏ hơn `1MB` |
| Banner nhỏ / card / collection | Rộng `800–1200px` | Nhỏ hơn `500KB` |
| Thumbnail hoặc ảnh phụ | Rộng `400–800px` | Ưu tiên nhỏ hơn `200KB` |

Quy tắc áp dụng:

- Banner Desktop được gọi là “banner lớn 1920” phải có chiều rộng đầu ra
  `1920px`, không chỉ đặt thuộc tính HTML `width="1920"`.
- Không upscale ảnh nguồn nhỏ, mờ lên `1920px`.
- Không giữ ảnh `3000–6000px` khi giao diện chỉ hiển thị tối đa `1920px`.
- Với ảnh có bản Desktop và Mobile, phải tối ưu từng file độc lập; không dùng
  nguyên file Desktop nặng cho Mobile.
- `1MB` được hiểu là nhỏ hơn `1,048,576 bytes`; `500KB` được hiểu là nhỏ hơn
  `512,000 bytes`.

## 3. Định Dạng Và Nén

- Không dùng hoặc upload `WebP` cho ảnh thuộc `settings.html`; Haravan settings
  không hỗ trợ định dạng này.
- Không dùng đuôi `.webp` cho input file, setting key hoặc fallback asset của
  ảnh merchant có thể upload.
- Dùng `JPEG` cho ảnh chụp; chất lượng tham khảo `76–85`.
- Chỉ dùng `PNG` khi ảnh cần nền trong suốt, đồ họa phẳng hoặc text/logo cần giữ
  nét. Không xuất ảnh chụp lớn sang PNG nếu làm dung lượng tăng mạnh.
- `WebP` chỉ được cân nhắc cho static asset không đi qua settings sau khi đã xác
  nhận load point hỗ trợ; mặc định vẫn ưu tiên `JPEG` hoặc `PNG`.
- Đuôi file phải khớp dữ liệu thật của file. Không dùng dữ liệu JPEG nhưng đặt
  tên `.png`, hoặc ngược lại.
- Tên file upload trong `settings.html`, key trong `settings_data.json`, fallback
  asset và định dạng thật phải đồng bộ.
- Xóa metadata không cần thiết nếu công cụ tối ưu hỗ trợ.
- Không giảm chất lượng đến mức xuất hiện banding, vỡ khối, viền răng cưa hoặc
  mất chi tiết sản phẩm.

## 4. Bám Sát Chủ Đề Theme

Trước khi tạo ảnh, xác định tối thiểu:

1. Ngành hàng và sản phẩm chính.
2. Đối tượng khách hàng.
3. Bảng màu và độ tương phản của theme.
4. Phong cách hình ảnh: studio, lifestyle, editorial, thể thao, tối giản hoặc
   cao cấp.
5. Vị trí nội dung phủ để chừa vùng an toàn cho tiêu đề và CTA.

Ảnh đạt yêu cầu khi:

- Sản phẩm, trang phục, bối cảnh và hoạt động đúng với nội dung section.
- Ánh sáng, màu sắc và cách crop hòa hợp với các section xung quanh.
- Chủ thể không bị cắt ở mặt, tay, sản phẩm chính hoặc vùng quan trọng.
- Vùng đặt chữ đủ sạch, không làm giảm khả năng đọc.
- Bộ ảnh nhiều item có cùng art direction, không trông như ảnh lấy từ nhiều
  theme khác nhau.

## 5. Quy Trình Tạo Ảnh

1. Đọc mockup và kiểm tra asset hiện có của theme.
2. Xác định đúng vai trò, tỷ lệ và breakpoint của ảnh.
3. Chọn hoặc tạo ảnh bám sát chủ đề theme.
4. Crop và resize về kích thước đầu ra thực tế.
5. Chọn đúng định dạng và nén tới ngưỡng dung lượng.
6. Kiểm tra trực quan Desktop/Mobile và vùng phủ nội dung.
7. Kiểm tra kích thước pixel, dung lượng byte, định dạng thật và tên file.
8. Chỉ sau khi vượt qua các bước trên mới thêm ảnh vào `Theme/assets/`.

Nếu công cụ tạo ảnh trả về file lớn hơn giới hạn, bắt buộc resize và encode lại.
Không đưa file gốc dung lượng lớn vào theme rồi để browser tự thu nhỏ.

## 6. Markup Và Hiệu Năng

- Trong Liquid mới hoặc khi sửa markup ảnh, gọi `{% include 'render-img' %}` thay vì viết
  trực tiếp thẻ `<img>` ở caller. Đọc `FOX Fashion/snippets/render-img.liquid`
  trước khi truyền tham số; snippet này nhận `src`, `alt`, `w`, `h`,
  `loading`, `decoding` và `type: 'tiny'` cho ảnh nhỏ.
- Với ảnh theme asset, truyền tên file gốc vào `src`; `render-img` tự gọi
  `asset_url`. Chỉ kiểm tra `src != blank` trước khi include, không lặp lại
  bước đổi URL hoặc tự dựng thẻ `<img>` tại mỗi caller.
- `render-img` hiện áp `asset_url` lên `src`, nên không truyền thẳng URL ảnh
  từ object Haravan hoặc URL bên ngoài khi chưa xác nhận helper hỗ trợ nguồn đó.
- Với collection chip, chỉ truyền ảnh upload từ setting. Nếu chưa upload, chỉ
  hiển thị tên bộ sưu tập; không dùng `collection.image.src` làm ảnh dự phòng.
- Truyền alt rõ ràng. Khi ảnh nằm trong link đã có nhãn chữ, giữ accessible name
  của link ngắn gọn và không để tên ảnh làm lặp nhãn.
- Khai báo `width` và `height` đúng tỷ lệ ảnh để tránh layout shift.
- Hero đầu trang có thể dùng `loading="eager"` và `fetchpriority="high"` khi phù
  hợp.
- Ảnh ngoài viewport dùng `loading="lazy"` và `decoding="async"`.
- Dùng `picture` hoặc source Mobile riêng khi bố cục/crop khác Desktop.
- Không preload toàn bộ banner hoặc toàn bộ ảnh card.
- Alt text phải mô tả đúng nội dung ảnh; ảnh trang trí dùng alt rỗng và không
  lặp lại nội dung ngay bên cạnh.

## 7. Checklist Trước Khi Bàn Giao

- [ ] Ảnh đúng chủ đề, tone và ngành hàng của theme.
- [ ] Banner lớn Desktop rộng `1920px` và nhỏ hơn `1MB`.
- [ ] Banner nhỏ/card nhỏ hơn `500KB`.
- [ ] Ảnh Mobile được tối ưu riêng.
- [ ] Kích thước pixel không lớn hơn nhu cầu hiển thị một cách vô lý.
- [ ] Định dạng thật khớp đuôi file.
- [ ] Không dùng WebP cho ảnh thuộc settings/upload của Haravan.
- [ ] Không dùng PNG nặng cho ảnh chụp khi JPEG phù hợp hơn.
- [ ] Không có chữ tiếng Anh ngoài chủ đích trong ảnh.
- [ ] Crop không che hoặc cắt chủ thể quan trọng.
- [ ] Text overlay và CTA vẫn đọc rõ trên Desktop/Mobile.
- [ ] Markup có width, height, loading, decoding và alt phù hợp.
- [ ] Đã báo rõ ảnh nào được tạo mới, ảnh nào được tối ưu hoặc kế thừa.
