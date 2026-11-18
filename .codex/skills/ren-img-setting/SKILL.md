---
name: ren-img-setting
description: Chụp và chú thích ảnh JPG storefront Haravan theo thứ tự các nhóm trong config/settings.html. Dùng khi cần ảnh đối chiếu settings cho một trang, drawer hoặc trạng thái UI; không dùng cho việc sửa theme.
---

# Render ảnh theo settings

Tạo ảnh giúp merchant nhận ra mỗi nhóm settings ứng với vùng nào trên storefront.

## Đối chiếu trước khi chụp

- Tìm đúng fieldset trong `config/settings.html` của theme đang dùng và đọc các nhóm con theo thứ tự. Kiểm tra trang đang chạy để xác nhận vùng nào thực sự xuất hiện.
- Chỉ gắn nhãn cho vùng có trong ảnh. Bỏ nhãn cấp cha chỉ lặp lại tên trang hoặc drawer mà ảnh đã thể hiện; giữ số của các mục con đúng như settings. Không tự đặt thêm số cho nhóm không được đánh số.
- Với nội dung có điều kiện như giỏ trống, sản phẩm gợi ý hoặc mã khuyến mãi, chọn trạng thái chụp phù hợp. Nếu một vùng vẫn không hiển thị, nêu lý do thay vì vẽ nội dung giả.

## Chụp và chú thích

- Mặc định chụp desktop rộng 1920 px, đợi ảnh và nội dung tải xong, xuất JPG. Chụp đủ chiều cao hoặc đủ trạng thái mà người dùng yêu cầu; không thêm dải heading trắng phía trên.
- Khi cần mở drawer, accordion hoặc ẩn icon nổi, chỉ tác động trong phiên trình duyệt chụp. Không sửa file theme hay settings trừ khi người dùng yêu cầu riêng.
- Quy cách mặc định cho bộ ảnh settings này: Arial Bold 25 px; chữ, khung và đường nối màu đỏ dịu `#CD6F6F`; viền vùng dày khoảng 5 px. Đặt khung lùi khỏi nội dung khoảng 18–25 px khi bố cục cho phép. Hộp nhãn dùng nền sáng đủ tương phản và không che nội dung quan trọng.
- Giữ nhãn đầy đủ trong mép ảnh. Nếu một nhãn dài, xuống dòng ở cỡ chữ đã chọn thay vì cắt chữ hoặc giảm cỡ tùy tiện. Không vẽ khung chồng lên tiêu đề hoặc khung khác.

## Kiểm tra đầu ra

- Soát ảnh cuối ở kích thước thật: đúng số và tên nhóm, đúng trạng thái UI, không thiếu ảnh tải chậm, không cắt nhãn, không có nét khung sát nội dung.
- Xác nhận định dạng JPG và chiều rộng 1920 px; xóa ảnh nguồn tạm. Lưu ảnh trong thư mục người dùng yêu cầu, hoặc `settings_image/` của repository khi không có chỉ định khác.
