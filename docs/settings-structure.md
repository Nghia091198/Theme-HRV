# Settings Structure (settings.html)

Quy định **cấu trúc, thụt lề, xuống dòng, khoá cấu trúc và công cụ** cho `FOX Fashion/config/settings.html`.
Key, label, chú thích, media, upload: theo `docs/settings-guide.md` (tài liệu này không quy định chữ của label).

Cấu trúc trong file này coi như **cố định cho mọi theme sau**. Theme mới chỉ đổi UI/UX; vị trí các nhóm giữ nguyên.
Phần được phép thay đổi giữa các theme là **nội dung bên trong "1. Trang chủ"** (các section trang chủ), còn vị trí
của nhóm "1. Trang chủ" vẫn ở đúng chỗ.

## 1. Bản đồ nhóm (khoá)

Thứ tự dưới đây được khoá trong `docs/settings-structure.lock.json`. Không chèn, đổi chỗ, đổi tên nếu chưa cập nhật khoá.

```text
[phân vùng] Thiết lập tổng quát
  **** Tính năng mua hàng ****             ← công tắc bật / tắt bán hàng toàn site (docs/core-features.md §0.1)
  1. Thiết lập chung                       ← cả cụm là nền tảng mọi theme (docs/core-features.md §0)
       1. Logo và Favicon · 2. Kiểu chữ · 3. Màu sắc · 4. Mạng xã hội
       5. Popup đăng ký nhận tin          ← tính năng chuẩn (docs/core-features.md §1)
       6. Thông báo đơn hàng gần đây      ← tính năng chuẩn (docs/core-features.md §2)
  2. Các neo icon
  3. Đầu trang
  4. Chân trang
  5. Haravan App
  ***** Ecommerce Solutions App *****
[phân vùng] Thiết lập các trang
  1. Trang chủ                                   ← nội dung bên trong được phép đổi (cảnh báo, không chặn)
  2. Trang Nhóm sản phẩm
  3. Trang sản phẩm
  4. Trang tài khoản
  5. Trang danh sách bài viết
  6. Trang chi tiết bài viết
  7. Trang giỏ hàng & Minicart
  8. Trang Tìm kiếm & Dropdown Search
  9. Trang nội dung                              ← trang nội dung không chọn giao diện riêng (templates/page.liquid)
  10. Trang liên hệ [page.contact]
  11. Trang Về chúng tôi [page.about]
  12. Trang công nghệ chất liệu [page.fabric-lab]
  13. Trang FAQ [page.faq]
  14. Trang yêu thích [page.wishlist]
  15. Trang hướng dẫn chọn size [page.size-guide]
```

- Nhóm **trang hệ thống** (trang chủ, danh mục, sản phẩm, tài khoản, blog, bài viết, giỏ, tìm kiếm, trang nội dung mặc định
  `page`) xếp trước; **trang dùng template riêng** (`page.xxx`) xếp sau, legend ghi **template trong ngoặc vuông**:
  `10. Trang liên hệ [page.contact]`.
- Trang hệ thống mới chèn **cuối nhóm trang hệ thống**; trang `page.xxx` mới thêm **cuối dãy**. Sau khi chèn, đánh số lại
  liền mạch và cập nhật khoá có chủ đích (mục 5).
- Số thứ tự nhóm cấp 1 phải liền mạch 1 → N, không trùng. Nhóm công tắc / ứng dụng có legend bọc `****` (vd
  "**** Tính năng mua hàng ****") **không đánh số** và không tính vào dãy số (khung mục 3.4).

## 2. Thụt lề và xuống dòng

Định dạng do `scripts/format-settings-html.mjs` áp dụng, chạy tự động khi lưu file trong VS Code.

- **Tab**, không dùng dấu cách. Xuống dòng **CRLF**. Không có khoảng trắng cuối dòng. File kết thúc bằng 1 dòng trống.
- **Mỗi thẻ cấu trúc một dòng:** `<fieldset>`, `</fieldset>`, `<legend>…</legend>`, `<div …>`, `</div>`, `<table>`,
  `</table>`, `<img …>`, `<h3>…</h3>` (cột ảnh), `<p>…</p>` (hướng dẫn).
- **Mỗi hàng setting một dòng:** `<tr><td>…</td><td>…</td></tr>`. Không tách `<tr>` / `<td>` / `<select>` / `<option>`
  ra nhiều dòng. Ngoại lệ duy nhất: hàng có `<textarea>` mà giá trị mặc định nhiều dòng thì giữ nguyên.
