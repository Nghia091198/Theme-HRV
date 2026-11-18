import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const stage = path.join(root, "image-work", "newsletter-popup-20261118");
const assets = path.join(root, "FOX Fashion", "assets");
const model = "cx/gpt-image-2.5";
const common = "Một ảnh chụp độc lập, không ghép khung. Ảnh thương mại thời trang thể thao nữ trưởng thành tại Việt Nam, da và bàn tay tự nhiên, chất vải thật, nếp gấp hợp lý, ánh sáng có chiều sâu. Bảng màu xanh olive, than chì, kem cát và nắng ấm, cảm giác tự tin và gần gũi của Fox Activewear. Không chữ, không logo, không watermark, không poster hay vật thể có chữ; tránh giải phẫu lỗi, mặt nhựa, trang phục biến dạng và ánh sáng CGI.";

const scenes = {
  form: {
    file: "form-source.jpg",
    size: "1024x1536",
    prompt: `Ảnh dọc cho phần hình của popup đăng ký bản tin. Một phụ nữ Việt Nam khoảng 28 tuổi mặc áo khoác tập màu olive cổ đứng, quần tập màu than, đang buộc tóc trước buổi tập trong studio Pilates hiện đại có cửa sổ cao và vài người tập mờ ở xa. Người mẫu đứng ở nửa phải khung hình, thấy rõ từ đầu đến gần đầu gối, nhìn nghiêng tự nhiên; phần trái có không gian thoáng và tương phản để nhãn nhỏ của giao diện đặt ở mép dưới. Ánh sáng buổi sáng mềm từ cửa sổ, phong cách ảnh thời trang biên tập chân thực, không có đạo cụ che cơ thể. ${common}`,
  },
  desktop: {
    file: "banner-desktop-source.jpg",
    size: "1536x1024",
    prompt: `Ảnh ngang dành cho banner popup thời trang thể thao. Hai phụ nữ Việt Nam trưởng thành vừa đi bộ sau buổi tập, người phía trước mặc áo khoác tập olive và quần đen, người bạn mặc áo tập màu kem và quần nâu mocha; họ cười và trò chuyện tự nhiên bên ngoài studio có cửa kính, cây xanh và nắng chiều. Đặt hai người hoàn toàn trong nửa trái khung hình, có thể nhìn rõ mặt, tay và trang phục; nửa phải là bức tường than chì tối và sạch để chèn chữ tiếng Việt sau này. Chụp trung toàn thân ngang tầm mắt, ánh sáng ấm có bóng đổ thật, ảnh chiến dịch thương mại cao cấp nhưng tự nhiên. ${common}`,
  },
  mobile: {
    file: "banner-mobile-source.jpg",
    size: "1024x1536",
    prompt: `Ảnh dọc dành cho banner popup điện thoại, cùng tinh thần với ảnh hai bạn nữ sau buổi tập: hai phụ nữ Việt Nam trưởng thành mặc trang phục tập olive, than và mocha, vừa bước ra khỏi studio kính, trò chuyện và mỉm cười tự nhiên. Hai người đứng ở nửa trên khung hình, mặt, tay và thân trên rõ ràng; nửa dưới là nền tối êm và ít chi tiết để đặt thông điệp tiếng Việt sau này. Góc chụp ba phần tư, nắng chiều mềm, cảm giác thời trang thể thao ứng dụng hằng ngày, bối cảnh có chiều sâu. ${common}`,
  },
};

const outputs = [
  { key: "form", name: "newsletter_popup_form_image.jpg", preview: "form-preview.jpg", width: 800, height: 1000, maxBytes: 512000 },
  { key: "desktop", name: "newsletter_popup_banner.jpg", preview: "banner-desktop-preview.jpg", width: 1200, height: 800, maxBytes: 512000 },
  { key: "mobile", name: "newsletter_popup_banner_mobile.jpg", preview: "banner-mobile-preview.jpg", width: 720, height: 960, maxBytes: 512000 },
];

