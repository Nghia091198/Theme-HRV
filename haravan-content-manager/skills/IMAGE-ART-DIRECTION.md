# Image Art Direction — Haravan demo content

Hướng dẫn viết prompt ảnh cho `$create-product` và `$create-article`. Mục tiêu: ảnh **giống ảnh chụp thật của một
thương hiệu có đầu tư** (catalog / editorial), đúng chủ đề shop, đồng bộ cả lô; không phải ảnh stock chung chung.

Đọc file này **trước khi viết bất kỳ prompt ảnh nào**. Prompt gửi cho `imagegen` viết bằng **tiếng Anh**.

---

## 1. Vì sao ảnh trông giả, xơ xài

| Nguyên nhân | Biểu hiện | Cách sửa trong file này |
|---|---|---|
| Prompt chỉ có chủ thể ("a woman wearing leggings") | nền trống, ánh sáng phẳng, không câu chuyện | công thức 7 lớp (mục 3) |
| Mỗi ảnh tự đặt bối cảnh, màu | cả lô lệch tông, nhìn như ghép từ nhiều nguồn | bảng chỉ đạo hình ảnh cho cả lô (mục 2) |
| Từ chung chung: "beautiful", "high quality", "4k", "professional" | ảnh bóng bẩy kiểu AI, da sáp, HDR | dùng thuật ngữ nhiếp ảnh cụ thể: ống kính, khẩu độ, hướng sáng |
| Không mô tả chất liệu | vải nhựa, không nếp, không đường may | luôn nêu chất liệu + chi tiết bề mặt |
| Nén JPEG quá mạnh | chi tiết vải / da bệt, xỉn, viền răng cưa | mục 8 |

---

## 2. Bước 1: lập bảng chỉ đạo hình ảnh cho cả lô

Trước khi viết prompt từng ảnh, viết **một bảng chung** từ chủ đề shop, rồi **dùng lại nguyên văn** các dòng của bảng
trong mọi prompt của lô. Đây là điều quan trọng nhất để cả lô trông như cùng một buổi chụp.

```text
BRAND WORLD (dùng lại trong mọi prompt của lô)
- Mood:        <3–4 tính từ, ví dụ: calm, confident, airy, premium-minimal>
- Palette:     <3–5 màu cụ thể, ví dụ: warm sand, soft stone grey, muted coral accent, deep navy>
- Locations:   <2–3 bối cảnh thật, cụ thể, ví dụ: sunlit pilates studio with pale oak floor and linen curtains;
                quiet riverside running path at golden hour>
- Light:       <hướng + chất sáng, ví dụ: soft window light from camera-left, gentle falloff, warm 4500K>
- Models:      <độ tuổi, vóc dáng tự nhiên, phong cách tóc / trang điểm; người châu Á / Việt Nam khi phù hợp>
- Props:       <đạo cụ đúng ngành, tối đa 2–3, ví dụ: cork yoga block, glass water bottle, rolled mat>
- Camera:      <ví dụ: full-frame, 50mm and 85mm prime, f/2.8, eye-level>
- Grade:       <ví dụ: natural colour, soft contrast, lifted shadows, no heavy filter>
```

**Theo theme glassify của FOX** (nền kính tối, sáng ấm, nhấn màu ngành): palette nên có **1 tông trung tính ấm**
(cát, đá, kem), **1 tông tối sâu** (navy, than chì) và **đúng 1 màu nhấn ngành** (Activewear: cam san hô `#FF7A45`).
Bối cảnh có **ánh sáng xuyên kính, phản chiếu nhẹ**, bề mặt mờ (kính mờ, đá mài, gỗ sồi nhạt) hợp tinh thần theme.

---

## 3. Bước 2: công thức prompt 7 lớp

Mỗi prompt ghép đủ 7 lớp theo thứ tự, mỗi lớp một câu ngắn:

1. **Shot type**: loại ảnh + khung hình. `Editorial full-body ecommerce photo, vertical crop` / `Close-up detail shot`.
2. **Subject**: chủ thể + sản phẩm mô tả cụ thể (màu, chất liệu, chi tiết). `A Vietnamese woman in her late 20s
   wearing a high-waist 7/8 legging in matte charcoal nylon-spandex, flat-lock seams, wide waistband`.