- **Thụt lề = số thẻ `fieldset` / `div` / `table` đang mở + 1.** Tiêu đề phân vùng `<h3>` ở cấp ngoài cùng nằm ở cột 0.
  Ví dụ (nhóm giỏ hàng):

```text
→<fieldset>                         1
→→<legend>…</legend>                2
→→<div class="col-sm-12 setnd">     2
→→→<div class="col-sm-6">           3
→→→→<fieldset>                      4
→→→→→<legend>1. …</legend>          5
→→→→→<div style="…">                5
→→→→→→<table>                       6
→→→→→→→<tr>…</tr>                   7
```

- Dòng trống: **đúng 1 dòng trống sau mỗi nhóm cấp 1** (giữa các nhóm cấp 1), không chứa tab; không có dòng trống bên trong nhóm.
- Thẻ `</fieldset>` đóng nhóm cấp 1 nằm **cùng cấp thẻ mở** (1 tab). Chỉ tiêu đề phân vùng `<h3>` và thẻ đóng thừa (nếu có)
  ở cột 0.

## 3. Khung chuẩn của nhóm cấp 1

### 3.1. Trang một bề mặt: hướng dẫn + 1 ảnh xem trước + cột settings

Dùng cho **trang `page.xxx`** (legend ghi template trong ngoặc vuông: `13. Trang FAQ [page.faq]`) và **trang hệ thống một
bề mặt** (legend không có ngoặc vuông: `9. Trang nội dung`). Với trang hệ thống, hướng dẫn nói rõ **trang nào dùng mẫu
này** (vd "trang nội dung không chọn giao diện riêng sẽ dùng mẫu này") thay vì hướng dẫn tạo trang.

```html
	<fieldset>
		<legend>13. Trang FAQ [page.faq]</legend>
		<div class="col-sm-12">
			<p>- Tạo mới một trang nội dung cho trang <strong>…</strong>, bạn truy cập vào mục <strong>Website</strong> → <strong>Trang nội dung</strong> → <strong>Tạo trang.</strong></p>
			<p>- Tại bước <strong>Tạo trang</strong>, phần giao diện → bạn chọn <strong>page.faq</strong> và nhấp <strong>Lưu.</strong></p>
			<p>- (điều kiện thêm nếu có: blog nguồn, đường dẫn phải khớp, dữ liệu dùng chung…)</p>
		</div>
		<div class="col-sm-12 setnd">
			<div class="col-sm-6">
				<img src="https://cdn.hstatic.net/files/…/page-faq.jpg" style="width:97%;max-width: 100%;">
			</div>
			<div class="col-sm-6">
				<fieldset>
					<legend>1. …</legend>
					<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">
						<table>
							<tr>…</tr>
						</table>
					</div>
				</fieldset>
			</div>
		</div>
	</fieldset>
```

- Hướng dẫn tạo trang luôn nằm ở `<div class="col-sm-12">` đầu nhóm, mỗi ý một `<p>- …</p>`. Không đặt hướng dẫn tạo trang
  thành hàng chú thích trong bảng.
- Ảnh xem trước: **một ảnh chụp toàn trang**, upload CDN Haravan. Chưa có ảnh thì để `src=""`.

### 3.2. Nhóm có 2 bề mặt (Giỏ hàng & Minicart, Tìm kiếm & Dropdown Search)

```text
7. Trang giỏ hàng & Minicart
├─ col-sm-6: <h3>Mini Cart</h3> + khung + <img>;  <h3 style="margin-top: 15px;">Trang giỏ hàng</h3> + khung + <img>
└─ col-sm-6:
     1. Mini cart đầu trang           ← bề mặt nhỏ: MỘT bảng, chia khối bằng <h3>
     2. Trang giỏ hàng                ← bề mặt nhiều section: khung viền đủ 4 cạnh chứa fieldset con
          2.1. … 2.2. … 2.5.
```

- Khung ảnh: `<div style="border:1px solid #eeeeee;padding:10px 10px 10px 10px;margin-top:-10px">`.
- Khung chứa fieldset con cấp 2 (vd "2. Trang giỏ hàng"): viền **đủ 4 cạnh**, cùng style khung ảnh.
- Fieldset chứa bảng setting: viền **trái + dưới**
  (`border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px`).

