import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { validateBatchProductRules } from "../../mcp/content.mjs";
import { validateProductImages } from "../../mcp/images.mjs";

const batchId = "fox-activewear-20260807-01";
const batchDir = path.dirname(fileURLToPath(import.meta.url));
const managerDir = path.resolve(batchDir, "../..");

function makeVariants({ prefix, colors, sizes, fits = [], basePrice, soldOut = false }) {
  const inventoryPattern = [12, 5, 2, 0, 8, 1, 6, 3, 0, 10, 4, 2, 7, 0, 5, 1, 9, 3];
  const fitValues = fits.length ? fits : [null];
  const variants = [];

  colors.forEach((color, colorIndex) => {
    sizes.forEach((size, sizeIndex) => {
      fitValues.forEach((fit, fitIndex) => {
        const index = variants.length;
        const price = basePrice + colorIndex * 10000 + sizeIndex * 5000 + fitIndex * 15000;
        const variant = {
          sku: `${batchId.toUpperCase()}-${prefix}-${String(index + 1).padStart(2, "0")}`,
          price,
          compare_at_price: price + 70000,
          inventory_quantity: soldOut ? 0 : inventoryPattern[index % inventoryPattern.length],
          inventory_management: "haravan",
          inventory_policy: "deny",
          option1: color,
          option2: size,
          requires_shipping: true,
          taxable: true,
        };
        if (fit) variant.option3 = fit;
        variants.push(variant);
      });
    });
  });

  return variants;
}