3. **Action / pose**: hành động tự nhiên đang diễn ra, không tạo dáng cứng. `mid-stride, glancing down, adjusting the
   waistband with one hand`.
4. **Setting**: bối cảnh từ bảng chỉ đạo + 1–2 chi tiết thật. `sunlit pilates studio, pale oak floor, reformer
   machine softly out of focus behind her`.
5. **Light**: hướng + chất + thời điểm. `soft window light from camera-left, warm late-morning, gentle shadows on
   the floor`.
6. **Camera**: ống kính, khẩu độ, góc. `shot on 85mm at f/2.8, eye-level, shallow depth of field`.
7. **Realism cues**: dấu hiệu ảnh thật. `natural skin texture with visible pores, a few flyaway hairs, real fabric
   creases at the knees, subtle sweat sheen, slight motion in the hair`.

Cuối prompt luôn thêm **khối loại trừ** (mục 7).

**Từ nên dùng:** editorial, candid, catalog, natural light, window light, overcast, golden hour, matte, textured,
85mm, 50mm, 35mm, f/2.8, shallow depth of field, eye-level, three-quarter view.

**Từ không dùng:** beautiful, perfect, flawless, ultra-detailed, 8k, hyperrealistic, award-winning, cinematic lighting
(gây hiệu ứng AI bóng bẩy). Không dùng tên thương hiệu thật, tên người nổi tiếng, tên nhiếp ảnh gia.

---

## 4. Sản phẩm: bộ góc chụp

Mỗi sản phẩm cần **bộ ảnh có vai trò khác nhau**, không phải 3 ảnh giống nhau đổi màu.

| Ảnh | Vai trò | Khung | Ghi chú |
|---|---|---|---|
| 1 · **Hero** | ảnh đại diện trên thẻ sản phẩm | toàn thân / toàn sản phẩm, nền liền (seamless) màu trung tính ấm của bảng chỉ đạo | sản phẩm chiếm 60–70% khung, căn giữa, có bóng đổ thật dưới chân |
| 2 · **On-model lifestyle** | sản phẩm trong bối cảnh dùng thật | 3/4 hoặc toàn thân trong bối cảnh của bảng | đang vận động / sinh hoạt; cùng người mẫu, cùng sản phẩm với ảnh 1 |
| 3 · **Detail** | chứng minh chất lượng | cận cảnh 1 chi tiết: đường may, chất vải, cạp, khoá, đế | macro 100mm, thấy rõ vân vải, sợi chỉ |
| 4–10 (khi cần) | góc sau, góc nghiêng, phối đồ, cầm nắm, so màu | theo nhu cầu | giữ nguyên ánh sáng, người mẫu |

**Màu (option `Màu sắc`):** ảnh 1 của **mỗi màu** dùng **cùng prompt hero**, chỉ đổi đúng tên màu. Nếu `imagegen` hỗ trợ
ảnh tham chiếu / chỉnh sửa, dùng ảnh hero màu đầu làm tham chiếu cho các màu còn lại.

**Neo đồng nhất** (thêm vào mọi ảnh của 1 sản phẩm):
`same model, same hairstyle, same garment design and fit as the reference, same lighting direction`.

### Ghi chú theo ngành
- **Đồ tập / thời trang:** luôn có người mẫu thật (không manocanh, không ảnh trải phẳng trừ khi được yêu cầu). Nêu
  chất liệu (nylon-spandex, cotton jersey, ribbed knit), dáng (high-waist, cropped, oversized), chi tiết (flat-lock
  seams, hidden pocket, racerback).
- **Giày, túi, phụ kiện:** hero trên bục / khối đá mài, ánh sáng bên tạo khối; lifestyle đang mang / cầm; detail đế,
  khoá kéo, đường chỉ.
- **Mỹ phẩm, chăm sóc da:** bề mặt ướt, giọt nước, kính mờ, đá; detail kết cấu kem / gel trên đầu ngón tay. Không
  hiển thị chữ trên bao bì (để trống nhãn).
- **Đồ gia dụng, nội thất:** đặt trong căn phòng thật đang sử dụng, có dấu hiệu sống (cốc dở, sách mở); ánh sáng cửa sổ.
- **Đồ ăn uống:** ánh sáng bên ấm, khay / khăn vải, vụn bánh, hơi nước; góc 45° hoặc từ trên xuống.

