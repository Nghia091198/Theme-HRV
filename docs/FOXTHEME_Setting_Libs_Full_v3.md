# FOXTHEME Setting Libs

> Mục tiêu: thư viện quy ước để người/AI build `settings.html` nhất
> quán, dễ quản trị và tránh lặp lại lỗi. Nội dung được tổng hợp từ file
> `Settings buiding.xlsx` do team cung cấp và đối chiếu với Haravan
> Theme Settings Cheat Sheet.

## Đọc tài liệu này trong project

Tài liệu này là thư viện ví dụ và quy ước control cho **Haravan theme settings**
trong repository. Bản dùng chung của project nằm tại
`docs/FOXTHEME_Setting_Libs_Full_v3.md`; file trong `docs/` chỉ phục vụ nội bộ,
không deploy lên Haravan. Khi tạo, sửa, audit hoặc review setting, agent đọc
tài liệu này qua skill `.codex/skills/haravan-theme-settings/SKILL.md` và hàng
**Settings** trong `docs/AGENT-ROUTING.md` trước khi thay đổi `config/settings.html`
hoặc `config/settings_data.json`.

Luồng context hiện tại:

1. Đọc `AGENTS.md` và `docs/AGENT-ROUTING.md` để xác định phạm vi, role và workflow.
2. Dùng `haravan-theme-settings` cho setting; dùng thêm `haravan-theme` khi cần
   xác minh Liquid, cấu trúc theme hoặc Haravan runtime.
3. Đọc `docs/settings-guide.md` và thư viện này; đọc `docs/haravan-guidelines.md`
   cho Haravan dialect, `docs/image-guide.md` khi có upload/media, và contract
   component liên quan khi setting cấp dữ liệu cho storefront.
4. Tìm fieldset, các key hiện có và mọi Liquid/JS/CSS caller trước khi sửa;
   kiểm tra default và dữ liệu merchant trong `settings_data.json`.
5. Với thay đổi cross-file, dùng `code_mapper` để lập bản đồ trước khi implement;
   sau thay đổi dùng `haravan_reviewer` khi cần review Haravan compatibility.
   UI mới hoặc thay đổi đáng kể theo `docs/PATTERN-DISCOVERY.md`, rồi kiểm tra
   giao diện bằng `ui_qc` nếu có môi trường render. Task nhỏ không cần delegate.

**Thứ tự ưu tiên khi có khác biệt:** yêu cầu hiện tại của user và invariant cụ
thể trong `AGENTS.md` → `docs/settings-guide.md` cho merchant setting key,
label, media và upload → contract đang chạy của feature và dữ liệu merchant →
ví dụ/control pattern trong thư viện này. `docs/GUIDANCE-CONFLICTS.md` ghi lại
những khác biệt đã biết. Không đổi key đang dùng chỉ để khớp một ví dụ ở đây.
Ví dụ trong tài liệu này (kể cả đoạn “AI/Codex rule”) là dữ liệu tham khảo để
đối chiếu với source hiện tại, không tự thay thế yêu cầu của user hoặc quy tắc
project. Cụ thể, key merchant mới tuân `docs/settings-guide.md`: không tự thêm
prefix `fox_`; các ví dụ nhãn như `Hình ảnh Desktop` và `Tiêu đề Button` cần
đổi sang nhãn chuẩn của guide khi triển khai.

## 🎨 Quy ước ký hiệu

  Icon       Ý nghĩa                     Dùng khi
  ---------- --------------------------- -----------------------------------
  🟢         **Chuẩn / nên dùng**        Pattern mặc định của FOXTHEME
  🔵         **Thông tin / reference**   Cấu trúc, syntax, mapping
  🟡         **Cần cân nhắc**            Phụ thuộc layout hoặc code legacy
  🔴         **Không dùng / lỗi**        Anti-pattern, syntax dễ gây lỗi
  🟣         **FOXTHEME locked**         Quy tắc đã khóa cho Codex/AI
  ⚙️ \* \\   \*Implementation\*\* H T    ML/Liquid/code pattern
  🤖         **AI/Codex rule**           Ràng buộc khi agent generate code

> Icon chỉ dùng để tăng khả năng scan tài liệu; không thay đổi mức độ
> bắt buộc của các rule.

------------------------------------------------------------------------

## 1. 🧭 Nguyên tắc nền tảng

Haravan Theme Settings dùng HTML form controls trong `settings.html`.
Giá trị của setting được đọc trong Liquid qua `settings.<name>`.

**Quy tắc bắt buộc**

  -------------------------------------------------------------------------
  Trạng thái       Rule             Quy định
  ---------------- ---------------- ---------------------------------------
  🟣               Setting key      `name` là API/key; **unique**, ổn định,
                                    `snake_case`, không dấu/space

  🔴               Rename key       Không đổi `name` tùy tiện; có thể làm
                                    mất cấu hình đã lưu

  🟢               Label            Mô tả đúng tác dụng/ngữ cảnh; tránh
                                    `Menu 1`, `Ảnh 1`, `Color 1`

  🟢               Scope            Chỉ tạo setting khi merchant thực sự
                                    cần chỉnh

  🟣               Control          Dùng đúng HTML element + specialty
                                    class Haravan đã xác minh

  🔴               Invent syntax    Không tự tạo `type`/`class` theo
                                    Shopify/framework khác

  🟣               Font             FOXTHEME dùng native `<select>`;
                                    **không dùng `class="font"`**

  🟢               Default          Khai báo default khi có baseline hợp lý

  🟡               Responsive image Banner/ảnh lớn cân nhắc tách
                                    Desktop/Mobile theo composition

  🟣               Helper text      Dùng
                                    `<p style="font-size: 12px;">...</p>`

  🟢               Render           Liquid phải guard trường hợp setting
                                    trống/chưa cấu hình
  -------------------------------------------------------------------------

------------------------------------------------------------------------

## 2. Cấu trúc row chuẩn

FOXTHEME ưu tiên cấu trúc thực tế đang dùng trong `settings.html`:

``` html
<tr>
    <td>
        <strong>Tên thiết lập</strong>
        <p style="font-size: 12px;">Ghi chú nếu cần</p>
    </td>
    <td>
        <!-- control -->
    </td>
</tr>
```

Không bắt buộc chuyển sang `<label>`/`id` nếu codebase hiện tại không
dùng pattern đó. Khi sửa block cũ, giữ cấu trúc hiện hữu; khi tạo block
mới, dùng `<td><strong>...</strong></td>` làm mặc định.

## 2.1 🎨 Inline Style Contract --- FOXTHEME