const products = [
  {
    title: "Áo chạy nữ AeroFlex dài tay",
    handle: `ao-chay-nu-aeroflex-dai-tay-${batchId}`,
    vendor: "FOX Active",
    product_type: "Áo chạy bộ nữ",
    tags: ["fox-active", "chạy bộ", "áo thể thao nữ", "dài tay", "performance"],
    body_html: `<h2>Nhẹ, thoáng và sẵn sàng cho từng nhịp chạy</h2><p>Áo chạy nữ AeroFlex dài tay được thiết kế cho những buổi chạy sáng sớm, tập tốc độ hoặc vận động ngoài trời khi bạn cần một lớp áo nhẹ nhưng vẫn đủ che chắn. Phom áo ôm theo chuyển động cơ thể mà không bó cứng, giúp phần vai và cánh tay hoạt động tự nhiên trong suốt quãng chạy. Bề mặt vải mềm, co giãn và khô nhanh, hạn chế cảm giác nặng áo khi cơ thể bắt đầu tăng nhiệt.</p><p>Hai mảng dệt thoáng đặt dọc thân áo hỗ trợ lưu thông không khí tại vùng thường tích tụ nhiệt. Đường may phẳng giúp giảm ma sát khi mặc lâu, đặc biệt phù hợp với người thường chạy từ năm đến mười lăm kilomet hoặc kết hợp áo cùng áo khoác mỏng. Tay áo dài vừa đủ để bảo vệ da trong nắng nhẹ, trong khi cổ tròn gọn gàng dễ phối với đồng hồ thể thao, tai nghe và các lớp trang phục khác.</p><h3>Chi tiết sử dụng</h3><ul><li>Chất vải kỹ thuật co giãn bốn chiều, thoáng và nhanh khô.</li><li>Phom nữ cân đối, có lựa chọn ôm vừa hoặc thoải mái.</li><li>Mảng dệt thoáng bên hông hỗ trợ điều hòa nhiệt.</li><li>Phù hợp chạy bộ, đi bộ nhanh, tập gym và mặc hằng ngày.</li></ul><p>Để giữ độ bền của vải, nên giặt máy bằng nước lạnh với sản phẩm cùng màu, dùng túi giặt và tránh chất tẩy mạnh. Không ủi trực tiếp ở nhiệt độ cao. Ba màu Xanh biển, Đen và Trắng được xây dựng để dễ kết hợp cùng legging, quần short hoặc áo khoác trong bộ sưu tập FOX Active. Nếu bạn thích cảm giác gọn khi chạy tốc độ, hãy chọn kiểu Ôm vừa; nếu muốn mặc nhiều lớp hoặc ưu tiên sự thư giãn, kiểu Thoải mái sẽ phù hợp hơn.</p>`,
    options: [{ name: "Màu sắc" }, { name: "Kích cỡ" }, { name: "Kiểu dáng" }],
    variants: makeVariants({ prefix: "AERO", colors: ["Xanh biển", "Đen", "Trắng"], sizes: ["S", "M", "L"], fits: ["Ôm vừa", "Thoải mái"], basePrice: 489000 }),
    image_paths: ["ao-chay-aero-xanh-bien.jpg", "ao-chay-aero-den.jpg", "ao-chay-aero-trang.jpg"],
  },
  {
    title: "Quần legging nữ Flow Sculpt",
    handle: `quan-legging-nu-flow-sculpt-${batchId}`,
    vendor: "FOX Active",
    product_type: "Quần legging nữ",
    tags: ["fox-active", "legging", "gym", "pilates", "yoga", "nữ"],
    body_html: `<h2>Nâng đỡ vừa vặn cho luyện tập linh hoạt</h2><p>Quần legging nữ Flow Sculpt mang đến cảm giác chắc chắn nhưng không gò bó cho các buổi gym, Pilates, yoga và vận động hằng ngày. Thiết kế cạp cao bản rộng ôm ổn định vùng eo, hỗ trợ người mặc tự tin khi squat, kéo giãn hoặc chuyển đổi liên tục giữa các tư thế. Chất vải co giãn bốn chiều có bề mặt mịn, giữ phom tốt và phục hồi nhanh sau mỗi chuyển động.</p><p>Đường cắt cong phía trước và sau được bố trí để tôn dáng tự nhiên, đồng thời hạn chế tạo nếp thừa khi ngồi hoặc gập người. Túi bên gọn có thể giữ điện thoại, thẻ hoặc chìa khóa trong lúc tập. Chiều dài phủ đến mắt cá tạo vẻ liền mạch, dễ phối cùng áo bra thể thao, áo thun rộng hoặc áo khoác nhẹ. Vải có độ dày cân bằng để tạo cảm giác kín đáo trong điều kiện ánh sáng phòng tập thông thường.</p><h3>Điểm nổi bật</h3><ul><li>Cạp cao bản rộng, ôm ổn định và không dễ cuộn.</li><li>Co giãn bốn chiều, thích hợp các động tác biên độ lớn.</li><li>Túi bên tiện dụng, đường may phẳng giảm cọ xát.</li><li>Ba màu trung tính dễ xây dựng tủ đồ tập luyện.</li></ul><p>Flow Sculpt phù hợp cho cả buổi tập cường độ vừa và những ngày di chuyển nhiều. Màu Đen mang tính ứng dụng cao, Xanh rêu tạo cảm giác khỏe khoắn, còn Nâu cacao đem lại nét ấm và hiện đại. Nên chọn đúng số đo vòng eo và hông; nếu nằm giữa hai kích cỡ, hãy ưu tiên kích cỡ lớn hơn để có cảm giác thoải mái khi kéo giãn. Giặt bằng nước lạnh, lộn trái sản phẩm và phơi ở nơi thoáng mát. Tránh dùng nước xả quá nhiều vì có thể ảnh hưởng khả năng thoát ẩm của sợi vải kỹ thuật.</p>`,
    options: [{ name: "Màu sắc" }, { name: "Kích cỡ" }],
    variants: makeVariants({ prefix: "FLOW", colors: ["Đen", "Xanh rêu", "Nâu cacao"], sizes: ["S", "M", "L", "XL"], basePrice: 569000 }),
    image_paths: ["legging-flow-den.jpg", "legging-flow-xanh-reu.jpg", "legging-flow-nau-cacao.jpg"],
  },
  {
    title: "Áo bra Pilates Calm Support",
    handle: `ao-bra-pilates-calm-support-${batchId}`,
    vendor: "FOX Active",
    product_type: "Áo bra thể thao nữ",
    tags: ["fox-active", "sports bra", "pilates", "yoga", "gym", "nữ"],
    body_html: `<h2>Nâng đỡ êm dịu cho chuyển động có kiểm soát</h2><p>Áo bra Pilates Calm Support được phát triển cho Pilates, yoga, barre và các buổi tập sức mạnh cường độ vừa. Thiết kế cổ tròn mềm kết hợp bản vai rộng tạo cảm giác vững vàng mà vẫn giữ đường nét tối giản. Phần chân ngực bản rộng phân bổ lực đều, hạn chế hằn và giúp áo nằm ổn định khi bạn vươn người, xoay thân hoặc thực hiện chuỗi động tác liên tục.</p><p>Chất vải hiệu suất có bề mặt mịn, co giãn tốt và thoát ẩm nhanh. Kết cấu hai lớp ở thân trước tăng độ kín đáo, trong khi đường may được đặt xa các vùng dễ ma sát. Phom áo ôm vừa cơ thể, không tạo cảm giác nén quá mạnh nên phù hợp để mặc riêng trong phòng tập hoặc phối dưới áo khoác, sơ mi rộng và áo thun xuyên suốt ngày dài.</p><h3>Phù hợp với</h3><ul><li>Pilates máy và Pilates thảm.</li><li>Yoga, barre, đi bộ và tập sức mạnh cường độ vừa.</li><li>Phối đồ thể thao tối giản cho sinh hoạt hằng ngày.</li><li>Người ưu tiên cảm giác mềm, ổn định và dễ thở.</li></ul><p>Ba màu Hồng phấn, Kem và Xanh sương được chọn theo bảng màu nhẹ nhàng của FOX Fashion. Hồng phấn tạo điểm nhấn ấm, Kem mang vẻ tinh gọn, còn Xanh sương đem lại cảm giác mát và hiện đại. Để chọn kích cỡ, hãy dựa trên số đo vòng chân ngực; áo nên ôm sát nhưng bạn vẫn có thể hít sâu thoải mái. Sản phẩm phù hợp mức nâng đỡ trung bình và không được thiết kế thay thế áo chuyên dụng cho chạy đường dài hoặc vận động có độ nảy cao. Nên giặt lạnh trong túi giặt, tháo miếng lót nếu cần và phơi ngang ở nơi thoáng. Không sấy nhiệt cao để giữ độ đàn hồi của bản chân ngực và bề mặt vải.</p>`,
    options: [{ name: "Màu sắc" }, { name: "Kích cỡ" }],
    variants: makeVariants({ prefix: "CALM", colors: ["Hồng phấn", "Kem", "Xanh sương"], sizes: ["S", "M", "L", "XL"], basePrice: 399000 }),
    image_paths: ["ao-bra-pilates-hong-phan.jpg", "ao-bra-pilates-kem.jpg", "ao-bra-pilates-xanh-suong.jpg"],
  },
  {
    title: "Quần short nam Sprint 5",
    handle: `quan-short-nam-sprint-5-${batchId}`,
    vendor: "FOX Active",
    product_type: "Quần short chạy bộ nam",
    tags: ["fox-active", "quần short nam", "chạy bộ", "gym", "performance"],
    body_html: `<h2>Nhẹ và linh hoạt cho từng kilomet</h2><p>Quần short nam Sprint 5 được thiết kế cho người chạy bộ cần một sản phẩm gọn, nhẹ và dễ thích nghi với nhiều cường độ tập luyện. Chiều dài ngang giữa đùi tạo độ che phủ cân bằng nhưng không cản bước chân. Đường xẻ hai bên hỗ trợ sải chân rộng khi tăng tốc, leo dốc hoặc thực hiện các bài tập bổ trợ trong phòng gym.</p><p>Vải dệt kỹ thuật có trọng lượng nhẹ, thoát ẩm và khô nhanh sau vận động. Cạp chun mềm kết hợp dây rút bên trong cho phép điều chỉnh vừa vặn mà không tạo phần dây thừa bên ngoài. Túi khóa kéo nhỏ giúp giữ chìa khóa, thẻ hoặc vật dụng thiết yếu trong lúc chạy. Các đường may được tinh giản để giảm ma sát, mang lại cảm giác thoải mái trong cả buổi chạy ngắn lẫn lịch tập kéo dài.</p><h3>Thông tin sử dụng</h3><ul><li>Chiều dài thể thao khoảng năm inch, phù hợp chạy bộ và gym.</li><li>Vải nhẹ, nhanh khô, có độ co giãn hỗ trợ chuyển động.</li><li>Cạp chun và dây rút trong giúp cố định khi vận động mạnh.</li><li>Túi khóa kéo gọn cho vật dụng nhỏ.</li></ul><p>Sprint 5 có ba lựa chọn màu: Đen dễ phối, Xanh coban nổi bật trong hoạt động ngoài trời và Cam san hô mang năng lượng trẻ trung. Phom quần được thiết kế theo dáng vận động; hãy chọn kích cỡ thường mặc nếu muốn độ ôm tiêu chuẩn hoặc tăng một cỡ nếu thích cảm giác rộng hơn. Sản phẩm có thể phối cùng áo chạy AeroFlex, áo thun kỹ thuật hoặc áo khoác Motion Shell. Sau khi sử dụng, nên giặt lạnh với sản phẩm cùng màu, đóng khóa túi trước khi giặt và phơi tự nhiên. Tránh chất tẩy mạnh, bàn ủi nhiệt cao và sấy nóng để duy trì khả năng thoát ẩm cũng như độ bền của lớp vải.</p>`,
    options: [{ name: "Màu sắc" }, { name: "Kích cỡ" }],
    variants: makeVariants({ prefix: "SPRINT", colors: ["Đen", "Xanh coban", "Cam san hô"], sizes: ["S", "M", "L", "XL"], basePrice: 459000 }),
    image_paths: ["quan-short-sprint-den.jpg", "quan-short-sprint-xanh-coban.jpg", "quan-short-sprint-cam-san-ho.jpg"],
  },
  {
    title: "Áo khoác thể thao Motion Shell",
    handle: `ao-khoac-the-thao-motion-shell-${batchId}`,
    vendor: "FOX Active",
    product_type: "Áo khoác thể thao unisex",
    tags: ["fox-active", "áo khoác thể thao", "unisex", "chạy bộ", "training", "sold-out"],
    body_html: `<h2>Lớp bảo vệ gọn nhẹ cho lịch trình năng động</h2><p>Áo khoác thể thao Motion Shell là lớp ngoài linh hoạt dành cho chạy bộ nhẹ, khởi động trước buổi tập và di chuyển hằng ngày. Phom unisex cân đối, đủ gọn để giữ vẻ thể thao nhưng vẫn có khoảng trống cho áo thun hoặc áo dài tay bên trong. Cổ đứng giúp che chắn vùng cổ trước gió nhẹ, trong khi khóa kéo toàn thân hỗ trợ điều chỉnh nhiệt nhanh khi cường độ vận động thay đổi.</p><p>Vải dệt kỹ thuật nhẹ có bề mặt mịn, cản gió nhẹ và thoát hơi tốt hơn các loại áo khoác dày truyền thống. Tay raglan cùng đường cắt khớp chuyển động giúp vai và cánh tay vận động tự nhiên. Hai túi khóa kéo giữ vật dụng nhỏ an toàn, còn bo tay co giãn giúp tay áo nằm gọn khi chạy hoặc tập ngoài trời. Thiết kế không sử dụng chi tiết trang trí phức tạp nên dễ phối trong nhiều hoàn cảnh.</p><h3>Đặc điểm chính</h3><ul><li>Phom unisex nhẹ, phù hợp mặc nhiều lớp.</li><li>Cổ đứng và khóa kéo toàn thân dễ điều chỉnh.</li><li>Hai túi khóa kéo, tay áo linh hoạt và bo tay gọn.</li><li>Thích hợp thời tiết mát, gió nhẹ và di chuyển đô thị.</li></ul><p>Motion Shell có ba màu Xám khói, Xanh navy và Be cát. Các gam màu trung tính giúp áo phối thuận tiện cùng quần short, legging hoặc trang phục thường ngày. Nếu muốn phom gọn, hãy chọn kích cỡ thường mặc; nếu dự định mặc ngoài nhiều lớp áo, nên tăng một cỡ. Sản phẩm không phải áo mưa chuyên dụng và không phù hợp mưa lớn kéo dài. Nên đóng toàn bộ khóa kéo trước khi giặt, dùng nước lạnh và phơi trên móc tại nơi thoáng. Tránh sấy nhiệt cao để bảo vệ lớp vải và chi tiết khóa. Bộ sản phẩm demo hiện được đặt ở trạng thái hết hàng để kiểm tra giao diện sold-out, thông báo tồn kho và hành vi lựa chọn biến thể của theme.</p>`,
    options: [{ name: "Màu sắc" }, { name: "Kích cỡ" }],
    variants: makeVariants({ prefix: "MOTION", colors: ["Xám khói", "Xanh navy", "Be cát"], sizes: ["S", "M", "L", "XL"], basePrice: 789000, soldOut: true }),
    image_paths: ["ao-khoac-motion-xam-khoi.jpg", "ao-khoac-motion-xanh-navy.jpg", "ao-khoac-motion-be-cat.jpg"],
  },
];

