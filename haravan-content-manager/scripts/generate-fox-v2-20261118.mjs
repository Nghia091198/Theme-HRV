import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("output/fox-v2-20261118");
const plan = JSON.parse(await readFile(path.join(root, "plan.json"), "utf8"));
const manifestPath = path.join(root, "image-manifest.json");
const model = "cx/gpt-image-2.5";
const [productKey, colorKey, sceneId] = process.argv.slice(2);
const product = plan.products.find((item) => item.key === productKey);
const color = product?.colors.find((item) => item.key === colorKey);
const validScenes = ["S01-HERO", "S02-ACTION", "S03-GROUP", "S04-STREET", "S05-DETAIL", "S06-RECOVERY"];
if (!product || !color || !validScenes.includes(sceneId)) {
  throw new Error("Usage: node scripts/generate-fox-v2-20261118.mjs FOX-01 den-than S01-HERO");
}

const mainItem = product.type.startsWith("Áo") ? "quần tập trơn màu tối" : "áo tập trơn màu kem";
const scenePrompts = {
  "S01-HERO": `Một phụ nữ trưởng thành 25–35 tuổi ${product.hero}, mặc sản phẩm bán phối cùng ${mainItem} và giày thể thao phù hợp. Đi bộ tự nhiên, trang phục nhìn rõ toàn bộ. Ảnh toàn thân góc ba phần tư ngang mắt, không nhìn thẳng máy ảnh.`,
  "S02-ACTION": `Một phụ nữ trưởng thành 25–35 tuổi ${product.action}, trong không gian phù hợp hoạt động ${product.activity}. Sản phẩm bán không bị che; cơ thể và dụng cụ đúng tư thế. Ảnh toàn thân góc nghiêng, có chiều sâu, không tạo dáng quảng cáo.`,
  "S03-GROUP": `Bốn phụ nữ trưởng thành 25–35 tuổi cùng chuẩn bị buổi ${product.activity}; nhân vật chính ở tiền cảnh mặc sản phẩm bán, ba người bạn mặc trang phục khác màu ở phía sau, đang trò chuyện và chuẩn bị dụng cụ phù hợp. Một khoảnh khắc tự nhiên trong không gian rộng có cửa sổ, sản phẩm chính nhìn rõ, không ai che nhau.`,
  "S04-STREET": `Hai người bạn nữ trưởng thành 25–35 tuổi đi bộ và trò chuyện sau buổi ${product.activity} trên phố đi bộ lát đá kiểu châu Âu, mặt tiền sáng và cây xanh. Nhân vật chính mặc sản phẩm bán, phối ${mainItem}, giày thể thao; người bạn mặc màu khác. Khung toàn thân phóng sự, bước chân tự nhiên, nắng vàng dịu.`,
  "S05-DETAIL": `Ảnh cận một người mẫu nữ trưởng thành đang mặc sản phẩm bán, tập trung vào ${product.detail}; vẫn thấy đủ phần trang phục để nhận diện thiết kế và màu. Ánh sáng cạnh mềm cho thấy nếp vải thật và đường may hợp lý; một khung cận duy nhất, không thêm chi tiết lạ.`,
  "S06-RECOVERY": `Sau buổi ${product.activity}, nhân vật chính và một người bạn nữ trưởng thành 25–35 tuổi nghỉ tại hiên quán cà phê kiểu châu Âu, mỉm cười trò chuyện và chuyền chai nước. Nhân vật chính mặc sản phẩm bán nhìn rõ, túi tập đặt cạnh ghế không che trang phục. Ảnh trung toàn phóng sự, không khí thoải mái, nắng chiều mềm.`,
};
let prompt = `Tạo đúng MỘT ảnh chụp thời trang thể thao Fox Activewear, một cảnh và một khoảnh khắc duy nhất, canvas vuông để dùng trong gallery sản phẩm. SẢN PHẨM BÁN: ${product.title} (${product.key}), màu ${color.label}, sắc độ ${color.tone}. THIẾT KẾ KHÓA: ${product.design} Màu sản phẩm phải là ${color.tone} ở toàn bộ ảnh. Các món phối khác không bán cùng sản phẩm. CẢNH ${sceneId}: ${scenePrompts[sceneId]} Phong cách trẻ trung, năng lượng, thể thao thanh lịch trong không gian gợi châu Âu hiện đại. Ảnh thương mại chân thực: da có kết cấu, tóc và vải có nếp tự nhiên, ánh sáng vật lý hợp lý, màu trung thực, bố cục rõ sản phẩm. Không có chữ, logo, watermark, hình ghép, split-screen, lưới ảnh, nhiều góc trong một canvas, người mẫu dưới 21 tuổi, tư thế khiêu gợi, lỗi bàn tay/chân/mặt, vật thể méo hoặc phụ kiện lơ lửng. Chỉ xuất MỘT file ảnh độc lập.`;
if (productKey === "FOX-05" && sceneId === "S06-RECOVERY") prompt += " Bắt buộc chụp góc ba phần tư PHÍA TRƯỚC người mẫu chính để thấy rõ cổ tròn, vai hẹp, thân áo và gấu cong; những ảnh trước đã cho thấy mặt lưng chữ Y.";
let manifest = { batch_id: plan.batch_id, model, scenes: {} };
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch {}
const id = `${productKey}/${colorKey}/${sceneId}`;
const previous = manifest.scenes[id];
const referenceSceneArg = process.argv.find((arg) => arg.startsWith("--reference-scene="));
const referenceScene = referenceSceneArg?.split("=")[1] ?? "S01-HERO";
if (!validScenes.includes(referenceScene)) throw new Error(`Invalid reference scene: ${referenceScene}`);
const useReference = !process.argv.includes("--no-reference") && (sceneId !== "S01-HERO" || Boolean(referenceSceneArg));
if (previous?.qc_status === "QC_PASSED") throw new Error(`${id} already passed QC`);
const attempt = (previous?.attempts ?? 0) + 1;
if (attempt > 3) throw new Error(`${id} reached 3 attempts`);
if (previous?.qc_status === "QC_FAILED" && previous.qc_notes) prompt += ` Lần thử trước chưa đạt vì: ${previous.qc_notes}. Hãy sửa chính xác lỗi đó.`;
const imageDir = path.join(root, "images", productKey, colorKey);
const file = path.join(imageDir, `${productKey}-${colorKey}-${sceneId}-v${attempt}.jpg`);
await mkdir(imageDir, { recursive: true });
manifest.scenes[id] = { product_key: productKey, color_key: colorKey, scene_id: sceneId, attempts: attempt, prompt, image_file: file, qc_status: "GENERATING", qc_score: null, qc_notes: null, product_id: null, variant_ids: [], haravan_image_id: null, upload_status: "PENDING", read_back_verified: false, reference_used: useReference };
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