> 🟣 **LOCKED STYLE:** Codex/AI phải giữ visual language của
> `settings.html` hiện tại. Không tạo CSS class/inline style mới chỉ để
> "làm đẹp" khi library đã có pattern.

### Style matrix

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Thành phần       🟢 Pattern chuẩn                                                                                                                                Rule
  ---------------- ----------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------
  Wrapper tổng     `border: 1px solid #dee5eb;border-bottom: none;background: #fff;`                                                                               Dùng với `.box-settings`; không
                                                                                                                                                                   tự đổi border/background

  `fieldset`,      **Không inline style**                                                                                                                          Để theme editor/codebase hiện
  `legend`                                                                                                                                                         tại xử lý

  Fieldset content `border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;padding: 0 0 10px 20px;margin: -10px 0;`                                       🟣 Default cho block mới
  mới                                                                                                                                                              

  Legacy content   `border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px`                                       🟡 Giữ khi sửa block legacy đang
                                                                                                                                                                   render đúng

  Nested item      `border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;border-right: 1px solid #eeeeee;padding: 0 10px 10px 10px;margin-top: -10px`   Chỉ dùng cho fieldset/item lồng
                                                                                                                                                                   nhau

  Sub-heading `h3` `padding: 7px 10px; border-top: none;`                                                                                                          🟣 Không tự thêm
                                                                                                                                                                   font/color/margin

  Helper `<p>`     `font-size: 12px;`                                                                                                                              🟣 Không tự thêm
                                                                                                                                                                   color/margin/line-height

  Label cell       `<td><strong>...</strong></td>`                                                                                                                 Default khi tạo mới; legacy
                                                                                                                                                                   `<th>` được giữ

  `<table>`        HTML thuần                                                                                                                                      Không tự thêm `style`, `width`,
                                                                                                                                                                   `cellpadding`, `cellspacing`

  Form controls    HTML thuần / class đã có                                                                                                                        🔴 Không tự thêm inline style
                                                                                                                                                                   vào
                                                                                                                                                                   `input/select/textarea/option`

  `td/th/strong`   Không inline style                                                                                                                              🔴 Không style mặc định
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### ⚙️ Snippet nhanh

  ----------------------------------------------------------------------------------
  Nhu cầu              Snippet
  -------------------- -------------------------------------------------------------
  Helper text          `<p style="font-size: 12px;">...</p>`

  Sub-heading          `<h3 style="padding: 7px 10px; border-top: none;">...</h3>`

  Label                `<td><strong>Tên thiết lập</strong></td>`

  Color                `<input name="..." class="color" value="#..."/>`

  Menu                 `<select class="linklist" name="..."></select>`

  Wide control có sẵn  `class="min-width-360px"`
  ----------------------------------------------------------------------------------

### 🧭 Style precedence

    Ưu tiên Nguồn
  --------- ----------------------------------------------------------
          1 Existing style của block đang sửa
          2 🟣 FOXTHEME locked pattern trong library
          3 Pattern tương tự gần nhất trong `settings.html`
          4 Không có pattern → HTML thuần, **không tự sáng tạo CSS**

### 🧱 `h3` --- phân vùng cấp dưới của `fieldset`

`<h3>` trong FOXTHEME không phải setting/control và không tạo
`settings.<name>`. Đây là **visual subsection divider** để chia một
`fieldset` lớn thành các nhóm cấu hình nhỏ hơn.

Hai UI mẫu thực tế cho thấy `h3` đang được dùng theo hai pattern chính:

  ------------------------------------------------------------------------
  Pattern                Ví dụ UI                   Mục đích
  ---------------------- -------------------------- ----------------------
  🟢 Nhóm chức năng      `Thiết lập Video`,         Chia các loại cấu hình
                         `Thiết lập hình ảnh`       khác nhau trong cùng
                                                    một item

  🟢 Nhóm item lặp       `Hình 1`,                  Tạo header trực quan
                         `Icon animate góc trái`,   cho từng item/cụm item
                         `Icon animate góc phải`,   
                         `Gallery 1`                

  🔴 Không phải control  `h3` không có `name`,      Không lưu dữ liệu
                         `value`                    

  🔴 Không thay label    Không dùng `h3` để đặt tên Input vẫn cần
                         cho một input đơn lẻ       label/`strong` riêng
  ------------------------------------------------------------------------

#### Cấp phân vùng chuẩn

  -----------------------------------------------------------------------
                   Cấp Element          Vai trò          Tạo setting?
  -------------------- ---------------- ---------------- ----------------
                     1 `<fieldset>` +   Section lớn      ❌
                       `<legend>`       trong Theme      
                                        Editor           

                     2 `<h3>`           Subsection /     ❌
                                        nhóm cấu hình    
                                        bên trong        
                                        fieldset         

                     3 `<tr>` +         Setting merchant ✅ nếu control
                       label/control    chỉnh            có `name`
  -----------------------------------------------------------------------

#### 🟣 Pattern chuẩn FOXTHEME

``` html
<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Thiết lập hình ảnh</h3>
    </td>
</tr>
```

`colspan="2"` là quan trọng vì heading phải phủ toàn chiều ngang của
bảng setting thay vì nằm trong riêng cột label hoặc control.

#### Ví dụ --- một slide có nhiều nhóm media

``` html
<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Hình 1</h3>
    </td>
</tr>
<tr>
    <td><strong>Hiển thị?</strong></td>
    <td><input type="checkbox" name="slide_1_show" value="1" /></td>
</tr>
<tr>
    <td><strong>Chọn kiểu</strong></td>
    <td>
        <select name="slide_1_type">
            <option value="image">Hình ảnh</option>
            <option value="video">Video</option>
        </select>
    </td>
</tr>

<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Thiết lập Video</h3>
    </td>
</tr>
<tr>
    <td><strong>Đường dẫn Video (.mp4)</strong></td>
    <td><input type="text" name="slide_1_video_url" /></td>
</tr>
<tr>
    <td><strong>Đường dẫn Video Youtube</strong></td>
    <td><input type="text" name="slide_1_youtube_url" /></td>
</tr>

<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Thiết lập hình ảnh</h3>
    </td>
</tr>
<tr>
    <td><strong>Hình ảnh</strong></td>
    <td><input type="file" name="slide_1_img.jpg" /></td>
</tr>
<tr>
    <td>
        <strong>Hình ảnh mobile</strong>
        <p style="font-size: 12px;">(Kích thước ảnh: 767x850 pixel)</p>
    </td>
    <td><input type="file" name="slide_1_mb.jpg" /></td>
</tr>
```