function countWords(html) {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/u).filter(Boolean).length;
}

for (const product of products) {
  const wordCount = countWords(product.body_html);
  if (wordCount < 250 || wordCount > 450) {
    throw new Error(`${product.title} description has ${wordCount} words; expected 250-450.`);
  }
  product.image_paths = product.image_paths.map((filename) => path.join(batchDir, filename));
}

validateBatchProductRules(products);
for (const product of products) await validateProductImages(product.image_paths);

const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(managerDir, "mcp/server.mjs")],
  cwd: managerDir,
});
const client = new Client({ name: "codex-product-batch", version: "1.0.0" });
await client.connect(transport);

function parseToolResult(result) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : { ok: false, error: { message: "MCP returned no text result." } };
}

const connection = parseToolResult(await client.callTool({ name: "check_connection", arguments: {} }));
if (!connection.ok || !connection.result?.connected) {
  throw new Error(`Haravan connection failed: ${JSON.stringify(connection.error ?? connection)}`);
}

const results = [];
for (const { image_paths, ...product } of products) {
  const response = parseToolResult(await client.callTool({
    name: "create_product",
    arguments: { batch_id: batchId, product, image_paths },
  }));
  results.push(response);

  const status = Number(response.error?.status ?? response.error?.http_status ?? 0);
  if (!response.ok && (status === 401 || status === 403)) break;
}

await client.close();
console.log(JSON.stringify({ batch_id: batchId, connection: connection.result, results }, null, 2));
