import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "output", "fox-aw-20261112-02");
const model = "cx/gpt-image-2.5";

const common = "Chỉ tạo MỘT bức ảnh vuông, MỘT cảnh liên tục, không ghép khung, không collage, không chữ, không logo, không watermark. Ảnh thời trang thể thao thương mại chân thực, người mẫu nữ trưởng thành, da và chất vải tự nhiên, ánh sáng vật lý hợp lý. Tránh bàn tay méo, ngón thừa, tay chân trùng, khớp bất thường, khuôn mặt nhựa, quần áo biến dạng, phụ kiện lơ lửng, người lặp lại hoặc vật thể méo.";
const jacket = "Sản phẩm chính phải là cùng một áo khoác tập nữ màu xanh olive đậm, bề mặt mờ, phom thẳng thoải mái dài ngang hông, cổ đứng thấp, khóa kéo thẳng giữa thân trước, tay áo dài, không mũ, không sọc, không logo, không túi ngoài lộ rõ. Giữ chính xác màu và cấu trúc áo qua toàn bộ ảnh; người mẫu chính mặc áo với quần tập đen và giày thể thao trắng.";
const pants = "Sản phẩm chính phải là cùng một quần tập Pilates nữ màu nâu mocha, cạp cao bản rộng liền mạch, ống suông rộng từ đùi xuống gấu, dài chạm gần mắt cá, bề mặt vải mờ, không dây rút, không sọc, không logo, không túi ngoài lộ rõ. Giữ chính xác màu và cấu trúc quần qua toàn bộ ảnh; người mẫu chính mặc với áo tập ôm màu kem đơn giản và tất hoặc giày phù hợp bối cảnh.";

const scenes = {
  "p1-hero": { reference: false, prompt: `${jacket} Một phụ nữ Việt Nam khoảng 28 tuổi vừa bước vào sảnh phòng tập hiện đại có cửa kính lớn và vài người tập mờ ở hậu cảnh; cô kéo khóa áo đến giữa ngực, tay còn lại cầm quai túi tập màu đen. Chụp toàn thân góc ba phần tư từ phía trước, áo rõ từ cổ đến gấu, bố cục thoáng. Ánh sáng buổi sáng từ cửa sổ bên trái, tông trung tính và olive, phong cách ảnh thương mại đời sống. ${common}` },
  "p1-group": { reference: true, prompt: `${jacket} Trong phòng gym thật có thiết bị và cửa sổ lớn, người mẫu chính đứng cùng ba bạn nữ trưởng thành đang khởi động trước buổi tập; cô hơi cúi người kéo giãn vai, các bạn dùng dây kháng lực và trò chuyện tự nhiên, không ai che áo chính. Trung cảnh ngang tầm mắt, chủ thể chính ở tiền cảnh, nhóm và máy tập có chiều sâu. Ánh sáng ban ngày dịu, ảnh phóng sự thời trang chân thực. ${common}` },
  "p1-action": { reference: true, prompt: `${jacket} Người mẫu chính đang đi bộ nhanh giữa các khu vực thiết bị trong phòng gym, tay đeo đồng hồ thể thao, tay kia cầm khăn tập gấp gọn, một người khác tập ở xa. Chụp toàn thân từ góc nghiêng ba phần tư, bước chân có nhịp tự nhiên nhưng áo khoác vẫn rõ khóa kéo, cổ và gấu; nền hơi nhòe chuyển động nhẹ. Ánh sáng cửa sổ kết hợp đèn phòng tập, phong cách nhiếp ảnh vận động thật. ${common}` },
  "p1-lifestyle": { reference: true, prompt: `${jacket} Sau buổi tập, người mẫu chính và một người bạn ngồi trò chuyện ở bàn ngoài trời của quán cà phê đô thị; cô cầm ly cà phê giấy, túi tập đặt cạnh ghế, người bạn mặc đồ thể thao màu kem. Ảnh trung cảnh chụp từ bên hông bàn, thấy rõ cổ đứng, khóa kéo và phom áo chính, biểu cảm cười tự nhiên, không nhìn vào máy ảnh. Nắng chiều mềm qua tán cây, phong cách đời sống biên tập. ${common}` },
  "p1-styling": { reference: false, prompt: `${jacket} Một phụ nữ trưởng thành mặc áo khoác chính phối quần tập đen, giày trắng, túi tote vải màu kem và kính mát trên đầu, đi qua lối đi có hàng cây và mặt tiền cửa hàng sau buổi tập. Chụp toàn thân từ phía bên trái ở góc ba phần tư, cô bước nhanh qua khung hình, tay phải giữ quai túi tote, tay trái đánh theo nhịp bước; cả hai tay không chạm vào áo hoặc khóa kéo. Cổ đứng và toàn bộ khóa kéo áo vẫn rõ, có người đi bộ ở xa. Ánh sáng nắng nhẹ buổi sáng, ảnh thời trang đường phố chân thực, tông olive, kem, than. ${common}` },
  "p1-detail": { reference: true, prompt: `${jacket} Cận cảnh từ cổ đến hông của chính người mẫu đang mặc áo khoác olive, cô dùng hai ngón tay chỉnh phần cổ đứng và khóa kéo giữa thân; thấy rõ bề mặt vải mờ, nếp gấp tự nhiên, đường may gọn và gấu áo ngang hông. Phòng tập sáng có bình nước và khăn ở hậu cảnh mờ. Góc máy gần ngang ngực, không cắt mất bàn tay, ánh sáng cửa sổ mềm, ảnh chi tiết thương mại chân thật. ${common}` },
  "p2-hero": { reference: false, prompt: `${pants} Một phụ nữ Việt Nam trưởng thành đứng chuẩn bị trải thảm trong studio Pilates sáng, sàn gỗ ấm, cửa sổ cao và máy tập ở xa; cô nghiêng người nhẹ, một tay cầm thảm cuộn, nét mặt thư giãn. Chụp toàn thân góc ba phần tư từ phía trước để thấy trọn cạp, ống suông và gấu quần; không che sản phẩm. Ánh sáng sáng sớm dịu từ cửa sổ bên phải, ảnh thương mại đời sống tông mocha và kem. ${common}` },
  "p2-group": { reference: true, prompt: `${pants} Lớp Pilates có bốn phụ nữ trưởng thành đang tập trên bốn tấm thảm riêng; người mẫu chính ở tiền cảnh trong tư thế kéo giãn đứng nhẹ nhàng, ba người sau có tư thế khác nhau hợp lý, giảng viên đang hướng dẫn bằng cử chỉ tự nhiên. Người mẫu chính đi tất chống trượt màu kem, quần mocha nhìn rõ toàn bộ cạp và ống. Chụp toàn thân góc rộng vừa phải với chiều sâu phòng tập, ánh sáng cửa sổ ban ngày, ảnh phóng sự chân thực. ${common}` },
  "p2-action": { reference: true, prompt: `${pants} Trong studio Pilates, người mẫu chính đang bước lên bục thấp để thực hiện bài thăng bằng nhẹ, tay giơ ngang tự nhiên, quần ống suông mocha chuyển động theo chân nhưng không biến thành legging hay quần bó; một bạn tập đứng gần quan sát. Có thảm và vòng Pilates đặt đúng chỗ. Góc chụp nghiêng toàn thân, ánh sáng tự nhiên rõ, ảnh vận động thời trang không kịch tính. ${common}` },
  "p2-lifestyle": { reference: true, prompt: `${pants} Trong căn hộ sáng có cây xanh và cửa sổ, người mẫu chính ngồi trên ghế dài sau buổi tập tại nhà, cúi người buộc tóc gọn, bên cạnh là thảm cuộn và bình nước; quần mocha vẫn thấy rõ cạp cao và ống rộng dọc chân. Chụp trung toàn thân ngang tầm mắt, khoảnh khắc không nhìn máy ảnh, ánh sáng sáng sớm nhẹ và bóng đổ thật, phong cách đời sống gần gũi. ${common}` },
  "p2-styling": { reference: true, prompt: `${pants} Sau lớp Pilates, người mẫu chính đi bộ cùng một bạn nữ trên vỉa hè rợp nắng, phối quần mocha với áo tập màu kem, áo sơ mi trắng mỏng khoác mở, giày thể thao trắng và túi tote; áo khoác ngoài không che cạp và ống quần. Hai người trò chuyện tự nhiên khi bước đi, quán cà phê ở hậu cảnh. Chụp toàn thân góc ba phần tư, ánh sáng chiều dịu, ảnh thời trang đường phố chân thực. ${common}` },
  "p2-detail": { reference: true, prompt: `${pants} Ảnh cận từ eo đến dưới gối của người mẫu chính đang đứng cạnh máy Pilates, một tay đặt nhẹ lên cạp quần mocha để thấy cạp cao bản rộng liền mạch, đường may và độ rủ tự nhiên của ống suông; tay còn lại cầm khăn tập gấp gọn. Bố cục gần góc ba phần tư, chất vải mờ rõ nét, hậu cảnh studio mờ nhẹ, ánh sáng cửa sổ mềm, ảnh chi tiết thương mại chân thật. ${common}` },
};

