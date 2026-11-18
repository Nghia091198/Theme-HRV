import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { prepareProductPayload, validateBatchProductRules } from "../mcp/content.mjs";
import { validateProductImages } from "../mcp/images.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = "fox-aw-20261112-01a1";
const OUTPUT = path.join(ROOT, "output", BATCH);
const REPORT = path.join(OUTPUT, "batch-report.json");

const braDescription = `
<p>Áo bra thể thao cổ vuông Fox Activewear là lựa chọn cho những ngày bạn muốn mặc gọn gàng từ buổi tập đến các hoạt động thường ngày. Đường cổ vuông tạo một khung hình rõ ràng cho phần vai và xương quai xanh, trong khi quai bản rộng và thân áo liền mạch giữ tổng thể đơn giản, dễ phối. Mẫu áo này được giới thiệu cùng ba gam màu trầm và trung tính để bạn chọn theo tủ đồ sẵn có.</p>
<h2>Điểm đáng chú ý trong thiết kế</h2>
<p>Phom áo ôm vừa thân trên, có dải chân áo rõ nét và bề mặt vải mờ trong bộ ảnh minh họa. Khi nhìn từ phía trước, phần cổ và quai áo tạo dáng cân đối, không cần nhiều chi tiết trang trí. Bạn có thể kết hợp áo với quần legging cạp cao, quần short tập hoặc mặc dưới áo khoác mỏng khi đi lại sau buổi tập. Ba màu Mận trầm, Than chì và Kem cát đi theo những cách phối khác nhau: mận tạo điểm nhấn nhẹ, than chì kín đáo, còn kem cát giúp bộ đồ sáng và mềm hơn.</p>
<h2>Gợi ý sử dụng và chọn cỡ</h2>
<p>Mẫu áo phù hợp để xây dựng trang phục cho yoga, Pilates, các buổi vận động nhẹ và sinh hoạt năng động. Nếu muốn mặc cả ngày, bạn có thể phối thêm sơ mi rộng hoặc áo khoác ngoài để chuyển từ phòng tập ra phố. Hãy chọn cỡ dựa trên số đo cơ thể và bảng cỡ thực tế của cửa hàng, đặc biệt ở vòng ngực và độ ôm bạn thấy thoải mái. Khi thử, nên giơ tay, xoay vai và hít thở bình thường để kiểm tra cảm giác mặc ở nhiều tư thế.</p>
<p>Ảnh sản phẩm thể hiện dáng áo và ba hướng phối màu. Thành phần vải, mức nâng đỡ, hướng dẫn bảo quản và các thông số kỹ thuật sẽ được cập nhật khi có dữ liệu sản phẩm chính thức; phần mô tả này không thay thế thông tin trên nhãn hàng thực tế.</p>`;

const leggingDescription = `
<p>Quần legging chạy bộ cạp cao túi sườn Fox Activewear dành cho người muốn mang theo vài vật dụng nhỏ mà vẫn giữ trang phục gọn khi di chuyển. Thiết kế trong bộ ảnh có cạp rộng, bề mặt vải mờ và một túi nằm sát bên đùi. Đường nét tiết chế giúp quần dễ phối với áo bra thể thao, áo ba lỗ hoặc áo khoác nhẹ trong những ngày tập luyện lẫn lúc đi bộ ngoài phố.</p>
<h2>Chọn chiều dài và màu sắc</h2>
<p>Bạn có thể chọn dáng Lửng 7/8 hoặc Dài tiêu chuẩn tùy chiều cao, thời tiết và sở thích. Dáng lửng để lộ cổ chân, hợp khi chạy hoặc tập trong không gian ấm; dáng dài tạo một đường nhìn liền mạch khi phối với giày thể thao. Ba màu Than chì, Xanh olive và Nâu mocha đều là tông dễ kết hợp với áo sáng màu. Than chì tạo cảm giác gọn, xanh olive thêm chút khác biệt, còn nâu mocha mềm hơn khi mặc cùng màu kem hoặc cát.</p>
<h2>Gợi ý mặc và thử đồ</h2>
<p>Với buổi chạy sáng, hãy mặc cùng áo tập gọn, giày chạy phù hợp và một chiếc đồng hồ thể thao nếu bạn thường theo dõi thời gian. Khi chuyển sang hoạt động thường ngày, áo thun rộng và áo khoác mỏng tạo một bộ đồ thoải mái hơn. Túi sườn trong ảnh có thể giữ một món nhỏ; hãy kiểm tra kích thước túi trên sản phẩm thật trước khi đặt điện thoại hoặc đồ vật giá trị vào đó. Khi thử quần, nên bước đi, ngồi xuống và nâng gối để cảm nhận cạp, chiều dài và đường may theo chuyển động.</p>
<p>Hãy đối chiếu số đo của bạn với bảng cỡ thực tế trước khi chọn S, M, L hoặc XL. Thành phần vải, đặc tính co giãn, khả năng khô và hướng dẫn giặt chỉ nên dựa trên thông số chính thức của sản phẩm; chúng chưa được xác nhận trong nội dung giới thiệu này.</p>`;