---

## 5. Ảnh bìa bài viết

Ảnh bìa là **ảnh editorial 16:9** minh hoạ **đúng ý chính của bài**, không phải ảnh sản phẩm.

1. Đọc tiêu đề + tóm tắt, rút ra **1 khoảnh khắc cụ thể** đại diện cho bài.
2. Chọn kiểu ảnh theo loại bài:

| Loại bài | Kiểu ảnh bìa |
|---|---|
| Hướng dẫn (how-to) | người đang thực hiện đúng bước quan trọng nhất, góc rõ động tác |
| Xu hướng / phối đồ | 1–2 người mặc bộ phối trong bối cảnh đời thường, khung editorial |
| So sánh / chọn mua | flat-lay có sắp đặt hoặc 2 món đặt cạnh nhau trên bề mặt thật |
| Câu chuyện / cảm hứng | khoảnh khắc candid, nhiều không gian, cảm xúc rõ |
| Kiến thức / chất liệu | macro chất liệu, bàn tay đang chạm / kéo giãn vải |

3. **Bố cục:** chủ thể lệch phải (theo quy tắc 1/3), **chừa khoảng trống thoáng bên trái** (theme có thể đặt tiêu đề lên
   ảnh). Không chữ trong ảnh.
4. Dùng cùng **bảng chỉ đạo hình ảnh** với sản phẩm của shop để blog và sản phẩm đồng bộ.
5. **Mỗi bài một bối cảnh / khoảnh khắc khác nhau**: trong cùng lô không lặp lại cùng một cảnh hay cùng một góc máy.

---

## 6. Kiểm tra trước khi dùng ảnh

Loại bỏ và tạo lại nếu có **bất kỳ** điểm nào:
- tay / ngón tay / chi / răng / mắt sai hình, thừa thiếu; khuôn mặt méo hoặc trùng nhau giữa nhiều người;
- da sáp, mịn như nhựa, không có lỗ chân lông; tóc dính khối;
- vải không nếp, đường may vô lý, khoá kéo / dây đứt đoạn, phụ kiện dính vào người;
- có chữ, logo, watermark, chữ giả trên bao bì / biển hiệu;
- ánh sáng mâu thuẫn (bóng đổ 2 hướng), viền sáng quanh người kiểu ghép;
- màu sản phẩm lệch với tên màu của variant;
- ảnh trong cùng sản phẩm khác người mẫu / khác thiết kế; ảnh trong cùng lô lệch tông bảng chỉ đạo;
- sản phẩm quá nhỏ hoặc bị cắt mất phần quan trọng.

---

## 7. Khối loại trừ (thêm cuối mọi prompt)

```text
Avoid: text, letters, logos, watermarks, brand marks, mannequins, floating garments, plastic or waxy skin,
over-smoothed retouching, HDR look, oversaturated colours, CGI render look, distorted hands, extra fingers,
duplicated limbs, warped faces, impossible seams, harsh flash, cluttered background.
```

---

## 8. Xuất file

- Tạo ảnh ở **độ phân giải gốc cao nhất có thể**, rồi mới thu về đúng kích thước yêu cầu (sản phẩm 1600×1600, bìa
  1920×1080) bằng bộ lọc Lanczos, **làm nét nhẹ** (unsharp mask nhỏ) sau khi thu.
- JPEG **progressive, chất lượng 82–86**, chroma subsampling 4:2:0. Nếu vượt giới hạn dung lượng, **giảm chất lượng
  từng bước 2 đơn vị**, không xuống dưới 76; nếu vẫn vượt, ưu tiên cắt khung gọn hơn thay vì nén mạnh.
- Xoá metadata EXIF / thông tin sinh ảnh.
- Giới hạn hiện tại (512KB / ảnh sản phẩm 1600px) khá chặt cho ảnh nhiều chi tiết vải. Nếu Haravan cho phép, nâng
  lên **~900KB** sẽ giữ chi tiết tốt hơn rõ rệt.

---

## 9. Ví dụ đầy đủ: FOX Activewear

### Bảng chỉ đạo hình ảnh

