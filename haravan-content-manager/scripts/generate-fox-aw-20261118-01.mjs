import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const batchId = "fox-aw-20261118-01";
const outputDir = path.resolve("output", batchId);
const manifestPath = path.join(outputDir, "manifest.json");
const sceneId = process.argv[2];
const model = "cx/gpt-image-2.5";

const brand = "Ảnh chiến dịch Fox Activewear cho phụ nữ Việt Nam trưởng thành 25–35 tuổi, vóc dáng khỏe khoắn tự nhiên. Tông kem ấm, gỗ sồi nhạt, xám than và một điểm nhấn san hô nhỏ trong bối cảnh. Da có kết cấu thật, tóc có vài sợi bay, vải có nếp gấp tự nhiên. Ánh sáng có hướng rõ ràng, màu trung thực, tương phản mềm, không xử lý da quá mức.";
const avoid = "Tránh chữ, logo, watermark, ảnh ghép, nhiều khung, người mẫu ma-nơ-canh, da nhựa, tay chân hoặc ngón thừa, mặt méo, đường may phi lý, đồ vật lơ lửng, phụ kiện dính vào người, sản phẩm bị che, hiệu ứng HDR.";

const products = {
  A: "Sản phẩm chính duy nhất là áo ba lỗ tập nữ màu kem ấm, dáng suông vừa, dài ngang hông, cổ tròn cao vừa, vai bản rộng, không tay, gấu ngang, bề mặt vải mờ trơn, không họa tiết, không logo, không túi, không khóa. Giữ nguyên toàn bộ thiết kế này ở mọi ảnh. Quần, giày và phụ kiện chỉ để phối đồ, không thuộc sản phẩm bán.",
  B: "Sản phẩm chính duy nhất là quần short chạy bộ nữ màu xám than, cạp chun cao bản vừa, ống rộng nhẹ, dài đến giữa đùi, gấu thẳng, bề mặt vải mờ trơn, không họa tiết, không logo, không túi, không khóa, không đường viền tương phản. Giữ nguyên toàn bộ thiết kế này ở mọi ảnh. Áo, giày và phụ kiện chỉ để phối đồ, không thuộc sản phẩm bán.",
};