function variantsForBra() {
  const colors = ["Mận trầm", "Than chì", "Kem cát"];
  const sizes = ["S", "M", "L", "XL"];
  return colors.flatMap((color, colorIndex) => sizes.map((size, sizeIndex) => ({
    sku: `FOXAW01A1-BRA-${colorIndex + 1}-${size}`,
    option1: color,
    option2: size,
    price: 359000 + (sizeIndex >= 2 ? 10000 : 0),
    inventory_management: "haravan",
    inventory_policy: "deny",
    inventory_quantity: 0,
  })));
}

function variantsForLegging() {
  const colors = ["Than chì", "Xanh olive", "Nâu mocha"];
  const sizes = ["S", "M", "L", "XL"];
  const lengths = ["Lửng 7/8", "Dài tiêu chuẩn"];
  return colors.flatMap((color, colorIndex) => sizes.flatMap((size, sizeIndex) => lengths.map((length, lengthIndex) => {
    const index = colorIndex * 8 + sizeIndex * 2 + lengthIndex;
    return {
      sku: `FOXAW01A1-LEG-${colorIndex + 1}-${size}-${lengthIndex + 1}`,
      option1: color,
      option2: size,
      option3: length,
      price: 499000 + lengthIndex * 30000 + (sizeIndex === 3 ? 10000 : 0),
      inventory_management: "haravan",
      inventory_policy: "deny",
      inventory_quantity: [8, 3, 0, 5, 2, 1, 0, 4, 6, 0, 2, 7][index % 12],
    };
  })));
}

const PRODUCTS = [
  {
    title: "Áo bra thể thao cổ vuông Fox Activewear",
    handle: `ao-bra-the-thao-co-vuong-${BATCH}`,
    body_html: braDescription,
    vendor: "Fox Activewear",
    product_type: "Áo bra thể thao",
    tags: ["thời trang thể thao nữ", "áo bra thể thao", "yoga", "pilates", "cổ vuông"],
    options: [{ name: "Màu sắc" }, { name: "Kích thước" }],
    variants: variantsForBra(),
  },
  {
    title: "Quần legging chạy bộ cạp cao túi sườn Fox Activewear",
    handle: `quan-legging-chay-bo-tui-suon-${BATCH}`,
    body_html: leggingDescription,
    vendor: "Fox Activewear",
    product_type: "Quần legging chạy bộ",
    tags: ["thời trang thể thao nữ", "quần legging", "chạy bộ", "cạp cao", "túi sườn"],
    options: [{ name: "Màu sắc" }, { name: "Kích thước" }, { name: "Chiều dài" }],
    variants: variantsForLegging(),
  },
];

const IMAGE_NAMES = [
  ["p1-hero.jpg", "p1-lifestyle.jpg", "p1-detail.jpg"],
  ["p2-hero.jpg", "p2-lifestyle.jpg", "p2-detail.jpg"],
];

function descriptionWords(html) {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/u).length;
}

async function prepare() {
  await mkdir(OUTPUT, { recursive: true });
  validateBatchProductRules(PRODUCTS);
  for (let index = 0; index < PRODUCTS.length; index += 1) {
    const product = prepareProductPayload(PRODUCTS[index]);
    const words = descriptionWords(product.body_html);
    if (words < 250 || words > 450) throw new Error(`Description ${index + 1} has ${words} words`);
    await writeFile(path.join(OUTPUT, `p${index + 1}-product.json`), JSON.stringify({ product }, null, 2));
    console.log(`PREPARED ${product.handle}: ${product.variants.length} variants, ${words} words`);
  }
}

async function loadAndCheck() {
  const items = [];
  for (let index = 0; index < 2; index += 1) {
    const { product } = JSON.parse(await readFile(path.join(OUTPUT, `p${index + 1}-product.json`), "utf8"));
    const imagePaths = IMAGE_NAMES[index].map((name) => path.join(OUTPUT, name));
    const images = await validateProductImages(imagePaths);
    items.push({ product, imagePaths, images });
  }
  validateBatchProductRules(items.map((item) => item.product));
  console.log(`CHECKED ${items.length} products and ${items.flatMap((item) => item.images).length} images`);
  return items;
}

function parseToolResult(value) {
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

async function publish(items) {
  const report = { batch_id: BATCH, requested: items.length, items: [] };
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, "mcp", "server.mjs")] });
  const client = new Client({ name: "fox-activewear-batch", version: "1.0.0" });
  try {
    await client.connect(transport);
    const connection = parseToolResult(await client.callTool({ name: "check_connection", arguments: {} }));
    if (!connection.connected) throw new Error("Haravan connection failed");
    for (const item of items) {
      try {
        const result = parseToolResult(await client.callTool({
          name: "create_product",
          arguments: { batch_id: BATCH, product: item.product, image_paths: item.imagePaths },
        }));
        report.items.push(result);
        console.log(`RESULT ${result.title}: ${result.status} id=${result.id ?? "none"}`);
      } catch (error) {
        report.items.push({ title: item.product.title, status: "failed", error: { status: error.status, message: error.message } });
        if (error.status === 401 || error.status === 403) break;
      }
      await writeFile(REPORT, JSON.stringify(report, null, 2));
    }
  } finally {
    await client.close();
  }
  await writeFile(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}

const mode = process.argv[2];
if (mode === "--prepare") await prepare();
else if (mode === "--check") await loadAndCheck();
else if (mode === "--publish") await publish(await loadAndCheck());
else throw new Error("Use --prepare, --check, or --publish");