function svgOverlay(key, width, height) {
  if (key === "form") return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#111316" stop-opacity="0"/><stop offset="1" stop-color="#111316" stop-opacity="0.45"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/></svg>`);
  if (key === "desktop") return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#111316" stop-opacity="0"/><stop offset="0.45" stop-color="#111316" stop-opacity="0.22"/><stop offset="0.72" stop-color="#111316" stop-opacity="0.87"/><stop offset="1" stop-color="#111316" stop-opacity="0.94"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/><text x="660" y="242" fill="#ffae8a" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="5">FOX CLUB</text><text x="660" y="350" fill="#ffffff" font-family="Arial, sans-serif" font-size="69" font-weight="800">NHẬN 50.000₫</text><text x="662" y="407" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="700">CHO ĐƠN ĐẦU TIÊN</text><text x="662" y="464" fill="#ffffff" font-family="Arial, sans-serif" font-size="22">Phong cách vận động mỗi ngày</text><rect x="660" y="516" width="242" height="64" rx="32" fill="#ffffff"/><text x="691" y="557" fill="#1b2631" font-family="Arial, sans-serif" font-size="23" font-weight="700">Khám phá ngay →</text></svg>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111316" stop-opacity="0.14"/><stop offset="0.37" stop-color="#111316" stop-opacity="0.23"/><stop offset="0.67" stop-color="#111316" stop-opacity="0.87"/><stop offset="1" stop-color="#111316" stop-opacity="0.96"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/><text x="48" y="605" fill="#ffae8a" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="4">FOX CLUB</text><text x="48" y="695" fill="#ffffff" font-family="Arial, sans-serif" font-size="61" font-weight="800">NHẬN 50.000₫</text><text x="50" y="749" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700">CHO ĐƠN ĐẦU TIÊN</text><rect x="48" y="794" width="240" height="62" rx="31" fill="#ffffff"/><text x="79" y="835" fill="#1b2631" font-family="Arial, sans-serif" font-size="23" font-weight="700">Khám phá ngay →</text></svg>`);
}

async function generate(key) {
  const scene = scenes[key];
  if (!scene) throw new Error(`Unknown scene: ${key}`);
  if (!process.env.NINEROUTER_URL || !process.env.NINEROUTER_KEY) throw new Error("9Router is not configured");
  const url = `${process.env.NINEROUTER_URL.replace(/\/$/, "")}/v1/images/generations`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NINEROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: scene.prompt, n: 1, size: scene.size, response_format: "b64_json" }),
    signal: AbortSignal.timeout(240000),
  });
  if (!response.ok) throw new Error(`9Router HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const result = await response.json();
  const item = result.data?.[0];
  if (!item) throw new Error("9Router returned no image");
  const source = item.b64_json ? Buffer.from(item.b64_json, "base64") : Buffer.from(await (await fetch(item.url)).arrayBuffer());
  const metadata = await sharp(source).metadata();
  await mkdir(stage, { recursive: true });
  const target = path.join(stage, scene.file);
  await sharp(source).jpeg({ quality: 90, mozjpeg: true }).toFile(target);
  console.log(JSON.stringify({ key, target, sourceWidth: metadata.width, sourceHeight: metadata.height }));
}

async function compose() {
  for (const output of outputs) {
    const source = await readFile(path.join(stage, scenes[output.key].file));
    const overlay = svgOverlay(output.key, output.width, output.height);
    let buffer;
    for (const quality of [85, 82, 79, 76, 73, 70]) {
      buffer = await sharp(source)
        .resize(output.width, output.height, { fit: "cover", position: output.key === "mobile" ? "north" : "centre" })
        .composite([{ input: overlay }])
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (buffer.length < output.maxBytes) break;
    }
    if (buffer.length >= output.maxBytes) throw new Error(`${output.preview} exceeds ${output.maxBytes} bytes`);
    const target = path.join(stage, output.preview);
    await writeFile(target, buffer);
    console.log(JSON.stringify({ preview: target, width: output.width, height: output.height, bytes: buffer.length }));
  }
}

async function apply() {
  for (const output of outputs) {
    const source = path.join(stage, output.preview);
    const info = await sharp(source).metadata();
    const bytes = (await stat(source)).size;
    if (info.format !== "jpeg" || info.width !== output.width || info.height !== output.height || bytes >= output.maxBytes) {
      throw new Error(`Invalid preview: ${source}`);
    }
    const target = path.join(assets, output.name);
    await copyFile(source, target);
    console.log(JSON.stringify({ target, width: info.width, height: info.height, bytes }));
  }
}

const mode = process.argv[2];
if (mode === "--generate") await generate(process.argv[3]);
else if (mode === "--compose") await compose();
else if (mode === "--apply") await apply();
else throw new Error("Use --generate form|desktop|mobile, --compose or --apply");