const scenes = {
  A01: { file: "ao-ba-lo-A01.jpg", role: "Hero", shot: "Một người mẫu nữ Việt Nam trưởng thành bước vào studio Pilates sáng, áo thấy rõ từ vai đến gấu, phối quần tập xám than đơn giản. Túi tập đeo ở tay không che áo. Khung toàn thân góc ba phần tư ngang mắt, người mẫu ở trung tâm, cửa kính và sàn gỗ sồi tạo chiều sâu. Nắng cửa sổ buổi sáng từ bên trái. Khoảnh khắc tự tin đang bước đi, không nhìn thẳng máy ảnh." },
  A02: { file: "ao-ba-lo-A02.jpg", role: "Group", shot: "Trong lớp Pilates có bốn phụ nữ trưởng thành; người mẫu chính ở tiền cảnh chuẩn bị thảm, ba người bạn phía sau đang khởi động tự nhiên. Áo kem của mẫu chính thấy trọn phần cổ, vai và gấu. Có thảm, vòng Pilates đặt cạnh thảm và tất chống trượt. Khung trung toàn góc ngang, studio có cửa sổ và gương ở hậu cảnh, ánh sáng dịu từ trái. Giao tiếp bằng nụ cười và ánh nhìn, không tạo đội hình cứng." },
  A03: { file: "ao-ba-lo-A03.jpg", role: "Action", shot: "Một người mẫu nữ trưởng thành thực hiện động tác kéo giãn đứng có kiểm soát trong studio Pilates, một tay đặt nhẹ lên thanh ngang máy tập, lưng và chân đúng tư thế. Áo kem dáng suông vẫn thấy rõ cổ, vai, thân và gấu. Khung toàn thân góc chéo thấp vừa, máy tập ở sau không che áo. Ánh sáng cửa sổ giữa buổi, cảm giác tập trung và linh hoạt." },
  A04: { file: "ao-ba-lo-A04.jpg", role: "Lifestyle", shot: "Hai người bạn nữ trưởng thành vừa rời lớp tập, đi bộ và trò chuyện trên hành lang có kính mờ và cây xanh. Mẫu chính mặc áo kem, quần tập xám than, cầm bình nước thấp bên hông để áo nhìn rõ. Khung trung toàn kiểu phóng sự, góc ba phần tư, bước chân tự nhiên, nắng cuối buổi sáng và bóng đổ mềm. Bạn đi cạnh mặc trang phục khác, không làm lẫn sản phẩm chính." },
  A05: { file: "ao-ba-lo-A05.jpg", role: "Detail", shot: "Cận cảnh trên cơ thể người mẫu trưởng thành, tập trung vào cổ tròn cao vừa, vai bản rộng và bề mặt mờ trơn của chiếc áo ba lỗ màu kem; thấy một phần cằm, vai và thân áo để nhận diện trang phục. Tay mẫu đang chỉnh nhẹ gấu áo một cách tự nhiên. Ánh sáng xiên từ cửa sổ để thấy nếp vải thật. Khung cận đơn, ống kính macro, không bịa đường may trang trí hoặc họa tiết." },
  A06: { file: "ao-ba-lo-A06-v2.jpg", role: "Recovery", shot: "Ba phụ nữ trưởng thành ngồi nghỉ sau lớp Pilates ở bàn ngoài trời của quán cà phê nhiều cây xanh, trò chuyện vui. Mẫu chính ngồi đầu bàn gần máy ảnh, áo kem nhìn rõ từ vai đến gấu, không bị tay, ly cà phê hoặc phụ kiện che. Túi tập đặt dưới ghế, bình nước trên bàn. Khung trung toàn kiểu phóng sự, có mặt tiền phố và cây ở hậu cảnh, ánh sáng chiều nhẹ từ bên trái, gương mặt và bàn tay tự nhiên, cảm giác gần gũi. Đây là bối cảnh thứ ba khác với studio và hành lang lớp tập." },
  B01: { file: "quan-short-B01.jpg", role: "Hero", shot: "Một người mẫu nữ Việt Nam trưởng thành sải bước trên lối chạy ven hồ lúc sáng sớm, mặc quần short xám than phối áo tập trắng trơn và giày chạy phù hợp. Quần thấy rõ từ cạp đến gấu, không bị áo phủ cạp. Khung toàn thân góc ba phần tư ngang mắt, chân tiếp đất tự nhiên, mặt hồ và hàng cây tạo chiều sâu, nắng thấp ấm phía sau và ánh sáng bù mềm." },
  B02: { file: "quan-short-B02.jpg", role: "Action", shot: "Hai người bạn nữ trưởng thành chạy cạnh nhau trên đường công viên nhiều cây, mẫu chính ở gần máy ảnh giữa nhịp chạy tự nhiên, mặc quần short xám than với cạp và ống thấy rõ. Người bạn ở sau nửa bước, giao tiếp bằng ánh nhìn. Giày chạy và đồng hồ thể thao đúng ngữ cảnh. Khung toàn thân góc tracking ngang hông, hậu cảnh chuyển động nhẹ, chân không bị cắt, ánh sáng sớm trung thực." },
  B03: { file: "quan-short-B03.jpg", role: "Gym", shot: "Một người mẫu nữ trưởng thành đang thực hiện bước lên bục thấp trong phòng gym sáng, động tác an toàn với đầu gối và bàn chân thẳng trục. Quần short xám than thấy rõ cạp, chiều dài và gấu; áo tập trắng trơn không che cạp. Có người tập ở hậu cảnh mờ, khăn và bình nước đặt ở ghế bên cạnh. Khung trung toàn ngang mắt, ánh sáng cửa sổ từ trái, cảm giác tập trung." },
  B04: { file: "quan-short-B04.jpg", role: "Community", shot: "Bốn người bạn nữ trưởng thành vừa kết thúc buổi chạy tại sân mở ven công viên, đang chạm tay chúc mừng tự nhiên; mẫu chính đứng gần máy ảnh và quần short xám than thấy trọn cạp đến gấu. Người khác mặc đồ khác màu, không che mẫu chính. Khung rộng vừa ngang mắt, đủ thấy chân người mẫu, cây xanh và bậc thềm ở sau, nắng sớm mềm, niềm vui chân thực." },
  B05: { file: "quan-short-B05.jpg", role: "Detail", shot: "Cận cảnh chiếc quần short chạy bộ màu xám than đang được người mẫu trưởng thành mặc, tập trung vào cạp chun cao bản vừa, ống rộng nhẹ và gấu thẳng, thấy phần hông và đùi để xác nhận tỷ lệ. Một bàn tay đặt tự nhiên bên hông, không kéo vải. Ánh sáng cạnh mềm làm hiện bề mặt vải mờ và nếp gấp thật. Khung cận đơn, không thêm túi, khóa hoặc đường viền." },
  B06: { file: "quan-short-B06.jpg", role: "Lifestyle", shot: "Mẫu chính và một người bạn đi bộ thư giãn trên phố có cây sau buổi chạy, đang trò chuyện và cầm bình nước, mẫu chính mặc quần short xám than cùng áo trắng trơn, giày chạy và túi đeo vai nhỏ. Quần thấy rõ cạp, ống và gấu; túi không che sản phẩm. Khung toàn thân kiểu phóng sự, góc ba phần tư, ánh sáng cuối buổi sáng, bối cảnh quán cà phê ở xa không có chữ đọc được." },
};