#### Ví dụ --- Gallery / repeated item

``` html
<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Icon animate góc trái</h3>
    </td>
</tr>
<tr>
    <td><strong>Hiển thị?</strong></td>
    <td><input type="checkbox" name="gallery_icon_left_show" value="1" /></td>
</tr>
<tr>
    <td>
        <strong>Hình ảnh</strong>
        <p style="font-size: 12px;">145x145px</p>
    </td>
    <td><input type="file" name="gallery_icon_left.png" /></td>
</tr>

<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Icon animate góc phải</h3>
    </td>
</tr>

<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">Gallery 1</h3>
    </td>
</tr>
```

#### Khi nào dùng `h3` hay `fieldset` lồng

> 🟣 **CONTROL COUNT RULE:** Đếm số control thực tế (`input`, `select`,
> `textarea`) thuộc cùng một nhóm logic con.

  -----------------------------------------------------------------------
  Trường hợp                          Quyết định
  ----------------------------------- -----------------------------------
  Nhóm logic con có **1--5 controls** 🟢 Dùng `<h3>`

  Nhóm logic con có **từ 6 controls   🟣 Dùng `<fieldset>` lồng
  trở lên**                           

  Một item có Video + Image +         🟢 Dùng `<h3>` cho từng nhóm
  Content, mỗi nhóm \< 6 controls     

  Repeated item nhỏ và mỗi item \< 6  🟢 Dùng `<h3>` làm item header
  controls                            

  Repeated item phức tạp, mỗi item ≥  🟣 Dùng `<fieldset>` lồng cho từng
  6 controls                          item

  Nhóm icon trái/phải chỉ có vài      🟢 Dùng `<h3>`
  settings                            

  Chỉ 1--2 controls, không cần phân   🟡 Có thể không cần `h3`
  vùng trực quan                      

  Dùng `h3` thay label của input      🔴 Không dùng
  -----------------------------------------------------------------------

**Cách đếm:** chỉ đếm control merchant thao tác; không đếm `<h3>`,
`<p>`, `<strong>`, `<tr>`, `<td>` hoặc helper text.

#### 🧱 Pattern `fieldset` lồng khi có từ 6 controls

``` html
<fieldset>
    <legend>1. Banner slider</legend>

    <fieldset>
        <legend>Hình 1</legend>
        <div style="border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;border-right: 1px solid #eeeeee;padding: 0 10px 10px 10px;margin-top: -10px">
            <table>
                <!-- 6+ controls của Hình 1 -->
            </table>
        </div>
    </fieldset>
</fieldset>
```

> 🟣 Nested `fieldset` biểu thị một **khối cấu hình con đủ lớn**; `<h3>`
> biểu thị một **phân vùng nhẹ** bên trong khối hiện tại.

#### 🤖 AI/Codex rule cho `h3`

``` text
COUNT the controls in each logical child group first.

IF child group has 1-5 controls:
    USE <h3> as subsection divider.

IF child group has 6 or more controls:
    USE a nested <fieldset> instead of <h3>.

IF fieldset contains repeated items:
    MAY USE <h3> for each item header.

IF one item contains multiple configuration groups:
    USE separate <h3> dividers such as "Thiết lập Video" and "Thiết lập hình ảnh".

DO NOT create a nested fieldset for a child group with fewer than 6 controls unless preserving an existing legacy structure.
USE nested <fieldset> when the child group has 6 or more controls.
DO NOT use h3 as an input label.
DO NOT attach name/id/value to h3.
DO NOT invent a new h3 visual style.

LOCKED:
<tr>
    <td colspan="2">
        <h3 style="padding: 7px 10px; border-top: none;">...</h3>
    </td>
</tr>
```

### ⚙️ Mẫu section chuẩn hoàn chỉnh

``` html
<fieldset>
    <legend>1. Tên section</legend>
    <div style="border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;padding: 0 0 10px 20px;margin: -10px 0;">
        <table>
            <tr>
                <td colspan="2">
                    <h3 style="padding: 7px 10px; border-top: none;">Thiết lập nội dung</h3>
                    <p style="font-size: 12px;">Mô tả ngắn nếu thực sự cần.</p>
                </td>
            </tr>
            <tr>
                <td><strong>Hiển thị?</strong></td>
                <td><input type="checkbox" name="show_section" value="1" /></td>
            </tr>
            <tr>
                <td>
                    <strong>Tiêu đề</strong>
                    <p style="font-size: 12px;">(bỏ trống để ẩn)</p>
                </td>
                <td><input type="text" name="section_title"/></td>
            </tr>
            <tr>
                <td colspan="2">
                    <h3 style="padding: 7px 10px; border-top: none;">Thiết lập hình ảnh</h3>
                </td>
            </tr>
            <tr>
                <td>
                    <strong>Hình ảnh Desktop</strong>
                    <p style="font-size: 12px;">(1920px x 800px)</p>
                </td>
                <td><input type="file" name="section_d_image.png"/></td>
            </tr>
            <tr>
                <td>
                    <strong>Hình ảnh Mobile</strong>
                    <p style="font-size: 12px;">(767px x 600px)</p>
                </td>
                <td><input type="file" name="section_m_image.png"/></td>
            </tr>
        </table>
    </div>
</fieldset>
```

### 🤖 AI/Codex hard rules cho style

  -----------------------------------------------------------------------------
  Mức                     Rule
  ----------------------- -----------------------------------------------------
  🔴 DO NOT               Invent new inline CSS

  🔴 DO NOT               Add inline style vào `input/select/textarea/option`

  🔴 DO NOT               Style `fieldset/legend` nếu block hiện tại không yêu
                          cầu

  🔴 DO NOT               Add style vào `td/th/strong` mặc định

  🔴 DO NOT               Thay FOXTHEME inline patterns bằng CSS design system
                          mới

  🔴 DO NOT               Normalize legacy block chỉ vì formatting nếu đang
                          render đúng

  🟢 USE                  `<p style="font-size: 12px;">` cho helper text

  🟢 USE                  `<h3 style="padding: 7px 10px; border-top: none;">`
                          cho subsection

  🟢 USE                  Locked fieldset-content wrapper cho block mới

  🟢 PRESERVE             Existing style khi sửa block hiện hữu
  -----------------------------------------------------------------------------

------------------------------------------------------------------------

# 3. 🧱 Setting Structure --- CẤU TRÚC KHÓA