try {
  const body = { model, prompt, n: 1, size: "2048x2048", output_format: "jpeg" };
  if (useReference) {
    const reference = manifest.scenes[`${productKey}/${colorKey}/${referenceScene}`];
    if (reference?.qc_status !== "QC_PASSED") throw new Error(`Reference not passed: ${productKey}/${colorKey}/${referenceScene}`);
    body.image = (await readFile(reference.image_file)).toString("base64");
  }
  const response = await fetch(new URL("/v1/images/generations?response_format=binary", process.env.NINEROUTER_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.NINEROUTER_KEY ? { Authorization: `Bearer ${process.env.NINEROUTER_KEY}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`9Router HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const source = Buffer.from(await response.arrayBuffer());
  const sourceMeta = await sharp(source).metadata();
  if (sourceMeta.width < 1200 || sourceMeta.height < 1200) throw new Error(`Image too small: ${sourceMeta.width}x${sourceMeta.height}`);
  let finalBuffer;
  for (const quality of [84, 80, 76, 72, 68]) {
    finalBuffer = await sharp(source).resize(1600, 1600, { fit: "cover", kernel: "lanczos3" }).jpeg({ quality, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true }).toBuffer();
    if (finalBuffer.length < 512_000) break;
  }
  if (finalBuffer.length >= 512_000) throw new Error(`JPEG exceeds 512000 bytes: ${finalBuffer.length}`);
  await writeFile(file, finalBuffer);
  manifest.scenes[id] = { ...manifest.scenes[id], qc_status: "QC_PENDING", width: 1600, height: 1600, bytes: finalBuffer.length, source_width: sourceMeta.width, source_height: sourceMeta.height };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  if (process.argv.includes("--auto-qc")) {
    const rubric = `Hãy chấm ảnh sản phẩm này dựa trực tiếp vào ảnh, thật nghiêm túc. Sản phẩm bán là ${product.title}, màu ${color.label} (${color.tone}). Thiết kế yêu cầu: ${product.design}. Cảnh yêu cầu: ${scenePrompts[sceneId]}. Chỉ đánh giá hành động được yêu cầu cho cảnh này; cảnh S05-DETAIL là ảnh cận chi tiết, người mẫu không cần tập luyện hoặc chuyển động. Trả về chỉ JSON với 7 điểm nguyên 0-5 theo thứ tự: [ảnh độc lập một khung không collage, chính xác thiết kế món bán, chính xác màu, đúng bối cảnh/hành động theo cảnh cụ thể, năng lượng/cảm xúc tự nhiên, nhiếp ảnh và giải phẫu, hiệu quả nhìn rõ sản phẩm]. Điểm 5 là đạt rõ, 4 là lỗi nhỏ chấp nhận được, 3 trở xuống là lỗi đáng kể. Đặt hard_fail=true khi có collage, sai màu chính, sai món hoặc cấu trúc, lỗi tay chân lớn, người dính nhau, sản phẩm bị che hoàn toàn, watermark, trẻ vị thành niên trong tạo dáng gợi cảm. Dạng JSON: {"scores":[5,5,5,5,5,5,5],"hard_fail":false,"notes":"lý do ngắn gọn bằng tiếng Việt"}.`;
    const qcResponse = await fetch(new URL("/v1/chat/completions", process.env.NINEROUTER_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.NINEROUTER_KEY ? { Authorization: `Bearer ${process.env.NINEROUTER_KEY}` } : {}) },
      body: JSON.stringify({ model: "cx/gpt-6-luna", messages: [{ role: "user", content: [{ type: "text", text: rubric }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${finalBuffer.toString("base64")}` } }] }], max_tokens: 350 }),
    });
    if (!qcResponse.ok) throw new Error(`9Router QC HTTP ${qcResponse.status}`);
    const qcData = await qcResponse.json();
    const raw = String(qcData.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const qc = JSON.parse(raw);
    if (!Array.isArray(qc.scores) || qc.scores.length !== 7 || qc.scores.some((score) => !Number.isInteger(score) || score < 0 || score > 5)) throw new Error(`Invalid QC scores: ${raw.slice(0, 200)}`);
    const total = qc.scores.reduce((sum, score) => sum + score, 0);
    const passed = total >= 30 && qc.scores.every((score) => score >= 4) && qc.hard_fail === false;
    manifest.scenes[id] = { ...manifest.scenes[id], qc_status: passed ? "QC_PASSED" : "QC_FAILED", qc_score: total, qc_scores: qc.scores, qc_notes: String(qc.notes ?? ""), qc_method: "9Router vision + spot check", hard_fail: Boolean(qc.hard_fail) };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
  console.log(JSON.stringify({ id, file, bytes: finalBuffer.length, status: manifest.scenes[id].qc_status, score: manifest.scenes[id].qc_score, notes: manifest.scenes[id].qc_notes }));
} catch (error) {
  manifest.scenes[id] = { ...manifest.scenes[id], qc_status: "QC_FAILED", qc_notes: String(error.message ?? error) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  throw error;
}