### 3.3. Nhóm thiết lập chung (1 → 5 phân vùng "Thiết lập tổng quát")

`<fieldset>` → `<legend>N. …</legend>` → `<div class="col-sm-12">` → các fieldset con đánh số. Không có cột ảnh.

### 3.4. Nhóm công tắc / ứng dụng (không đánh số)

Dùng cho công tắc ảnh hưởng **toàn site** hoặc nhóm ứng dụng ngoài, không thuộc một trang: **"**** Tính năng mua hàng ****"**
(đứng **đầu** phân vùng "Thiết lập tổng quát", trước "1. Thiết lập chung"), "***** Ecommerce Solutions App *****".

```html
	<fieldset>
		<legend>**** Tính năng mua hàng ****</legend>
		<div class="col-sm-12">
			<table>
				<tr><td><strong>Sử dụng?</strong><p style="font-size: 12px;">(tác dụng khi bỏ tích …)</p></td><td><input type="checkbox" name="shop_buying" value="1" checked="checked"/></td></tr>
			</table>
		</div>
	</fieldset>
```

- Legend bọc dấu `*` hai bên, **không đánh số**, không tính vào dãy số 1 → N của các nhóm cấp 1.
- Một bảng, không fieldset con, không cột ảnh; chú thích ghi rõ **tác dụng khi bỏ tích**.
- Công tắc có tác dụng mạnh (tắt bán hàng…) phải **mặc định bật** trong `settings_data.json` (xem `core-features.md` §0.1).

## 4. Khi nào dùng `<h3>`, khi nào dùng fieldset con

| Tình huống | Dùng | Ví dụ |
|---|---|---|
| Một **section / vùng riêng** trên storefront (thường có "Hiển thị?" riêng), hoặc vùng chức năng tách biệt | **fieldset con** đánh số `N.` | "3. Bộ lọc sản phẩm", "4. Phân trang", "2.2. Khuyến mãi dành cho bạn" |
| Nhóm cấp 1 phủ **2 bề mặt khác nhau**, bề mặt thứ hai có nhiều section | khung viền 4 cạnh + **fieldset con cấp 2** `N.M.` | "2. Trang giỏ hàng" → "2.1 … 2.5" |
| Mục lặp lại **lớn**: mỗi mục có media + nhiều trường (khoảng 6 dòng trở lên) | **fieldset con không đánh số** cho từng mục | "Câu chuyện N", "Trang trình chiếu N", "Danh mục N" |
| Mục lặp lại **nhỏ** (khoảng 2–5 dòng mỗi mục) trong cùng một section | **`<h3>`** trong bảng | "Tab 1…5", "Mã 1…5", "Kênh 1…3", "Bước 1…3", "Mẹo 1…3" |
| Các phần con của **một** bề mặt / section, không phải section riêng trên trang | **`<h3>`** trong bảng | "Cài đặt chung / Tìm kiếm gần đây / Sản phẩm đề xuất" (bảng tìm kiếm); "Đầu trang / Khi trống" (trang yêu thích) |
| Nhãn ảnh trong cột xem trước | `<h3>` trong cột ảnh | "Mini Cart", "Trang giỏ hàng" |

Quy tắc thêm:

- Tối đa **3 cấp fieldset** dưới nhóm cấp 1 (bề mặt → section → mục lặp lại). Cần sâu hơn thì chuyển cấp dưới cùng sang `<h3>`.
- `<h3>` trong bảng luôn ở dạng hàng riêng: `<tr><td colspan="2"><h3>Tên</h3></td></tr>`. Không thêm style cho `<h3>` mới.
  Kiểu `<h3 style="margin-left: -10px;">` chỉ còn trong nhóm "11. Trang Về chúng tôi" (giữ nguyên, không nhân rộng).
- Khối `<h3>` có thể có "Hiển thị?" riêng nếu là phần nhỏ của một bề mặt (vd "Miễn phí vận chuyển" trong mini cart).
- Hàng chú thích trong bảng (`<tr><td colspan="2"><p style="font-size: 12px;">…</p></td></tr>`) chỉ dùng cho lưu ý thuộc
  về nhóm đó (vd "Dùng chung cho bảng tìm kiếm và trang tìm kiếm"). Hướng dẫn tạo trang đặt ở đầu nhóm (mục 3.1).
- Thứ tự dòng trong một section: Hiển thị → Giao diện → Media → Nội dung → Link / CTA → Behavior (theo settings-guide).