> 🟣 **LOCKED STRUCTURE:** Không tự đổi thứ tự/tên nhóm cấp cao hoặc
> chuyển setting sang nhóm khác chỉ để tiện code.

  ---------------------------------------------------------------------
                           \# Nhóm                 Scope
  --------------------------- -------------------- --------------------
                            1 **Thiết lập chung**  Logo & Favicon ·
                                                   Kiểu chữ · Màu sắc ·
                                                   Mạng xã hội

                            2 **Topbar**           Config Topbar

                            3 **Đầu trang**        Config Header

                            4 **Chân trang**       Config Footer

                            5 **Trang chủ**        Mỗi homepage section

                            6 **Trang nhóm sản     Collection layout
                              phẩm**               

                            7 **Trang sản phẩm**   Product layout

                            8 **Trang bài viết /   Blog / Article
                              chi tiết bài viết**  layout

                            9 **Trang nội dung**   Page layout

                           10 **Trang giỏ hàng**   Cart layout

                           11 **Trang tài khoản**  Login · Register ·
                                                   Address · Account ·
                                                   Order

                           12 **\[Cấu hình\]       Search riêng, không
                              Search / Smart       trộn Header
                              search**             

                           13 **Trang              Chỉ có khi theme hỗ
                              Landingpage**        trợ
  ---------------------------------------------------------------------

### 🟣 Structure rules

  ---------------------------------------------------------------------
  Rule                               Quy định
  ---------------------------------- ----------------------------------
  General first                      `Thiết lập chung` luôn đứng đầu và
                                     chỉ chứa config dùng xuyên theme

  Global chrome                      Topbar → Header → Footer đứng
                                     trước page configs

  Homepage                           Setting riêng của homepage section
                                     phải nằm trong section đó

  Page order                         Collection → Product →
                                     Article/Blog → Page → Cart →
                                     Account

  Search                             Nhóm riêng dù search box có thể
                                     render trong Header

  Landingpage                        Chỉ thêm khi theme thực sự có

  New groups                         Thêm sau nhóm chuẩn, trừ khi
                                     library chính thức thay đổi

  No aliases                         Không tạo `General`, `Global`,
                                     `Theme config` thay cho
                                     `Thiết lập chung`

  Source of truth                    Một key chỉ có **một** nơi cấu
                                     hình

  AI priority                        Structure library ưu tiên hơn cách
                                     gom theo file/snippet
                                     implementation
  ---------------------------------------------------------------------

------------------------------------------------------------------------

# 4. 🔤 Font --- FOXTHEME LOCKED PATTERN

> 🟣 Font dùng native `<select>`. **Không dùng `class="font"`**, không
> free-text và không tự sinh font selector khác.

  Key                 Vai trò                               Default
  ------------------- ------------------------------------- ----------
  `base_font`         Nội dung + UI chung                   `Mulish`
  `base_font_title`   Heading · section title · điểm nhấn   `Mulish`

  🟣 Rule          Quy định
  ---------------- ----------------------------------------------
  Selector         Native `<select>`
  Font list        Hai select phải đồng bộ option
  Existing value   Không đổi `value` font đang dùng
  Add font         Cập nhật cả `base_font` và `base_font_title`
  Forbidden        `class="font"` và `input[type="text"]`

### Mẫu chuẩn FOXTHEME

``` html
<fieldset> 
    <legend>2. Kiểu chữ</legend>
    <div style="border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;padding: 0 0 10px 20px;margin: -10px 0;">
        <table>
            <tr>
                <td colspan="2">
                    <h3 style="padding: 7px 10px; border-top: none;">Kiểu chữ nội dung</h3>
                    <p style="font-size: 12px;">Font dùng cho nội dung và giao diện chung.</p>
                </td>
            </tr>
            <tr>
                <td><strong>Chọn kiểu chữ nội dung</strong></td>
                <td>
                    <select name="base_font">
                        <option value="Quicksand">Quicksand</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Roboto Condensed">Roboto Condensed</option>
                        <option value="Roboto Slab">Roboto Slab</option>
                        <option value="Source Sans Pro">Source Sans Pro</option>
                        <option value="Tinos">Tinos</option>
                        <option value="Noticia Text">Noticia Text</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Open Sans Condensed">Open Sans Condensed</option>
                        <option value="Noto Sans">Noto Sans</option>
                        <option value="Spectral">Spectral</option>
                        <option value="Inter">Inter</option>
                        <option value="Mulish" selected>Mulish</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <h3 style="padding: 7px 10px; border-top: none;">Kiểu chữ tiêu đề</h3>
                    <p style="font-size: 12px;">Font dùng cho tiêu đề, tên section và các điểm nhấn.</p>
                </td>
            </tr>
            <tr>
                <td><strong>Chọn kiểu chữ tiêu đề</strong></td>
                <td>
                    <select name="base_font_title">
                        <option value="Quicksand">Quicksand</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Roboto Condensed">Roboto Condensed</option>
                        <option value="Roboto Slab">Roboto Slab</option>
                        <option value="Source Sans Pro">Source Sans Pro</option>
                        <option value="Tinos">Tinos</option>
                        <option value="Noticia Text">Noticia Text</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Open Sans Condensed">Open Sans Condensed</option>
                        <option value="Noto Sans">Noto Sans</option>
                        <option value="Spectral">Spectral</option>
                        <option value="Inter">Inter</option>
                        <option value="Mulish" selected>Mulish</option>
                    </select>
                </td>
            </tr>
        </table>
    </div>
</fieldset>
```

### AI/Codex rule cho Font

``` text
IF setting == font:
    DO NOT use class="font"
    DO NOT use input[type="text"]
    USE native <select>
    USE name="base_font" for body/default UI font
    USE name="base_font_title" for heading/title font
    USE the FOXTHEME approved option list
    DEFAULT = Mulish
```

------------------------------------------------------------------------

# 5. 🧩 Element / Type Library

## 5.1 `input[type="checkbox"]`

### Dùng cho

-   Hiển thị?
-   Sử dụng?
-   Bật/tắt một tính năng nhị phân.

### Mẫu chuẩn

``` html
<tr>
  <th><label for="use_logo">Hiển thị?</label></th>
  <td><input type="checkbox" id="use_logo" name="use_logo" value="1" /></td>
</tr>
```

### Liquid

``` liquid
{% if settings.use_logo %}
  ...
{% endif %}
```

### Quy ước

Tên key nên thể hiện boolean: `show_*`, `use_*`, `enable_*`.

**Good**

``` html
<input type="checkbox" name="show_newsletter" value="1" />
```

**Avoid**

``` html
<input type="checkbox" name="newsletter" />
```

`newsletter` không nói rõ đây là nội dung hay trạng thái bật/tắt.

