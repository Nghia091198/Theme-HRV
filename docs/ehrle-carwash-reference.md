# Brief triển khai nội dung CarWash theo trang EHRLE

> **Dành cho Codex trong VS Code.** Dùng tài liệu này làm đặc tả tham chiếu để xây dựng phần **nội dung sau hero** của một trang CarWash trong theme Haravan hiện tại. Không làm lại header, breadcrumb, hero hoặc footer toàn site. Nguồn quan sát: [EHRLE CarWash](https://www.ehrle.com/carwash/), xem trực tiếp ngày 15/10/2026 trong khung trình duyệt rộng khoảng 683 px. Các nhãn tiếng Anh và URL bên dưới là dữ liệu tham chiếu; nội dung merchant cần có thể cấu hình theo convention của theme.

## 1. Mục tiêu và phạm vi

- Dựng một trang giới thiệu giải pháp CarWash dài, có nhịp đọc rõ ràng: giới thiệu → kiểu kết cấu → công nghệ rửa → gia nhiệt → cấu hình hệ thống → bảng so sánh → phối màu trước/sau → CTA, video, liên hệ và brochure.
- Giữ tinh thần thiết kế: nền trắng, đỏ EHRLE `#e30613` làm màu nhấn, chữ xám đậm, ảnh thiết bị lớn, thẻ trắng bo tròn có bóng nhẹ, khoảng trắng rộng và CTA rõ.
- Ưu tiên **nội dung và hiệu ứng**. Không sao chép nguyên hệ thống Elementor/WordPress, không triển khai cả website EHRLE. Có thể dùng nội dung tóm lược và ảnh phù hợp của dự án; URL ảnh EHRLE chỉ là reference để chọn đúng bố cục/chủ thể.
- Nếu task triển khai nằm trong repo này, đọc `AGENTS.md`, `docs/AGENT-ROUTING.md`, `docs/PATTERN-DISCOVERY.md`, `docs/haravan-guidelines.md` và `docs/image-guide.md` trước khi sửa code. Checkout deploy hiện có tên `FOX Fashion/` với `assets/`, `snippets/`, `templates/`, `config/`; tài liệu kiến trúc gọi chung là `Theme/`. Xác nhận load point thực tế trước khi đặt file.

### Những gì không nằm trong task

- Header, menu, hero đầu trang, breadcrumb và footer toàn site.
- Tích hợp commerce, giỏ hàng hoặc thanh toán. CTA sản phẩm chỉ điều hướng.
- Chép nguyên văn đoạn mô tả dài hoặc hotlink ảnh EHRLE vào bản production khi chưa có quyền sử dụng. Nội dung dưới đây là dàn ý để biên tập.

## 2. Bản đồ trang và thứ tự section

| Thứ tự | Section | Nội dung/kiểu trình bày | Tương tác chính |
| --- | --- | --- | --- |
| 1 | Giới thiệu | Một đoạn dẫn giải dài trên nền trắng, giới thiệu self-service car wash, nhiều chương trình rửa, tính tùy biến và độ bền. | Không có. |
| 2 | 4 kiểu kết cấu thép | Waschheld, Standard, DesignPro, SmartLine; mỗi mục là ảnh lớn + thẻ nội dung đè nhẹ lên ảnh, tiêu đề đỏ, mô tả và nút “To the configurator”. | Reveal khi vào viewport; CTA điều hướng. |
| 3 | Mục lục CarWash technology | Ảnh nền toàn chiều ngang, tiêu đề lớn trong panel trắng; 6 link dạng thẻ trắng. | Link cuộn tới section tương ứng. |
| 4 | 6 dòng công nghệ | SmartWash, WashTerminal, JetWash, CarWash PLUS, CompactLine, ModulLine; ảnh thiết bị và thẻ mô tả, bố cục xen kẽ. | Reveal trái/phải; CTA webshop. |
| 5 | Detergents | Ảnh chủ đề chất tẩy rửa, 4 loại sản phẩm/biểu tượng, CTA webshop. | Reveal tương tự. |
| 6 | Mục lục Heating systems | Ảnh nền + panel tiêu đề + 5 link dạng thẻ. | Link cuộn tới nhóm gia nhiệt. |
| 7 | 5 kiểu gia nhiệt | Heat pump, Oil, Gas, District heating, Electric; ảnh sản phẩm lớn, mô tả khi có, CTA catalog. | Reveal trái/phải; CTA catalog. |
| 8 | Mục lục System variants | Ảnh nền + panel tiêu đề + 10 link SV1–SV10. | Link cuộn đến nhóm SV1–5 hoặc SV6–10. |
| 9 | 10 cấu hình hệ thống | 10 thẻ dài, mỗi thẻ có tên, ảnh sơ đồ/thiết bị và danh sách chương trình rửa. | Cuộn đọc; không phải tabs/carousel. |
| 10 | Bảng tổng hợp + WheelCleaner | Ảnh bảng so sánh các dòng máy với variant, sau đó ảnh chương trình vệ sinh mâm. | Xem ảnh; nếu làm bảng HTML, cần cuộn ngang trên màn hẹp. |
| 11 | Design your CarWash | Tiêu đề, mô tả ngắn và ảnh so sánh cùng địa điểm với mái xanh/đỏ. | Kéo thanh chia ảnh trước/sau. |
| 12 | CTA webshop | Dải nền đỏ, mô tả trắng, nút trắng; ảnh mockup màn hình shop nằm dưới. | Điều hướng. |
| 13 | Video | Khung video 16:9; nguồn đang hiển thị placeholder xin phép tải YouTube. | Chỉ tạo iframe khi người dùng chủ động bật. |
| 14 | Contact + Downloads | Dải đỏ liên hệ, rồi ảnh brochure và phần giới thiệu tải tài liệu. | CTA contact và brochure. |

## 3. Ngôn ngữ thị giác cần bám

- **Màu:** đỏ nhấn khoảng `#e30613`; trắng; chữ chính khoảng `#333`, chữ đoạn khoảng `#444`.
- **Typography nguồn:** Tahoma/sans-serif; body khoảng 16 px, line-height 24 px; heading thẻ 32 px/600 trên khung 683 px; tên variant 24 px/600; tiêu đề lớn 40–48 px/600. Dùng font hệ thống của theme nếu đã có, giữ tương quan cấp bậc.
- **Thẻ nội dung:** nền trắng, bo khoảng 20 px, bóng nhẹ đến vừa; trên màn hẹp ảnh nằm trên, thẻ bắt đầu chồng khoảng 40 px vào mép dưới ảnh. Padding tham chiếu khoảng 20 px.
- **Nút:** đỏ nền/trắng chữ, 16 px/600, padding khoảng 15 × 30 px, bo khoảng 10 px. Ở dải đỏ cuối trang dùng nút trắng/chữ đỏ. Giữ `:focus-visible` nổi bật.
- **Ảnh:** ảnh kết cấu là ảnh bối cảnh trạm rửa; ảnh công nghệ/gia nhiệt là sản phẩm tách nền nổi trên khoảng trắng. Không ép chung một tỉ lệ crop cho hai nhóm.
- **Panel mục lục:** ảnh nền phía sau; heading rất lớn nằm trong tấm trắng có bóng; các link là pill/thẻ trắng bo tròn, chữ đỏ, bóng nhẹ. Trên khung 683 px chúng xếp thành cột dọc.
- **Nhịp trang:** nhiều khoảng trắng giữa các khối; 3 mục lục tạo mốc khi cuộn một trang rất dài. Có đường phân cách dạng sóng ở mép trên các cụm mục lục trong source.
- **Responsive:** tại 683 px, các thẻ nội dung và link mục lục xếp dọc; ảnh trên, nội dung dưới. Với desktop có thể dùng bố cục ảnh và text hai cột/xen kẽ, nhưng cần kiểm tra trực quan trên viewport desktop khi triển khai; nguồn chỉ được quan sát trực tiếp tại khung 683 px.

## 4. Nội dung từng cụm

### 4.1. Giới thiệu

Một đoạn văn dẫn sau hero, nêu: tự rửa xe nhẹ nhàng bằng công nghệ hiện đại; các bước pre-wash, foam, high pressure rinse, wax; bốn kiểu kết cấu; màu sắc, biển hiệu và vách ngăn tùy biến; dễ dùng và bền. Đoạn nguồn khá dài; có thể chia thành 2–3 đoạn ngắn để dễ đọc trên mobile, không thay đổi ý chính.

### 4.2. Bốn kiểu kết cấu

| Tên | Ý nội dung cần có | Ảnh reference | CTA |
| --- | --- | --- | --- |
| Waschheld | Kết cấu thép mạ kẽm, chống ăn mòn, modular, dễ mở rộng, độ bền và tính thẩm mỹ. | [Waschheld](https://www.ehrle.com/wp-content/uploads/2023/10/Ehrle_Waschheld-1024x682.jpg) | [Configurator](https://www.ehrle.com/carwash-configurator/) |
| Standard | Nền tảng thép chống gỉ, phù hợp điều kiện ngoài trời và nhiều mặt bằng. | [Standard](https://www.ehrle.com/wp-content/uploads/2024/03/Stahlbau-SmartLine-3-1024x484.jpg) | Cùng link trên |
| DesignPro | Thiết kế hiện đại, module linh hoạt, tối ưu không gian, dễ tích hợp kỹ thuật. | [DesignPro](https://www.ehrle.com/wp-content/uploads/2024/11/CarWash-PLUS-2-Waschplaetze-DesignPro-1024x853.jpg) | Cùng link trên |
| SmartLine | Lắp đặt dễ, linh hoạt, tiết kiệm vận hành, bảo trì thấp. | [SmartLine](https://www.ehrle.com/wp-content/uploads/2024/11/Stahlbau-SmartLine.jpg) | Cùng link trên |

Mỗi mục dùng cùng một component/markup contract, nhưng ảnh và text có thể đảo phía trên desktop. Mô tả không cần dài như nguồn; tránh bốn khối trở nên đơn điệu bằng nhịp ảnh/text xen kẽ.

### 4.3. CarWash technology

Mục lục có 6 link: `SmartWash`, `WashTerminal`, `JetWash`, `CarWash PLUS`, `CompactLine`, `ModulLine`. Ảnh nền tham chiếu: [Waschheld Illertissen](https://www.ehrle.com/wp-content/uploads/2024/02/Waschheld_Illertissen-scaled.jpg).

| Section | Ý nội dung | Ảnh reference | Đích CTA nguồn |
| --- | --- | --- | --- |
| SmartWash / SmartWash PLUS | Phần nguồn hầu như chỉ có heading, ảnh máy và CTA; không tự bịa thông số kỹ thuật. | [SmartWash](https://www.ehrle.com/wp-content/uploads/2024/09/SmartWash_4Sys_Front_Galgen-e1726564486231-1267x1536.png) | [Webshop](https://shop.ehrle.com/zubehor-und-ersatzteile/carwash/carwash-ohne-technik-container/smartwash.html) |
| WashTerminal | Hai khoang rửa, variant 4/6, gas/điện, vỏ thép không gỉ, các lựa chọn thanh toán và hiển thị LED. | [WashTerminal](https://www.ehrle.com/wp-content/uploads/2025/12/WashTerminal-SV6-Elektrisch-beheizt_Beschriftung-Deutsch-scaled-e1765357883301.png) | [Webshop](https://shop.ehrle.com/washterminal.html) |
| JetWash / JetWash PLUS | 4 chương trình chuẩn, tùy chọn mở rộng, thanh toán EHRLE/CentralPay; bản PLUS có thẩm thấu ngược và màn TFT. | [JetWash](https://www.ehrle.com/wp-content/uploads/2024/09/2023_JetWashPlus.png) | [Webshop](https://shop.ehrle.com/zubehor-und-ersatzteile/carwash/carwash-ohne-technik-container/jetwash.html) |
| CarWash PLUS | Đến SV10, vỏ thép, nhiều loại gia nhiệt, làm mềm nước/thẩm thấu ngược, điều khiển TFT. | [CarWash PLUS](https://www.ehrle.com/wp-content/uploads/2024/09/Carwash_Plus-e1726564928966.png) | [Webshop](https://shop.ehrle.com/zubehor-und-ersatzteile/carwash/carwashplus.html) |
| CompactLine | Module cơ bản gồm xử lý nước, MicroPowder, điều khiển; có module mở rộng và nhiều lựa chọn gia nhiệt. | [CompactLine](https://www.ehrle.com/wp-content/uploads/2024/09/CompactLine_8PL_44PL-Gas.png) | [Webshop](https://shop.ehrle.com/zubehor-und-ersatzteile/carwash/carwash-fur-technik-container/compactline.html) |
| ModulLine | Module riêng trên khung inox, cấp nước tập trung, PLC Siemens, mở rộng đến nhiều vị trí rửa. | [ModulLine](https://www.ehrle.com/wp-content/uploads/2024/09/CarWash_ModulLine_Modul_Sys4-10-441x1024.png) | [Webshop](https://shop.ehrle.com/zubehor-und-ersatzteile/carwash/carwash-fur-technik-container/modulline.html) |

`Detergents` tiếp nối cùng ngôn ngữ card: một ảnh foam/nước lớn, bốn nhóm nhỏ `Wheel Cleaner`, `Foam concentrate`, `Cleaning powder`, `Care Concentrate`, CTA [webshop detergents](https://shop.ehrle.com/reinigungs-und-pflegemittel/sb-carwash-anlagen.html). Ảnh tổng thể: [Detergents](https://www.ehrle.com/wp-content/uploads/2026/07/Inhalt-Chemiebild-mit-Wasser_Schaum_Seifenblasen-Effekten.png). Icon là dữ liệu minh họa, không bắt buộc tái sử dụng nguyên bản.

### 4.4. Heating systems

Mục lục 5 link: `Heat pump`, `Oil`, `Gas`, `District heating`, `Electric`. Ảnh nền tham chiếu: [HeatStorage](https://www.ehrle.com/wp-content/uploads/2024/01/HeatStorage-CarWash-Anlage.jpg).

| Tên | Ý nội dung | Ảnh reference | CTA catalog nguồn |
| --- | --- | --- | --- |
| Heat pump | Ảnh + heading + CTA; nguồn không có đoạn mô tả dài. | [Heat pump](https://www.ehrle.com/wp-content/uploads/2024/09/Waermepumpe-e1726566000652.png) | [Catalog p.100](https://online.fliphtml5.com/ggtom/mygb/#p=100) |
| Oil heating | Ảnh + heading + CTA; nguồn không có đoạn mô tả dài. | [Oil](https://www.ehrle.com/wp-content/uploads/2024/09/Heizsysteme_OeL_74kW-e1726566220658.png) | [Catalog p.100](https://online.fliphtml5.com/ggtom/nemf/#p=100) |
| Gas heating | Module gas 50–160 kW, lò inox, điều khiển nhiệt theo nhu cầu; tóm lược các thông số nếu đã được merchant xác nhận. | [Gas](https://www.ehrle.com/wp-content/uploads/2024/09/Heizsysteme_Gas_BPM90_85kW-e1726566373253.png) | [Catalog p.98](https://online.fliphtml5.com/ggtom/nemf/#p=98) |
| District heating | Ảnh + heading + CTA; nguồn không có đoạn mô tả dài. | [District heating](https://www.ehrle.com/wp-content/uploads/2024/09/Heizsysteme_Fernwaerme_SLM_3-e1726566494644.png) | [Catalog p.104](https://online.fliphtml5.com/ggtom/nemf/#p=104) |
| Electric heating | Lò inox, điều khiển tải/nhiệt, bơm nước nóng, có thể phục vụ nhiều khoang rửa. | [Electric](https://www.ehrle.com/wp-content/uploads/2024/09/LCE-Elektro-e1726566682519.png) | [Catalog p.102](https://online.fliphtml5.com/ggtom/nemf/#p=102) |

### 4.5. System variants

Mục lục hiển thị 10 link `SV1`, `SV2`, `SV3SE`, `SV4`, `SV5`, `SV6`, `SV7`, `SV8SE`, `SV9`, `SV10`. Trang nguồn cho 5 link đầu đến nhóm `#sv1_5`, 5 link sau đến `#sv6_10`. Ảnh nền: [DayOne](https://www.ehrle.com/wp-content/uploads/2024/09/DayOne-316-scaled.jpg).

Mỗi variant là một **thẻ nội dung độc lập** theo thứ tự, có heading đỏ, ảnh sơ đồ lớn, danh sách chương trình; không biến thành slider. Các bước lặp lại ở đa số variant: rửa ActivePower Pearl MicroPowder, xả nước áp lực cao, bảo vệ sơn UltraProtection, hoàn thiện bóng SuperFinish. Điểm khác nhau cần thể hiện:

| Variant | Pre-clean / cleaning đặc trưng | Tay quay trần / dây |
| --- | --- | --- |
| SV1 | SoftFoam lance **và** brush; ActivePower jet áp lực cao | 3 / 3 |
| SV2 | ActivePower jet áp lực thấp trước, áp lực cao khi rửa; bảo vệ sơn áp lực thấp | 1 / 1 |
| SV3SE | ActivePower jet **hoặc** foam brush, áp lực cao | 2 / 1 |
| SV4 | SoftFoam lance; ActivePower jet áp lực cao | 2 / 2 |
| SV5 | SoftFoam brush; ActivePower jet áp lực cao | 2 / 2 |
| SV6 | ActivePower jet áp lực cao **và** foam brush | 2 / 2 |
| SV7 | ActivePower jet áp lực thấp trước; jet áp lực cao **và** foam brush; bảo vệ sơn áp lực thấp | 2 / 2 |
| SV8SE | SoftFoam lance; ActivePower jet **hoặc** foam brush | 3 / 2 |
| SV9 | SoftFoam lance; ActivePower jet **và** foam brush | 3 / 3 |
| SV10 | SoftFoam lance **và** brush; ActivePower jet áp lực cao | 3 / 3 |

Ảnh theo thứ tự là `Systemvariante_1`, `_2`, `_3SE`, `_4`, `_5`, `_6`, `_7`, `_8SE`, `_9`, `_10` trong thư mục [EHRLE uploads tháng 09/2024](https://www.ehrle.com/wp-content/uploads/2024/09/). Dùng tên/alt theo từng variant, ví dụ ảnh đầu: [SV1](https://www.ehrle.com/wp-content/uploads/2024/09/Systemvariante_1-802x1024.png), ảnh cuối: [SV10](https://www.ehrle.com/wp-content/uploads/2024/09/Systemvariante_10-801x1024.png). Cần đối chiếu từng ảnh nguồn trước khi tải vào theme; không đoán URL chỉ từ mẫu tên.

Sau 10 thẻ là heading `Overview of our system combinations`, [ảnh bảng so sánh](https://www.ehrle.com/wp-content/uploads/2025/12/Systemvarianten_Uebersicht_2-2-1024x674.png), rồi heading `Additional program with rim cleaner “WheelCleaner” available:` và [ảnh WheelCleaner](https://www.ehrle.com/wp-content/uploads/2024/09/Systemvariante_WheelCleaner-1024x421.png). Bảng nguồn là ảnh; nếu sản phẩm cần đọc trên mobile và hỗ trợ screen reader, ưu tiên dựng dữ liệu bảng thành `<table>` thật, có vùng cuộn ngang và tiêu đề cột/hàng.

### 4.6. Design your CarWash và phần cuối

- Heading `Design your CarWash`; đoạn ngắn nói về chọn màu hệ thống theo thương hiệu.
- Bộ ảnh trước/sau cùng một góc chụp: [mái xanh](https://www.ehrle.de/wp-content/uploads/2024/01/Schmid_Anlage-scaled.jpg) và [mái đỏ](https://www.ehrle.de/wp-content/uploads/2024/01/Schmid_Anlage_rot-scaled.jpg). Khung ảnh bo góc, đường chia trắng và nút kéo tròn ở giữa. Trạng thái đầu là 50/50; kéo sang phải làm lộ nhiều ảnh “trước” hơn, kéo sang trái làm lộ nhiều ảnh “sau” hơn. Đã thử trực tiếp: vị trí nút thay đổi từ 314 px sang 480 px, hai vùng ảnh đổi theo.
- Dải CTA nền đỏ nói về dữ liệu kỹ thuật, phụ kiện, tài liệu; nút `TO THE WEBSHOP` màu trắng. Ảnh phụ: [mockup màn hình webshop](https://www.ehrle.com/wp-content/uploads/2023/12/Ehrle-Webshop_Mockup-Monitor-1024x800.png). Đích đúng nếu dùng EHRLE là [shop.ehrle.com](https://shop.ehrle.com/).
- Video YouTube `c9bDyRvF44Q`; nguồn hiện dùng placeholder có mô tả chia sẻ dữ liệu bên thứ ba và 2 nút unblock. Bản triển khai nên dùng poster + nút Play có accessible name; chỉ tạo iframe sau thao tác người dùng/đồng ý phù hợp.
- Dải đỏ `CONTACT`, câu giới thiệu ngắn, CTA [To the contact form](https://www.ehrle.com/contact-us/).
- Khối `DOWNLOADS / OUR CURRENT BROCHURES`: [ảnh brochure](https://www.ehrle.com/wp-content/uploads/2024/11/Brochure-1024x683.jpg), mô tả tài liệu/price list/catalog, CTA [To the brochures](https://www.ehrle.com/downloads/).

## 5. Hiệu ứng và hành vi cần triển khai

### 5.1. Scroll reveal

- Các khối ảnh/text thường được cấu hình `fadeInLeft` / `fadeInRight`, xen kẽ hướng giữa media và text. Các link trong ba mục lục dùng `fadeInUp`.
- Ở thẻ đầu tiên, animation quan sát từ computed style dài khoảng **1,25 giây**. Đây là thời gian của source, không bắt buộc giữ chính xác nếu theme đã có preset tương đương.
- Chỉ khởi động một lần khi khối vào viewport; không để nội dung mất khả năng đọc nếu JS lỗi/chưa chạy. Với `prefers-reduced-motion: reduce`, hiện nội dung ngay, không dịch chuyển.
- Dải webshop và brochure có motion theo cuộn ở source (dịch nhẹ/opacity, brochure dịch ngang). Nếu theme đã có preset scroll, có thể dùng preset đó; giữ biên độ nhỏ, tránh layout shift và tránh làm text mất đọc. Hiệu ứng này thấp ưu tiên hơn ảnh so sánh trước/sau.

### 5.2. Mục lục trong trang

- Cả ba nhóm là **anchor link**, không phải tabs. Click/keyboard Enter cuộn đến section và URL hash phản ánh vị trí. Cho heading đích `scroll-margin-top` để không bị header sticky che.
- Source có một số link Heating systems trỏ đến hash tiếng Đức không khớp ID thực tế tiếng Anh/case khác nhau. Bản triển khai phải tự định nghĩa ID nhất quán rồi kiểm tra từng link. Với variant, một link đến nhóm 5 mục là hành vi nguồn; có thể cải thiện thành link đến đúng từng variant.
- Menu header đỏ vẫn sticky trên khung đã xem, nhưng header ngoài phạm vi task. Chỉ tính offset của nó cho anchor.

### 5.3. Thanh so sánh trước/sau

- Hai ảnh cùng kích thước và cùng crop, xếp chồng. Dùng `input type="range"` hoặc control tương đương có keyboard/touch/pointer, `min=0`, `max=100`, `value=50`, accessible name kiểu “So sánh màu mái trạm rửa”.
- Giá trị điều khiển thay đổi vị trí đường chia và clip của hai ảnh; kéo tới 0/100 vẫn ổn định. Không dùng HTML string tạo UI trong JS.
- Trên source nút kéo là `div` của thư viện TwentyTwenty và không xuất hiện dưới dạng slider trong accessibility tree. Bản mới nên sửa điểm này bằng control có thể focus, Arrow/Home/End hoạt động, focus ring rõ.
- Khi JS chưa sẵn sàng, hiển thị một ảnh tĩnh cùng chú thích để nội dung không trắng.

### 5.4. Hover/focus và media

- CTA và các anchor card cần phản hồi hover/focus nhẹ, nhất quán với theme; không dựa vào hover để lộ nội dung quan trọng. Source không được kiểm chứng đầy đủ trạng thái hover trong khung đã xem, nên không gán hiệu ứng hover đặc biệt.
- Video giữ tỉ lệ 16:9; placeholder có poster và nút Play. Không tự động phát, không tạo iframe YouTube cho phần chưa được người dùng mở.

## 6. Hướng triển khai trong Haravan theme

1. Trước khi code, tìm pattern hiện có cho page template, section header, card, button, scroll reveal, ảnh và in-page anchor. Lập reference map **structure / visual / behavior / motion / responsive** theo `docs/PATTERN-DISCOVERY.md`.
2. Liquid render sẵn heading, đoạn văn, link, ảnh và dữ liệu variant. JS chỉ tăng cường reveal và thanh so sánh. Không dùng Shopify section schema hoặc tag Liquid `render`.
3. Tái sử dụng `.container` / `.container-fluid`, shared typography và CTA của theme khi phù hợp. Nếu phần so sánh ảnh thực sự cần component mới, thiết kế contract, state và cleanup; đừng đưa behavior riêng trang vào core nếu chưa có ít nhất hai use case hợp lý.
4. Nếu tạo asset/snippet/template mới, báo trước path chính xác, mục đích, caller/load point, phạm vi deploy theo `AGENTS.md`. CSS/JS deploy nằm trong `FOX Fashion/assets/` của checkout hiện tại; Liquid trong `FOX Fashion/snippets/` hoặc `FOX Fashion/templates/`. Không tạo thư mục `sections/`.
5. Ảnh đưa vào theme phải được chọn theo quyền sử dụng, resize/nén theo `docs/image-guide.md`; gọi `{% include 'render-img' %}` tại markup Liquid sau khi kiểm tra contract của helper. URL ngoài ở tài liệu này là link đối chiếu, không truyền thẳng vào helper nếu helper đang áp `asset_url`.
6. Nội dung merchant cần chỉnh được thì thiết kế setting keys và defaults theo `docs/settings-guide.md`; chỉ thêm những setting có nhu cầu thực tế, không biến 10 variant thành 10 khối cấu hình lặp bất hợp lý.
7. Đặt link CTA theo đích thật của dự án. Trên trang nguồn, CTA webshop mobile có `href="#"`; không copy lỗi đó. Không dùng URL EHRLE cho shop của thương hiệu khác.

## 7. Tiêu chí hoàn thành cho Codex dev

- Đúng thứ tự 14 phần; không thay header/hero/footer ngoài phần nối layout cần thiết.
- Có đủ dữ liệu cho 4 kiểu kết cấu, 6 công nghệ, detergents, 5 kiểu gia nhiệt, 10 variant, overview/WheelCleaner, so sánh ảnh, CTA, video, contact, downloads.
- Không có link `#` vô nghĩa; tất cả anchor mục lục đến đúng ID và không bị sticky header che.
- Nội dung chính đọc được trước JS; ảnh có `alt`, kích thước hoặc tỉ lệ cố định, lazy loading hợp lý.
- Reveal không che text vĩnh viễn; reduced motion hoạt động; không tạo listener/observer leak.
- So sánh ảnh dùng được bằng chuột, touch và bàn phím; focus rõ; giới hạn 0–100 hợp lệ.
- Kiểm tra desktop/tablet/mobile, nội dung dài, variant rỗng/1/nhiều mục, ảnh thiếu, CTA thiếu URL và video chưa được bật.
- Kiểm tra console, network, overflow ngang, Liquid syntax, thứ tự asset load và link đích. Chỉ báo “đã test trên Haravan” nếu thực sự đã mở trang trên Haravan.

## 8. Giới hạn của bản tham chiếu

- Quan sát trực tiếp ở viewport khoảng **683 × 668 px**; chưa xác nhận screenshot desktop của nguồn. Các gợi ý desktop là hướng triển khai cần kiểm tra, không phải thông số đo từ source.
- Không bấm nút chấp thuận YouTube của trang nguồn; chỉ xác nhận placeholder và video ID trong markup.
- Copy trong tài liệu này là **tóm tắt ý**, không phải toàn bộ văn bản marketing nguồn. Merchant/owner cần chốt bản copy và ảnh được phép sử dụng trước khi publish.
- Đây là brief nội bộ; chưa có file theme nào được sửa và chưa kiểm thử trên Haravan.