```text
BRAND WORLD
- Mood:      calm, confident, airy, premium-minimal
- Palette:   warm sand, soft stone grey, deep charcoal, one muted coral accent (#FF7A45)
- Locations: sunlit pilates studio with pale oak floor, linen curtains and frosted glass partitions;
             quiet riverside running path in Ho Chi Minh City at early morning
- Light:     soft window light from camera-left, warm 4500K, gentle falloff; outdoors: low golden sun behind subject
- Models:    Vietnamese adults 22–35, athletic but natural builds, minimal makeup, hair tied back loosely
- Props:     cork yoga block, rolled sage mat, clear glass water bottle
- Camera:    full-frame, 85mm f/2.8 for on-model, 100mm macro for details, eye-level
- Grade:     natural colour, soft contrast, slightly lifted shadows, no filter
```

### Sản phẩm: "Quần legging cạp cao AeroFit", màu Than chì

**Ảnh 1 · Hero**
```text
Editorial full-body ecommerce photo, vertical 1:1 crop. A Vietnamese woman in her late 20s wearing a high-waist
7/8 legging in matte charcoal nylon-spandex with flat-lock seams and a wide smooth waistband, paired with a plain
sand-coloured crop top. Standing relaxed, weight on one leg, hands loosely at her sides, slight smile. Warm sand
seamless paper backdrop with a soft natural shadow on the floor. Soft window light from camera-left, warm 4500K.
Shot on 85mm at f/4, eye-level, product filling 65% of the frame. Natural skin texture with visible pores, a few
flyaway hairs, real fabric tension at the hips and soft creases behind the knees. Natural colour, soft contrast.
Avoid: text, letters, logos, watermarks, ... (khối loại trừ mục 7)
```

**Ảnh 2 · Lifestyle**
```text
Candid editorial photo, square crop. The same model, same hairstyle, same charcoal high-waist legging and sand crop
top as the reference, in a sunlit pilates studio with a pale oak floor, linen curtains and a frosted glass partition
softly out of focus. She is mid-movement on a rolled sage mat, stretching into a low lunge, one hand on a cork yoga
block. Soft window light from camera-left, warm late morning, gentle shadows across the floor. Shot on 85mm at
f/2.8, slightly low angle, shallow depth of field. Visible skin texture, a light sweat sheen on the shoulders,
real fabric stretch at the knee. Natural colour, soft contrast, lifted shadows. Avoid: ...
```

**Ảnh 3 · Detail**
```text
Close-up detail photo, square crop. Macro of the wide waistband and flat-lock side seam of a matte charcoal
nylon-spandex legging worn on the hip, a hand lightly pulling the waistband to show its thickness and stretch.
Fine knit texture and individual stitches clearly visible. Soft window light from camera-left raking across the
fabric to reveal texture. Shot on 100mm macro at f/5.6. Natural colour, soft contrast. Avoid: ...
```

### Bài viết: "5 động tác pilates giúp chạy bộ bền hơn" (ảnh bìa)

```text
Editorial blog cover photo, 16:9 landscape. A Vietnamese woman in her early 30s in a charcoal legging and sand
crop top holding a side plank on a rolled sage mat, on the right third of the frame, in a quiet riverside park in
Ho Chi Minh City at early morning. Running shoes placed beside the mat, river and soft trees blurred behind,
open calm space on the left side of the frame. Low golden sun behind her creating a gentle rim light, soft
natural fill. Shot on 50mm at f/2.8, eye-level, shallow depth of field. Natural skin texture, real fabric
creases, slight morning haze. Natural colour, soft contrast. Avoid: ...
```

---

## 10. Checklist cho mỗi lô

- [ ] Viết bảng chỉ đạo hình ảnh cho lô, dùng lại nguyên văn trong mọi prompt.
- [ ] Mỗi prompt đủ 7 lớp + khối loại trừ.
- [ ] Sản phẩm: đủ vai trò hero · lifestyle · detail; ảnh các màu dùng chung prompt hero, chỉ đổi màu.
- [ ] Bài viết: mỗi bài một khoảnh khắc riêng, chủ thể lệch phải, chừa khoảng trống trái.
- [ ] Kiểm tra từng ảnh theo mục 6; tạo lại ảnh lỗi trước khi gọi MCP.
- [ ] Xuất file theo mục 8.