------------------------------------------------------------------------

## 5.2 `input[type="text"]`

### Dùng cho

-   Tiêu đề
-   Subtitle
-   URL/đường dẫn
-   Nội dung ngắn
-   Label button
-   URL button
-   Hotline, email, placeholder và các chuỗi ngắn khác

### Mẫu chuẩn

``` html
<tr>
  <th>
    <label for="hero_button_text">Tiêu đề Button</label>
    <p style="font-size: 12px;">(bỏ trống để ẩn)</p>
  </th>
  <td>
    <input type="text" id="hero_button_text" name="hero_button_text" value="" />
  </td>
</tr>
```

### Liquid

``` liquid
{% if settings.hero_button_text != blank %}
  {{ settings.hero_button_text }}
{% endif %}
```

### Rule

Không dùng `text` cho paragraph dài. Chuyển sang `textarea`.

------------------------------------------------------------------------

## 5.3 `textarea`

Haravan document có control riêng cho multiline text.

### Dùng cho

-   Mô tả
-   Nội dung nhiều dòng
-   Text block ngắn/trung bình
-   Custom message

### Mẫu chuẩn

``` html
<tr>
  <th><label for="hero_description">Mô tả</label></th>
  <td>
    <textarea rows="4" cols="20" id="hero_description" name="hero_description" class="textarea"></textarea>
  </td>
</tr>
```

### Lưu ý

Không đặt default text bằng attribute `value` của `<textarea>`. Nếu cần
default HTML thuần, nội dung phải nằm giữa opening/closing tag.

------------------------------------------------------------------------

## 5.4 `input[type="number"]`

### Dùng cho

-   Giới hạn sản phẩm
-   Giới hạn bài viết
-   Số item hiển thị
-   Giá trị số mà merchant cần nhập trực tiếp

### Mẫu chuẩn

``` html
<tr>
  <th><label for="vendor_limit">Số lượng hiển thị</label></th>
  <td>
    <input type="number" id="vendor_limit" name="vendor_limit" value="1" min="1" />
  </td>
</tr>
```

### Rule

Khi domain có giới hạn rõ, thêm `min`, `max`, `step` để giảm dữ liệu
sai.

Không dùng number nếu merchant thực tế chỉ được chọn vài option cố định;
dùng `select` sẽ an toàn hơn.

------------------------------------------------------------------------

## 5.5 `input[type="file"]`

### Dùng cho

-   Logo
-   Banner
-   Background image
-   Icon/image tùy chỉnh
-   Ảnh Desktop/Mobile

Haravan dùng extension ngay trong `name`, ví dụ `name="my_img.jpg"`.

### Mẫu chuẩn

``` html
<tr>
  <th>
    <label for="slide_1_d_image">Hình ảnh Desktop</label>
    <p style="font-size: 12px;">1920px × 800px</p>
  </th>
  <td>
    <input type="file"
           id="slide_1_d_image"
           name="slide_1_d_image.png"
           data-max-width="1920"
           data-max-height="800" />
  </td>
</tr>
```

### Mobile pair

``` html
<tr>
  <th>
    <label for="slide_1_m_image">Hình ảnh Mobile</label>
    <p style="font-size: 12px;">767px × 600px</p>
  </th>
  <td>
    <input type="file" id="slide_1_m_image" name="slide_1_m_image.png" />
  </td>
</tr>
```

### Quy ước từ file team

-   Ghi kích thước khuyến nghị thay vì note chung chung `PNG/JPG`.
-   Ưu tiên `.png` theo convention hiện tại của team khi phù hợp.
-   Banner/ảnh lớn có layout khác nhau phải cân nhắc hai version
    Desktop/Mobile.
-   Tên label phải bám đúng vị trí/nhiệm vụ: `Hình ảnh Desktop`,
    `Ảnh nền`, `Logo`, `Hình ảnh bên trái`...

### Render asset

Thông thường file setting trở thành theme asset và được gọi bằng asset
filter phù hợp với codebase theme.

------------------------------------------------------------------------

## 5.6 Color picker --- `class="color"`

Haravan dùng specialty class `color`.

### Mẫu chuẩn

``` html
<tr>
  <th><label for="hero_text_color">Màu chữ</label></th>
  <td>
    <input id="hero_text_color"
           name="hero_text_color"
           class="color"
           value="#ffffff" />
  </td>
</tr>
```

### Rule

Color phải có default hợp lý.

**Good**

``` html
<input name="hmb_text_color" class="color" value="#ffffff" />
```

**Bad**

``` html
<input name="hmb_text_color" class="color" />
```

### Naming

``` text
*_background_color
*_text_color
*_button_color
*_button_text_color
*_hover_color
*_border_color
*_icon_color
```

------------------------------------------------------------------------

## 5.7 Native `select`

### Dùng cho

-   Kiểu hiển thị
-   Số lượng trong tập option cố định
-   Layout
-   Alignment
-   Ratio
-   Các enum có tập giá trị xác định

### Mẫu chuẩn

``` html
<tr>
  <th><label for="product_columns">Số cột hiển thị</label></th>
  <td>
    <select name="product_columns" id="product_columns">
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4" selected="selected">4</option>
    </select>
  </td>
</tr>
```

### Rule

-   `value` nên là giá trị code cần dùng, không phụ thuộc label.
-   Chỉ một option default có `selected="selected"`.
-   Không dùng self-closing `<select />`.

------------------------------------------------------------------------

# 6. 🔌 Haravan Specialty Selectors

Các class dưới đây được Haravan Theme Settings document hỗ trợ trực
tiếp.

## 6.1 Collection selector --- `class="collection"`

``` html
<tr>
  <th><label for="featured_collection">Chọn nhóm sản phẩm</label></th>
  <td>
    <select class="collection" id="featured_collection" name="featured_collection"></select>
  </td>
</tr>
```

### Liquid pattern

``` liquid
{% assign featured_collection = collections[settings.featured_collection] %}

{% if featured_collection != blank %}
  {% for product in featured_collection.products %}
    ...
  {% endfor %}
{% endif %}
```

Dùng selector thay vì bắt merchant nhập handle collection bằng text.

------------------------------------------------------------------------

## 6.2 Link list selector --- `class="linklist"`

``` html
<tr>
  <th><label for="footer_help_menu">Chọn Menu</label></th>
  <td>
    <select class="linklist" id="footer_help_menu" name="footer_help_menu"></select>
  </td>
</tr>
```

### Liquid

