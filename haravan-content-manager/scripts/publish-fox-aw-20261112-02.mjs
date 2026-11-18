import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { prepareProductPayload, validateBatchProductRules } from "../mcp/content.mjs";
import { validateProductImages } from "../mcp/images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batch = "fox-aw-20261112-02";
const output = path.join(root, "output", batch);
const reportPath = path.join(output, "batch-report.json");
const scenes = ["hero", "group", "action", "lifestyle", "styling", "detail"];

const jacketDescription = `
<p>Áo khoác tập khóa kéo cổ đứng Fox Activewear mang một dáng vẻ gọn gàng để bạn mặc khi đến phòng tập, khởi động hoặc di chuyển sau buổi vận động. Màu xanh olive đậm trong bộ ảnh phối cùng quần đen và giày trắng, tạo một bộ đồ dễ ứng dụng mà không cần nhiều chi tiết trang trí. Áo có dáng thẳng dài ngang hông, tay dài và khóa kéo giữa thân trước. Cổ đứng thấp tạo đường nét rõ ràng quanh vai và cổ.</p>
<h2>Thiết kế dễ phối trong nhiều thời điểm</h2>
<p>Bạn có thể kéo khóa cao hơn khi đi ngoài trời hoặc mở một phần để mặc cùng áo tập bên trong. Khi tập trong phòng gym, dáng áo đơn giản hợp với quần legging hoặc quần tập ống suông. Sau buổi tập, chỉ cần thêm túi tote hay túi tập là trang phục vẫn phù hợp để đi bộ, ghé quán cà phê hoặc làm việc vặt. Bộ ảnh minh họa các tình huống này ở phòng tập, trên phố và tại bàn cà phê; các phụ kiện trong ảnh chỉ là gợi ý phối đồ.</p>
<h2>Chọn cỡ và sử dụng</h2>
<p>Sản phẩm có các cỡ S, M, L và XL. Hãy đối chiếu số đo cơ thể với bảng cỡ thực tế của cửa hàng trước khi đặt mua. Nếu định mặc thêm lớp áo bên trong, bạn nên cân nhắc độ rộng mong muốn ở vai, ngực và cánh tay. Khi thử áo, hãy giơ tay, xoay vai và kéo khóa vài lần để tự đánh giá cảm giác mặc trong những chuyển động thường gặp. Phần tay dài và chiều ngang hông trong ảnh cũng giúp bạn hình dung cách áo đi cùng các dáng quần khác nhau.</p>
<p>Ảnh thể hiện thiết kế minh họa màu xanh olive đậm. Thành phần vải, hướng dẫn bảo quản và những tính năng kỹ thuật chưa có thông số chính thức nên không được khẳng định ở đây. Vui lòng kiểm tra nhãn sản phẩm và thông tin cỡ do cửa hàng cung cấp khi chọn mua.</p>`;

const pantsDescription = `
<p>Quần ống suông tập Pilates cạp cao Fox Activewear hướng đến một trang phục vận động có thể đi tiếp vào nhịp sống thường ngày. Bộ ảnh thể hiện màu nâu mocha với phần cạp cao bản rộng, ống suông thả từ đùi xuống gấu và bề mặt vải mờ. Dáng quần tạo khoảng trống thị giác quanh chân, khác với quần legging ôm sát, đồng thời dễ phối với áo tập gọn màu kem hoặc một chiếc sơ mi khoác ngoài.</p>
<h2>Trong phòng tập và ngoài phố</h2>
<p>Ở lớp Pilates, bạn có thể mặc quần cùng áo tập vừa người và tất chống trượt để dễ quan sát tư thế. Khi đi lại sau buổi tập, giày thể thao và túi tote tạo một bộ đồ đơn giản cho quán cà phê hay lối đi trong phố. Ảnh minh họa nhiều khoảnh khắc: chuẩn bị thảm, tập cùng nhóm, bước lên bục thấp, nghỉ tại nhà và trò chuyện với bạn. Các đạo cụ trong ảnh chỉ phục vụ bối cảnh sử dụng; chúng không đi kèm sản phẩm.</p>
<h2>Màu sắc, chiều dài và chọn cỡ</h2>
<p>Quần có hai màu Nâu mocha và Xám than, ba cỡ S, M, L và hai lựa chọn chiều dài Lửng 7/8 hoặc Dài tiêu chuẩn. Bộ ảnh chỉ minh họa màu Nâu mocha ở dáng Dài tiêu chuẩn; màu và chiều dài còn lại cần đối chiếu với lựa chọn biến thể trước khi mua. Dáng lửng để lộ cổ chân nhiều hơn, còn dáng dài tạo đường nhìn liền mạch khi phối cùng giày. Hãy dùng số đo eo, hông và chiều cao để tham khảo bảng cỡ thực tế, đồng thời thử bước đi, ngồi xuống và nâng gối để đánh giá độ vừa.</p>
<p>Thành phần vải, độ co giãn và hướng dẫn bảo quản cần dựa trên nhãn và thông số sản phẩm chính thức; bộ ảnh và nội dung này không thay thế những thông tin đó.</p>`;

const jacketVariants = ["S", "M", "L", "XL"].map((size, index) => ({
  sku: `FOXAW02-JKT-${size}`,
  option1: size,
  price: 559000 + (index >= 2 ? 10000 : 0),
  inventory_management: "haravan",
  inventory_policy: "deny",
  inventory_quantity: 0,
}));