### Nội dung dùng chung giữa nhiều trang

Khi một khối xuất hiện ở nhiều trang (vd vùng **Cam kết mua sắm** ở danh mục, sản phẩm, giỏ hàng, trang nội dung; **thanh
bên** ở blog, bài viết, trang nội dung):

- **Nội dung chỉ nằm ở một nơi** (nhóm gốc), vd 4 cam kết ở "2. Trang Nhóm sản phẩm → 6. Cam kết mua sắm".
- Mỗi trang khác chỉ có **công tắc riêng** ("Hiển thị?") trong nhóm của trang đó, kèm chú thích **chỉ chỗ chỉnh nội dung**:
  `(… nội dung dùng chung, chỉnh tại "2. Trang Nhóm sản phẩm → 6. Cam kết mua sắm")`.
- Khối có **cấu hình khác nhau theo trang** (vd thanh bên: menu, blog nguồn) thì mỗi trang có **bộ setting riêng** với
  tiền tố của trang (`page_menu`, `article_menu`, `blog_menu`); snippet dùng chung đọc đúng bộ theo ngữ cảnh.
- Tên snippet dùng chung **không mang tên một trang** (vd `content-sidebar.liquid`, không phải `blog-sidebar.liquid`).

## 5. Khoá cấu trúc

- File khoá: `docs/settings-structure.lock.json` (phân vùng, cây fieldset theo legend, thứ tự key trong từng fieldset).
- Kiểm tra: `node scripts/settings-lock.mjs` (tự chạy sau khi lưu `settings.html` trong VS Code).
  - Thứ tự phân vùng và nhóm cấp 1: **lỗi** nếu khác khoá.
  - Bên trong mọi nhóm, trừ "1. Trang chủ": **lỗi** nếu nhóm con, thứ tự nhóm con, key hoặc thứ tự key khác khoá.
  - Bên trong "1. Trang chủ": **cảnh báo**, không chặn.
- Cố ý đổi cấu trúc (thêm trang mới, thêm setting): sửa xong chạy `node scripts/settings-lock.mjs --update`, rồi kiểm tra
  phần thay đổi của file khoá trước khi đồng bộ.
- Thử khoá trên bản sao (không đụng file thật): `node scripts/test-settings-lock.mjs`.

## 6. VS Code

| File | Vai trò |
|---|---|
| `.editorconfig` | `settings.html`: tab, CRLF, UTF-8; `settings_data.json`: dấu cách, LF |
| `.vscode/settings.json` | tắt formatter HTML mặc định (không để nó phá chuẩn); **Run on Save**: lưu `config/settings.html` → `format-settings-html.mjs --write` → `settings-lock.mjs` |
| `.vscode/extensions.json` | gợi ý cài **EditorConfig** và **Run on Save** (`emeraldwalk.RunOnSave`) |
| `.vscode/tasks.json` | chạy tay: *Settings: format settings.html*, *Settings: check structure lock*, *Settings: update structure lock* |

Formatter chỉ đổi **khoảng trắng và xuống dòng**: dừng và không ghi nếu nội dung (bỏ khoảng trắng), thứ tự key hoặc thứ tự
legend bị đổi, hoặc nếu chạy lại cho kết quả khác.

## 7. Công cụ

| Script | Việc |
|---|---|
| `scripts/format-settings-html.mjs` | format chuẩn (`--check`, `--write`, `--out=tmp/x.html`) |
| `scripts/settings-lock.mjs` | kiểm tra / cập nhật khoá (`--update`, `--file=`) |
| `scripts/outline-settings.mjs` | in dàn ý legend kèm số dòng |
| `scripts/print-settings-block.mjs` | in một đoạn theo số dòng (`--start= --end=`) |
| `scripts/check-settings-structure.mjs` | đếm cân bằng `fieldset` / `table` / `div` |

## 8. Checklist khi sửa settings.html

- Lưu file trong VS Code: không có lỗi khoá (hoặc đã `--update` có chủ đích).
- Nhóm mới đúng khung mục 3, đúng chỗ theo bản đồ mục 1, số thứ tự liền mạch.
- `<h3>` / fieldset con chọn theo bảng mục 4.
- Key mới có giá trị mặc định trong `settings_data.json` (settings-guide).
- Ảnh xem trước của nhóm trang đã có link CDN (hoặc ghi chú còn thiếu).