async function generate(name) {
  const scene = scenes[name];
  if (!scene) throw new Error(`Unknown scene: ${name}`);
  const url = `${process.env.NINEROUTER_URL?.replace(/\/$/, "")}/v1/images/generations`;
  if (!process.env.NINEROUTER_URL || !process.env.NINEROUTER_KEY) throw new Error("9Router configuration missing");
  const body = { model, prompt: scene.prompt, n: 1, size: "1600x1600", response_format: "b64_json" };
  if (scene.reference) {
    const referenceName = name.startsWith("p1-") ? "p1-hero.jpg" : "p2-hero.jpg";
    body.image = (await readFile(path.join(output, referenceName))).toString("base64");
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NINEROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error(`9Router HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const result = await response.json();
  const item = result.data?.[0];
  if (!item) throw new Error("9Router returned no image");
  const source = item.b64_json ? Buffer.from(item.b64_json, "base64") : await fetch(item.url).then((value) => value.arrayBuffer()).then(Buffer.from);
  const metadata = await sharp(source).metadata();
  let final;
  for (const quality of [84, 80, 76, 72, 68, 64, 60]) {
    final = await sharp(source).resize(1600, 1600, { fit: "cover", kernel: "lanczos3" }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (final.length < 512_000) break;
  }
  if (final.length >= 512_000) throw new Error(`Image exceeds 512000 bytes: ${final.length}`);
  await mkdir(output, { recursive: true });
  const destination = path.join(output, `${name}.jpg`);
  await writeFile(destination, final);
  console.log(JSON.stringify({ scene: name, path: destination, source: `${metadata.width}x${metadata.height}`, final: "1600x1600", bytes: final.length, model }));
}

const name = process.argv[2];
if (name === "--list") console.log(Object.keys(scenes).join("\n"));
else await generate(name);