``` liquid
{% assign menu = linklists[settings.footer_help_menu] %}
{% if menu != blank %}
  {% for link in menu.links %}
    <a href="{{ link.url }}">{{ link.title }}</a>
  {% endfor %}
{% endif %}
```

**Bad**

``` html
<select class="linklist" name="footer_help_menu" />
```

`select` không phải void element; phải có closing tag.

------------------------------------------------------------------------

## 6.3 Blog selector --- `class="blog"`

``` html
<tr>
  <th><label for="home_blog">Chọn blog</label></th>
  <td>
    <select class="blog" id="home_blog" name="home_blog"></select>
  </td>
</tr>
```

### Liquid

``` liquid
{% assign selected_blog = blogs[settings.home_blog] %}
```

Dùng khi merchant cần chọn nguồn bài viết.

------------------------------------------------------------------------

## 6.4 Page selector --- `class="page"`

``` html
<tr>
  <th><label for="about_page">Chọn trang nội dung</label></th>
  <td>
    <select class="page" id="about_page" name="about_page"></select>
  </td>
</tr>
```

Dùng thay vì nhập page handle bằng text.

------------------------------------------------------------------------

## 6.5 Snippet selector --- `class="snippet"`

``` html
<tr>
  <th><label for="sidebar_widget">Chọn snippet</label></th>
  <td>
    <select class="snippet" id="sidebar_widget" name="sidebar_widget"></select>
  </td>
</tr>
```

Chỉ dùng khi architecture theme thực sự cho phép merchant chọn snippet;
tránh lạm dụng vì làm luồng render khó kiểm soát.

------------------------------------------------------------------------

# 7. 🎯 Bảng quyết định chọn control

  Nhu cầu                 Element      Type / class           Default
  ----------------------- ------------ ---------------------- ------------------------
  Bật/tắt                 `input`      `type="checkbox"`      tùy feature
  Text ngắn               `input`      `type="text"`          optional
  Text nhiều dòng         `textarea`   `class="textarea"`     optional
  Giá trị số              `input`      `type="number"`        nên có nếu có baseline
  Upload ảnh/file theme   `input`      `type="file"`          không dùng `value`
  Màu                     `input`      `class="color"`        **nên luôn có**
  Enum/layout             `select`     native                 một option selected
  Menu                    `select`     `class="linklist"`     optional
  Collection              `select`     `class="collection"`   optional
  Blog                    `select`     `class="blog"`         optional
  Page                    `select`     `class="page"`         optional
  Snippet                 `select`     `class="snippet"`      optional

------------------------------------------------------------------------

# 8. 🏷️ Naming Convention

## 6.1 Pattern khuyến nghị

``` text
<section>_<purpose>
<section>_<item>_<index>_<purpose>
```

Ví dụ:

``` text
hero_title
hero_description
hero_button_text
hero_button_url
hero_background_color
hero_text_color
hero_desktop_image.png
hero_mobile_image.png

slide_1_title
slide_1_button_text
slide_1_button_url
slide_1_d_image.png
slide_1_m_image.png
```

### Boolean

``` text
show_hero
enable_quickview
use_logo
show_vendor
```

### Không nên

``` text
title1
text2
setting_10
image_new
color1
menu1
```

Tên này không truyền tải context và làm code khó maintain.

------------------------------------------------------------------------

# 9. 🧑‍💼 Label / UX Convention cho Theme Editor

Setting editor là UI dành cho merchant, vì vậy label phải nói ngôn ngữ
vận hành chứ không phải ngôn ngữ developer.

**Nên**

``` text
Hiển thị?
Tiêu đề
Mô tả
Tiêu đề Button
Đường dẫn Button
Hình ảnh Desktop
Hình ảnh Mobile
Màu nền
Màu chữ
Chọn Menu
Chọn nhóm sản phẩm
Số lượng hiển thị
```

**Tránh**

``` text
Boolean
Text value
URL href
Image 1
Color hex
Collection handle
Menu 1
```

Với button text có thể thêm:

``` html
<p style="font-size: 12px;">(bỏ trống để ẩn)</p>
```

Với image phải ưu tiên ghi kích thước thực tế cần cho design:

``` html
<p style="font-size: 12px;">1920px × 800px</p>
```

thay vì note ít giá trị như:

``` html
<p style="font-size: 12px;">PNG/JPG</p>
```

------------------------------------------------------------------------

# 10. 🖼️ Desktop / Mobile Image Rule

Từ convention hiện tại của team:

> Banner hoặc ảnh lớn không nên mặc định dùng chung một file cho mọi
> viewport nếu composition thay đổi đáng kể.

Tách hai setting khi:

-   hero/banner landscape trên desktop nhưng portrait/crop khác trên
    mobile;
-   text nằm trực tiếp trong artwork;
-   focal point khác;
-   ratio desktop/mobile chênh lệch lớn;
-   dùng chung ảnh gây crop mất nội dung.

Mẫu:

``` html
<tr>
  <th>
    <label for="hero_d_image">Hình ảnh Desktop</label>
    <p style="font-size: 12px;">1920px × 800px</p>
  </th>
  <td><input type="file" id="hero_d_image" name="hero_d_image.png" /></td>
</tr>

<tr>
  <th>
    <label for="hero_m_image">Hình ảnh Mobile</label>
    <p style="font-size: 12px;">767px × 600px</p>
  </th>
  <td><input type="file" id="hero_m_image" name="hero_m_image.png" /></td>
</tr>
```

Không tách chỉ vì "mobile luôn phải có ảnh riêng"; ảnh nhỏ hoặc artwork
responsive tự nhiên có thể dùng chung.

------------------------------------------------------------------------

## 10.1 ⚙️ Default Value Rules

## Luôn/nên có default

### Color

``` html
<input class="color" name="primary_color" value="#000000" />
```

### Number có baseline

``` html
<input type="number" name="product_limit" value="8" min="1" />
```

### Select

``` html
<option value="grid" selected="selected">Grid</option>
```

## Có thể để trống

-   title phụ;
-   button text/url nếu "bỏ trống để ẩn";
-   menu/collection/blog/page nếu section có guard;
-   optional content.

## Không dùng

``` html
<input type="file" value="..." />
```

File setting không hoạt động như text input.

------------------------------------------------------------------------

## 10.2 🛡️ Defensive Liquid Patterns

## Text

``` liquid
{% if settings.section_title != blank %}
  <h2>{{ settings.section_title }}</h2>
{% endif %}
```

## Button

``` liquid
{% if settings.hero_button_text != blank and settings.hero_button_url != blank %}
  <a href="{{ settings.hero_button_url }}">
    {{ settings.hero_button_text }}
  </a>
{% endif %}
```