if (!Object.hasOwn(scenes, sceneId)) {
  throw new Error(`Unknown scene ${sceneId}. Choose ${Object.keys(scenes).join(", ")}.`);
}

const scene = scenes[sceneId];
const productKey = sceneId[0];
const prompt = `Tạo đúng MỘT bức ảnh thời trang thương mại chân thực, một cảnh và một khung hình vuông duy nhất. ${products[productKey]} ${brand} Cảnh ${sceneId}, vai trò ${scene.role}: ${scene.shot} Nhiếp ảnh thời trang thể thao chân thực, máy ảnh full-frame, độ sâu trường ảnh hợp lý, sản phẩm là điểm nhìn chính. ${avoid} Chỉ xuất một file ảnh độc lập.`;

await mkdir(outputDir, { recursive: true });
let manifest = { batch_id: batchId, model, scenes: {} };
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch {}
if (manifest.scenes?.[sceneId]?.status === "QC_PASSED") throw new Error(`${sceneId} already passed QC.`);
const attempt = (manifest.scenes?.[sceneId]?.attempts ?? 0) + 1;
if (attempt > 3) throw new Error(`${sceneId} reached three attempts.`);
manifest.scenes ??= {};
manifest.scenes[sceneId] = { product_key: productKey, scene_id: sceneId, role: scene.role, status: "GENERATING", attempts: attempt, prompt, image_file: null, qc_score: null, qc_notes: null, uploaded: false, haravan_image_id: null };
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

try {
  const url = new URL("/v1/images/generations?response_format=binary", process.env.NINEROUTER_URL);
  const body = { model, prompt, n: 1, size: "2048x2048", output_format: "jpeg" };
  if (sceneId !== "A01" && sceneId !== "B01") {
    const heroFile = path.join(outputDir, sceneId[0] === "A" ? scenes.A01.file : scenes.B01.file);
    body.image = (await readFile(heroFile)).toString("base64");
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.NINEROUTER_KEY ? { Authorization: `Bearer ${process.env.NINEROUTER_KEY}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`9Router HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const source = Buffer.from(await response.arrayBuffer());
  const sourceMeta = await sharp(source).metadata();
  if (sourceMeta.width < 1200 || sourceMeta.height < 1200) throw new Error(`Image too small: ${sourceMeta.width}x${sourceMeta.height}`);
  const file = path.join(outputDir, scene.file);
  let finalBuffer;
  for (const quality of [84, 82, 80, 78, 76]) {
    finalBuffer = await sharp(source).resize(1600, 1600, { fit: "cover", kernel: "lanczos3" }).jpeg({ quality, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true }).toBuffer();
    if (finalBuffer.length < 512_000) break;
  }
  if (finalBuffer.length >= 512_000) throw new Error(`JPEG exceeds 512000 bytes: ${finalBuffer.length}`);
  await writeFile(file, finalBuffer);
  manifest.scenes[sceneId] = { ...manifest.scenes[sceneId], status: "QC_PENDING", image_file: file, width: 1600, height: 1600, bytes: finalBuffer.length, source_width: sourceMeta.width, source_height: sourceMeta.height };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ scene_id: sceneId, image_file: file, bytes: finalBuffer.length, source: `${sourceMeta.width}x${sourceMeta.height}`, status: "QC_PENDING" }));
} catch (error) {
  manifest.scenes[sceneId] = { ...manifest.scenes[sceneId], status: "QC_FAILED", qc_notes: String(error.message ?? error) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  throw error;
}