const pantsVariants = ["Nâu mocha", "Xám than"].flatMap((color, colorIndex) =>
  ["S", "M", "L"].flatMap((size, sizeIndex) =>
    ["Lửng 7/8", "Dài tiêu chuẩn"].map((length, lengthIndex) => {
      const index = colorIndex * 6 + sizeIndex * 2 + lengthIndex;
      return {
        sku: `FOXAW02-PLT-${colorIndex + 1}-${size}-${lengthIndex + 1}`,
        option1: color,
        option2: size,
        option3: length,
        price: 469000 + lengthIndex * 30000 + (sizeIndex === 2 ? 10000 : 0),
        inventory_management: "haravan",
        inventory_policy: "deny",
        inventory_quantity: [8, 3, 0, 6, 2, 1, 5, 0, 4, 2, 1, 7][index],
      };
    }),
  ),
);

const products = [
  {
    title: "Áo khoác tập khóa kéo cổ đứng Fox Activewear",
    handle: `ao-khoac-tap-khoa-keo-co-dung-${batch}`,
    body_html: jacketDescription,
    vendor: "Fox Activewear",
    product_type: "Áo khoác tập nữ",
    tags: ["thời trang thể thao nữ", "áo khoác tập", "phòng tập", "phối đồ năng động", "cổ đứng"],
    options: [{ name: "Kích thước" }],
    variants: jacketVariants,
  },
  {
    title: "Quần ống suông tập Pilates cạp cao Fox Activewear",
    handle: `quan-ong-suong-tap-pilates-cap-cao-${batch}`,
    body_html: pantsDescription,
    vendor: "Fox Activewear",
    product_type: "Quần tập Pilates nữ",
    tags: ["thời trang thể thao nữ", "quần tập Pilates", "ống suông", "cạp cao", "phối đồ năng động"],
    options: [{ name: "Màu sắc" }, { name: "Kích thước" }, { name: "Chiều dài" }],
    variants: pantsVariants,
  },
];

const seo = [
  {
    title: "Áo khoác tập khóa kéo cổ đứng nữ | Fox Activewear",
    description: "Khám phá áo khoác tập nữ cổ đứng, khóa kéo và dáng ngang hông của Fox Activewear. Gợi ý phối cùng quần tập cho phòng gym và sinh hoạt năng động.",
  },
  {
    title: "Quần ống suông tập Pilates cạp cao nữ | Fox Activewear",
    description: "Quần tập Pilates nữ ống suông cạp cao Fox Activewear với lựa chọn màu, cỡ và chiều dài. Xem cách phối cho lớp tập và những hoạt động thường ngày.",
  },
];

function words(html) {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/u).length;
}

async function prepare() {
  validateBatchProductRules(products);
  await mkdir(output, { recursive: true });
  for (let index = 0; index < products.length; index += 1) {
    const product = prepareProductPayload(products[index]);
    const count = words(product.body_html);
    if (count < 250 || count > 450) throw new Error(`Product ${index + 1}: ${count} description words`);
    await writeFile(path.join(output, `p${index + 1}-product.json`), JSON.stringify({ product, seo: seo[index] }, null, 2));
    console.log(JSON.stringify({ title: product.title, variants: product.variants.length, words: count }));
  }
}

async function checkFiles() {
  const items = [];
  for (let index = 0; index < products.length; index += 1) {
    const { product } = JSON.parse(await readFile(path.join(output, `p${index + 1}-product.json`), "utf8"));
    const imagePaths = scenes.map((scene) => path.join(output, `p${index + 1}-${scene}.jpg`));
    const images = await validateProductImages(imagePaths);
    items.push({ product, imagePaths, images });
  }
  validateBatchProductRules(items.map((item) => item.product));
  console.log(JSON.stringify({ products: items.length, images: items.flatMap((item) => item.images).length, bytes: items.map((item) => item.images.map((image) => image.bytes)) }));
  return items;
}

function parseResult(value) {
  const block = value.content?.find((item) => item.type === "text");
  if (!block) throw new Error("MCP returned no text result");
  const parsed = JSON.parse(block.text);
  if (value.isError || !parsed.ok) {
    const error = new Error(parsed.error?.message || "MCP tool failed");
    error.status = parsed.error?.status ?? null;
    throw error;
  }
  return parsed.result;
}

async function withClient(action) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "mcp", "server.mjs")] });
  const client = new Client({ name: "fox-activewear-batch-02", version: "1.0.0" });
  try {
    await client.connect(transport);
    return await action(client);
  } finally {
    await client.close();
  }
}

async function connection() {
  return withClient(async (client) => {
    const result = parseResult(await client.callTool({ name: "check_connection", arguments: {} }));
    console.log(JSON.stringify(result));
    return result;
  });
}

async function publish(items) {
  const report = { batch_id: batch, requested: 2, items: [] };
  await withClient(async (client) => {
    const connected = parseResult(await client.callTool({ name: "check_connection", arguments: {} }));
    if (!connected.connected) throw new Error("Haravan connection failed");
    for (const item of items) {
      try {
        const result = parseResult(await client.callTool({
          name: "create_product",
          arguments: { batch_id: batch, product: item.product, image_paths: item.imagePaths },
        }));
        report.items.push(result);
        console.log(JSON.stringify({ title: result.title, status: result.status, id: result.id, image_count: result.image_count }));
      } catch (error) {
        report.items.push({ title: item.product.title, status: "failed", error: { status: error.status, message: error.message } });
        if (error.status === 401 || error.status === 403) break;
      }
      await writeFile(reportPath, JSON.stringify(report, null, 2));
    }
  });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}

const mode = process.argv[2];
if (mode === "--prepare") await prepare();
else if (mode === "--check") await checkFiles();
else if (mode === "--connection") await connection();
else if (mode === "--publish") await publish(await checkFiles());
else throw new Error("Use --prepare, --check, --connection or --publish");