## Collection

``` liquid
{% assign section_collection = collections[settings.section_collection] %}
{% if section_collection != blank %}
  ...
{% endif %}
```

## Menu

``` liquid
{% assign section_menu = linklists[settings.section_menu] %}
{% if section_menu != blank and section_menu.links.size > 0 %}
  ...
{% endif %}
```

## Boolean

``` liquid
{% if settings.show_section %}
  ...
{% endif %}
```

Không render empty wrappers chỉ vì setting tồn tại trong editor.

------------------------------------------------------------------------

# 11. 🚨 Common Errors / Anti-patterns

  ---------------------------------------------------------------------------
                      \# 🔴 Sai / vấn đề      🟢 Cách đúng
  ---------------------- -------------------- -------------------------------
                      01 Self-closing         Luôn dùng
                         `<select ... />`     `<select ...></select>`

                      02 `input.color` không  Thêm `value="#..."` hợp lệ
                         có default           

                      03 Merchant nhập        Dùng
                         collection handle    `<select class="collection">`
                         bằng text            

                      04 Paragraph dài dùng   Dùng `textarea`
                         `input[type=text]`   

                      05 Label mơ hồ:         Label theo ngữ cảnh:
                         `Menu 1`, `Image 1`, `Menu hỗ trợ`,
                         `Color 2`            `Hình ảnh Desktop`,
                                              `Màu chữ Button`

                      06 Hero cần crop riêng  Cân nhắc Desktop/Mobile pair
                         nhưng dùng chung ảnh 

                      07 Optional setting     Check `blank`/resource trước
                         không có Liquid      render
                         guard                

                      08 Hai control trùng    Mỗi logical setting có key
                         `name`               unique

                      09 Rename key chỉ để    Giữ key hoặc có
                         "đẹp code"           migration/fallback

                      10 Copy Shopify setting Chỉ dùng control/class đã xác
                         schema vào Haravan   minh trong library
  ---------------------------------------------------------------------------

# 12. 🔁 Repeated Items Pattern

Khi platform/theme architecture hiện tại dùng fixed slots trong
`settings.html`, đặt key có index rõ ràng:

``` html
<input type="text" name="slide_1_title" />
<input type="text" name="slide_1_button_text" />
<input type="file" name="slide_1_d_image.png" />

<input type="text" name="slide_2_title" />
<input type="text" name="slide_2_button_text" />
<input type="file" name="slide_2_d_image.png" />
```

Không dùng các key rời rạc:

``` text
title1
button_first
image_slide02
```

Giữ cùng một thứ tự suffix giữa các item để AI/codegen có thể suy luận
an toàn.

------------------------------------------------------------------------

# 13. 📦 Section Template chuẩn để copy

``` html
<!-- SECTION: Hero -->

<tr>
  <th><label for="show_hero">Hiển thị?</label></th>
  <td><input type="checkbox" id="show_hero" name="show_hero" value="1" /></td>
</tr>

<tr>
  <th><label for="hero_title">Tiêu đề</label></th>
  <td><input type="text" id="hero_title" name="hero_title" value="" /></td>
</tr>

<tr>
  <th><label for="hero_description">Mô tả</label></th>
  <td><textarea rows="4" cols="20" id="hero_description" name="hero_description" class="textarea"></textarea></td>
</tr>

<tr>
  <th>
    <label for="hero_button_text">Tiêu đề Button</label>
    <p style="font-size: 12px;">(bỏ trống để ẩn)</p>
  </th>
  <td><input type="text" id="hero_button_text" name="hero_button_text" value="" /></td>
</tr>

<tr>
  <th><label for="hero_button_url">Đường dẫn Button</label></th>
  <td><input type="text" id="hero_button_url" name="hero_button_url" value="" /></td>
</tr>

<tr>
  <th>
    <label for="hero_d_image">Hình ảnh Desktop</label>
    <p style="font-size: 12px;">1920px × 800px</p>
  </th>
  <td><input type="file" id="hero_d_image" name="hero_d_image.png" /></td>
</tr>

<tr>
  <th>
    <label for="hero_m_image">Hình ảnh Mobile</label>
    <p style="font-size: 12px;">767px × 600px</p>
  </th>
  <td><input type="file" id="hero_m_image" name="hero_m_image.png" /></td>
</tr>

<tr>
  <th><label for="hero_text_color">Màu chữ</label></th>
  <td><input id="hero_text_color" name="hero_text_color" class="color" value="#ffffff" /></td>
</tr>
```

------------------------------------------------------------------------

# 14. 🤖 AI / Codex Generation Contract

Khi dùng library này làm instruction cho Codex/agent, áp dụng contract
sau:

``` text
When creating or modifying Haravan settings.html:

1. Reuse existing naming/style conventions before introducing new patterns.
2. Use the controls documented in this library after checking `docs/settings-guide.md` and the affected theme's existing controls.
3. Never invent Shopify schema types for Haravan settings.html.
4. Every setting name must be unique snake_case and describe section + purpose.
5. Use Haravan specialty selectors for collection, menu/linklist, blog, page and snippet. Font của FOXTHEME phải dùng native `<select>` với danh sách option được khóa trong library; tuyệt đối không dùng `class="font"`.
6. Color controls must include a valid default hex value unless an existing theme convention explicitly requires otherwise.
7. Select elements must have explicit closing tags.
8. For large responsive artwork, determine whether separate desktop/mobile files are required from the actual design; do not blindly create or omit them.
9. Image settings must include useful recommended dimensions when known.
10. Button text that is optional should state `(bỏ trống để ẩn)` when blank text is the intended hide mechanism.
11. Use textarea for multiline content and text input for short content.
12. Add min/max/step to numeric inputs when domain constraints are known.
13. Never rename an existing setting key without checking all Liquid/CSS/JS references and backward compatibility.
14. Before finishing, scan for duplicate names, invalid/self-closing selects, missing defaults, broken references and unguarded optional settings.
15. Do not create a setting that has no consumer in Liquid/CSS/JS.
16. For a logical child group with 1–5 controls, use `<h3>` as the subsection divider below `<fieldset>`.
17. For a logical child group with 6 or more controls, use a nested `<fieldset>` instead of `<h3>`.
18. Count only merchant controls (`input`, `select`, `textarea`); do not count headings, notes or table markup.
19. Keep the locked h3 wrapper/style: `<td colspan="2"><h3 style="padding: 7px 10px; border-top: none;">...</h3></td>`.
```

------------------------------------------------------------------------

