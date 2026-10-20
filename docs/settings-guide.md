# Settings Guide

Tài liệu này chuẩn hóa cách tạo và sửa settings Haravan trong repo.

Thư viện control và ví dụ triển khai nằm ở
`docs/FOXTHEME_Setting_Libs_Full_v3.md`; skill
`.codex/skills/haravan-theme-settings/SKILL.md` yêu cầu đọc cả hai tài liệu
khi làm việc với settings. Nếu ví dụ trong thư viện khác quy tắc key, label,
media hoặc upload ở đây, áp dụng quy tắc trong guide này.

Rule of Label 

Element |	Type 	|	Title		| Example
input   | checkbox	|	Hiển thị?	| ✅ Good: <tr><strong>Hiển thị?</strong><td><input type="checkbox" name="use_logo" /></td></tr>
									  ❌ Bad: <tr><th><strong>Hiển thị?</strong></th><td><input type="checkbox" name="use_logo" /></td></tr>

## Nguyên Tắc Chung

- `settings.html` là giao diện cho merchant, nên label/heading/help text mặc định viết bằng tiếng Việt.
- Nếu plan, ticket, hoặc mockup dùng tiếng Anh, vẫn phải chuyển label quản trị sang tiếng Việt trừ khi user yêu cầu giữ tiếng Anh.
- Tên riêng của feature/brand có thể giữ nguyên, ví dụ `FOX media banner`, `FOX countdown offer`.
- Nếu boss/user gửi hình, theme mẫu, HTML mẫu hoặc CSS mẫu có nội dung tiếng Anh, khi đưa vào theme đang build phải chủ động dịch sang tiếng Việt tự nhiên và phù hợp tone theme.
- Quy tắc dịch áp dụng cho nội dung hiển thị ngoài storefront như title, badge, mô tả, button label, item title và default text trong `settings_data.json`.
- Không dịch tên riêng, brand, collection handle, URL, setting key, class name, file name hoặc identifier kỹ thuật.
- Chỉ giữ nguyên tiếng Anh khi user yêu cầu rõ hoặc đó là nội dung thương hiệu/tên riêng cần giữ.
- Ví dụ: `Shop by activity` -> `Mua sắm theo hoạt động`, `Shop now` -> `Mua ngay`, `Run` -> `Chạy bộ`, `Gym` -> `Tập gym`.
- Không dùng `{% schema %}`, `{% render %}`, `{% liquid %}`, `{% echo %}` trong theme Haravan này.

## Chuẩn Label Trong settings.html

Dùng cùng một bộ từ cho các control phổ biến:

```text
Show?                 -> Hiển thị?
Images                -> Hình ảnh
Desktop image         -> Hình ảnh
Mobile image          -> Hình ảnh
Image alt              -> Alt
Content               -> Nội dung
Badge                 -> Nhãn nhỏ
Title                 -> Tiêu đề
Description           -> Mô tả
Button label          -> Nhãn nút
Button URL            -> Đường dẫn
Deadline              -> Thời gian kết thúc
Countdown type        -> Kiểu countdown
Day                   -> Ngày
Month                 -> Tháng
Year                  -> Năm
Time format           -> Format / Giờ:phút:giây[20:00:00]
Style                 -> Giao diện
Text color            -> Màu chữ
Overlay opacity (%)   -> Độ mờ overlay (%)
```

Với tiêu đề chính của một section, label trong `settings.html` chỉ dùng `Tiêu đề`.
Không thêm hậu tố hoặc mô tả dư như `Tiêu đề khu vực`, `Tiêu đề section`,
`Tiêu đề khối` khi ngữ cảnh fieldset đã đủ rõ. Chỉ dùng label cụ thể hơn khi trong
cùng một nhóm có nhiều loại tiêu đề dễ nhầm lẫn.

Nếu file đang có dấu tiếng Việt, tiếp tục dùng dấu tiếng Việt. Nếu cần tạo tài liệu ASCII-only, ghi chú rõ đó là tài liệu nội bộ hoặc giới hạn môi trường.

### Chú Thích Của Setting

- Label chính luôn nằm trong `<strong>`.
- Chú thích đặt ngay dưới label, trong cùng ô `<td>`, theo đúng dạng `<p style="font-size: 12px;">...</p>`.
- Chú thích dùng cho kích thước, tỉ lệ, định dạng, ví dụ nhập liệu hoặc behavior khi bỏ trống.
- Không nhét kích thước hoặc tỉ lệ vào label chính.

```html
<tr><td><strong>Nhãn nút</strong><p style="font-size: 12px;">(bỏ trống để ẩn)</p></td><td><input type="text" name="slide_1_btntitle"/></td></tr>
```

Ví dụ hình ảnh:

```html
<tr><td><strong>Hình ảnh</strong><p style="font-size: 12px;">(tỉ lệ 9:16)</p></td><td><input type="file" name="feature_image.jpg"/></td></tr>
<tr><td><strong>Hình ảnh</strong><p style="font-size: 12px;">(160x160px)</p></td><td><input type="file" name="feature_tab_image.png"/></td></tr>
```

Không dùng `Ảnh poster 9:16`, `Ảnh tab` hoặc `Văn bản thay thế (alt)` làm label. Dùng `Hình ảnh` kèm chú thích và dùng label `Alt`.