# 15. 🧭 Pre-build Decision Flow

Trước tiên: **merchant có cần chỉnh giá trị này không?** Nếu **không** →
hardcode/config internal, không tạo setting.

  Nhu cầu           Control
  ----------------- --------------------------
  Boolean           `input[type="checkbox"]`
  Text ngắn         `input[type="text"]`
  Text nhiều dòng   `textarea`
  Number            `input[type="number"]`
  Enum              native `select`
  Color             `input.color`
  Image/file        `input[type="file"]`
  Collection        `select.collection`
  Menu              `select.linklist`
  Blog              `select.blog`
  Page              `select.page`
  Snippet           `select.snippet`

🟡 Không thuộc các nhánh trên → **không tự phát minh control mới**; kiểm
tra documentation/theme hiện hữu trước.

------------------------------------------------------------------------

# 16. ✅ Review Checklist

Trước khi merge `settings.html`, kiểm tra:

-   [ ] Tất cả `name` unique.
-   [ ] `name` dùng snake_case và có context.
-   [ ] Setting mới thực sự được dùng trong Liquid/CSS/JS.
-   [ ] Existing key không bị rename ngoài ý muốn.
-   [ ] Checkbox dùng cho boolean.
-   [ ] Textarea dùng cho multiline.
-   [ ] Number có constraint nếu cần.
-   [ ] Color có default.
-   [ ] Select có closing tag.
-   [ ] Native enum select có default hợp lý.
-   [ ] Collection dùng `class="collection"`.
-   [ ] Menu dùng `class="linklist"`.
-   [ ] Blog dùng `class="blog"`.
-   [ ] Page dùng `class="page"`.
-   [ ] Font dùng native `<select>` theo danh sách font chuẩn của
    FOXTHEME; không có `class="font"`.
-   [ ] Snippet dùng `class="snippet"` nếu thật sự cần.
-   [ ] Image label mô tả đúng vị trí/nhiệm vụ.
-   [ ] Image có kích thước khuyến nghị khi biết.
-   [ ] Hero/banner đã đánh giá nhu cầu Desktop/Mobile riêng.
-   [ ] Optional button có behavior rõ khi để trống.
-   [ ] Liquid guard blank/null cho optional resource.
-   [ ] Không render wrapper rỗng vô nghĩa.
-   [ ] Không copy Shopify schema syntax chưa được Haravan xác nhận.
-   [ ] HTML row/table structure hợp lệ.
-   [ ] Inline style chỉ dùng các FOXTHEME locked patterns.
-   [ ] Helper text dùng đúng `font-size: 12px`.
-   [ ] Sub-heading `h3` dùng đúng
    `padding: 7px 10px; border-top: none;`.
-   [ ] `h3` nằm trong `<td colspan="2">` khi dùng làm subsection.
-   [ ] `h3` chỉ là separator dưới `fieldset`, không dùng thay label
    input.
-   [ ] Fieldset có nhiều nhóm logic/repeated item đã cân nhắc dùng
    `h3`.
-   [ ] Không tạo fieldset mới nếu nội dung chỉ là phân vùng con của
    section hiện tại.
-   [ ] Block mới dùng đúng fieldset-content wrapper chuẩn.
-   [ ] Không tự thêm inline style vào `input`, `select`, `textarea`,
    `option`, `td`, `th`, `strong`.
-   [ ] Khi sửa block legacy, giữ style hiện tại nếu block đang render
    đúng.
-   [ ] `label for` khớp `id` nếu dùng accessibility label.

------------------------------------------------------------------------

# 17. 📚 Supported Controls --- Source of Truth hiện tại

  ----------------------------------------------------------------------
  Control                  Trạng thái             Ghi chú
  ------------------------ ---------------------- ----------------------
  `input[type=text]`       🟢 Verified            Text ngắn

  `textarea.textarea`      🟢 Verified            Multiline

  `select`                 🟢 Verified            Enum/native select

  `input[type=checkbox]`   🟢 Verified            Boolean

  `input[type=file]`       🟢 Verified            Theme asset

  `input.color`            🟢 Verified            Color picker

  `select.collection`      🟢 Verified            Collection selector

  `select.blog`            🟢 Verified            Blog selector

  `select.page`            🟢 Verified            Page selector

  `select.linklist`        🟢 Verified            Menu selector

  `select.snippet`         🟢 Verified            Snippet selector

  `select.font`            🔵 Haravan documented  🟣 FOXTHEME **không
                                                  dùng**; dùng native
                                                  font select

  `input[type=number]`     🟡 Team convention     Giữ cho numeric
                                                  setting; verify
                                                  runtime nếu gặp case
                                                  mới
  ----------------------------------------------------------------------

🔴 Control/class ngoài bảng: xác minh Haravan hoặc theme runtime trước
khi đưa vào Source of Truth.

------------------------------------------------------------------------

# 18. 🔎 Nguồn và trạng thái quy ước

## Primary team convention

`Settings buiding.xlsx` --- dữ liệu do team cung cấp ngày 2026-09-18.
File hiện định nghĩa các pattern ban đầu cho checkbox, text, file,
number, color, linklist và native select; library này giữ các convention
hữu ích đó và chuẩn hóa thêm cấu trúc/accessibility/naming.

## Haravan documentation

Haravan Theme Cheat Sheet --- Theme Settings:

https://themes.haravan.com/pages/cheat-sheet

Được dùng để tham khảo text field, multiline text field, select,
checkbox, file upload và specialty classes. Riêng FOXTHEME khóa font
theo native `<select>` của library này và không sử dụng `class="font"`.

------------------------------------------------------------------------

# 19. ♻️ Quy tắc cập nhật Library

Library này nên được xem là **living document**.

Khi phát hiện pattern mới:

1.  Lấy ví dụ chạy được thực tế trên Haravan.
2.  Xác định đây là Haravan-supported, browser-native hay convention
    riêng của theme.
3.  Thêm `Good` example.
4.  Thêm `Bad` example nếu đã từng gây lỗi.
5.  Ghi rõ default rule.
6.  Ghi rõ Liquid consumption pattern.
7.  Bổ sung vào checklist nếu lỗi có khả năng lặp lại.

Không thêm một syntax vào Source of Truth chỉ vì AI/Shopify/theme khác
sử dụng nó.

------------------------------------------------------------------------

## 🏆 Golden Rule

> **Build settings cho merchant sử dụng, không build settings để
> developer thấy "đủ option". Dùng đúng control Haravan hỗ trợ, key ổn
> định, label rõ nghĩa, default an toàn và Liquid luôn có guard.**