### Setting Hình Ảnh Và Video

- Feature có video luôn phải có select loại media với ba lựa chọn: `Hình ảnh`, `YouTube`, `Link MP4`.
- Dùng value kỹ thuật thống nhất theo contract hiện có: `type_image`, `type_youtube`, `type_mp4`.
- Hình ảnh upload, đường dẫn YouTube và đường dẫn MP4 là ba dòng setting riêng.
- Không chỉ tạo riêng một input MP4 mà thiếu select loại media.

```html
<tr><td><strong>Loại media</strong></td><td><select name="feature_media_type"><option value="type_image">Hình ảnh</option><option value="type_youtube">YouTube</option><option value="type_mp4">Link MP4</option></select></td></tr>
```

### Hình Ảnh Thay Cho Icon

- Không tạo setting cho merchant nhập ID sprite, tên icon hoặc ID trong `svg-cache`.
- Không tạo input dạng `Icon`, `icon_id`, `sprite_id` hoặc hướng dẫn như `VD: ic-store`.
- Khi cần hình đại diện cho tab/card/item, chỉ cung cấp setting upload `Hình ảnh` với chú thích kích thước phù hợp.

## Cấu Trúc Fieldset

- Thêm setting mới gần nhóm liên quan, không tạo nhóm rời rạc.
- Dùng thứ tự để merchant dễ quét:
  1. Hiển thị / chế độ
  2. Giao diện
  3. Media
  4. Nội dung
  5. Link / CTA
  6. Logic thời gian hoặc behavior
- Giữ style wrapper hiện có:

```html
<fieldset>
  <legend>4. FOX countdown offer</legend>
  <div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">
    <table>
      ...
    </table>
  </div>
</fieldset>
```

## Đặt Tên Setting Key

- Setting key không dùng prefix `fox_`.
- Key nên có domain rõ ràng:

```text
countdown_show
countdown_title
countdown_btn_url
countdown_overlay_opacity
```

- File upload trong Haravan settings dùng tên có đuôi file nếu theme đang theo pattern đó:

```text
countdown_d_image.png
countdown_m_image.png
```

- Key trong `settings_data.json` phải khớp với `name` trong `settings.html`.

## Ảnh Upload

- Mọi ảnh mặc định và ảnh tạo mới phải tuân theo `docs/image-guide.md`, bao gồm
  giới hạn kích thước, dung lượng, định dạng và yêu cầu bám sát chủ đề theme.
- Không dùng hoặc upload `WebP` trong Haravan settings. Input file, setting key
  và fallback asset phải dùng `JPEG` hoặc `PNG`.
- Mỗi settings/section sở hữu ảnh riêng của chính nó.
- Không tạo option kiểu `Nguồn hình ảnh`, `reuse_media_banner`, hoặc reuse ảnh từ settings/section khác.
- Không mặc định đưa giá trị ảnh upload qua `product_img_url`.
- Nếu setting có thể trả về URL upload, xử lý theo hướng:
  - Nếu giá trị có `//`, dùng trực tiếp.
  - Nếu là filename asset, dùng `asset_url`.
- Khi cho merchant chọn `custom` nhưng chưa upload ảnh, cần có fallback rõ ràng.

## Countdown Settings

Countdown phải dùng contract thống nhất sau:

```text
countdown_type   deadline | daily
countdown_year   input number
countdown_month  select value 1..12, label "Tháng 1".."Tháng 12"
countdown_day    select value 1..31, label "Ngày 1".."Ngày 31"
countdown_time   input text theo format HH:MM:SS, ví dụ 20:00:00
```

- Label cho type là `Kiểu countdown`.
- Option type dùng tiếng Việt:
  - `deadline` -> `Có thời hạn`
  - `daily` -> `Lặp lại hàng ngày`
- Không tách giờ/phút/giây thành nhiều input riêng.
- Với `deadline`, JavaScript tính theo năm-tháng-ngày và `countdown_time`.
- Với `daily`, JavaScript bỏ qua năm-tháng-ngày và luôn đếm tới mốc `countdown_time` kế tiếp trong ngày.

## Checklist Trước Khi Hoàn Tất

- Label trong `settings.html` đã dùng tiếng Việt.
- Default data đã thêm vào `settings_data.json`.
- JSON parse được.
- Không có tag Liquid không hỗ trợ.
- File upload render được với cả uploaded URL và asset fallback.
- Không có ảnh upload settings dùng định dạng `WebP`.
- Ảnh fallback đạt giới hạn dung lượng trong `docs/image-guide.md`.
- Không có settings reuse ảnh từ section khác.
- Chú thích nằm trong `<p style="font-size: 12px;">` cùng ô label.
- Label ảnh dùng `Hình ảnh`, label alt dùng `Alt`.
- Feature có video dùng select `Hình ảnh / YouTube / Link MP4`.
- Không có setting nhập ID sprite hoặc icon identifier.
- Countdown dùng select cho ngày/tháng và một input text cho thời gian `HH:MM:SS`.
- Nếu tạo file settings/docs mới, báo rõ file nào deploy lên Haravan và file nào chỉ là nội bộ.
