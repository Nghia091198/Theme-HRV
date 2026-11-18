import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prepareProductPayload } from "../mcp/content.mjs";
import { validateJpegFile } from "../mcp/images.mjs";
import { HaravanContentService } from "../mcp/service.mjs";

const root = path.resolve("output/fox-v2-20261118");
const plan = JSON.parse(await readFile(path.join(root, "plan.json"), "utf8"));
const manifestPath = path.join(root, "image-manifest.json");
const reportPath = path.join(root, "haravan-products.json");
const scenes = ["S01-HERO", "S02-ACTION", "S03-GROUP", "S04-STREET", "S05-DETAIL", "S06-RECOVERY"];
const sceneLabels = { "S01-HERO": "ảnh chủ đạo", "S02-ACTION": "cảnh vận động", "S03-GROUP": "cảnh tập cùng bạn", "S04-STREET": "cảnh dạo phố", "S05-DETAIL": "ảnh chi tiết", "S06-RECOVERY": "cảnh nghỉ sau tập" };
const service = new HaravanContentService();
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const writeMode = process.argv.includes("--publish");
if (plan.review_blockers?.length) throw new Error(`Unresolved manual review: ${plan.review_blockers.join(", ")}`);

function description(item) {
  const colorNames = item.colors.map((color) => color.label).join(" và ");
  return `<p><strong>Mẫu ý tưởng minh họa giao diện.</strong> ${item.title} là ý tưởng trang phục nữ của Fox Activewear, được xây dựng để thử cách hiển thị sản phẩm, biến thể và bộ ảnh trên cửa hàng. Đây chưa phải mẫu hàng đã xác nhận sản xuất. Giá bán và số lượng tồn trên trang là dữ liệu giả định phục vụ thử nghiệm; vui lòng không dùng để quyết định mua hàng thật.</p>
<h2>Thiết kế dự kiến</h2>
<p>${item.design} Bộ ảnh mô tả sản phẩm trong sắc ${colorNames}. Mỗi sắc được thể hiện riêng để người xem dễ phân biệt trong bộ ảnh. Màu sắc trên màn hình có thể thay đổi theo thiết bị và ánh sáng trong ảnh; chưa có bảng màu vật lý để đối chiếu.</p>
<h2>Gợi ý mặc và vận động</h2>
<p>Ý tưởng này hướng đến ${item.activity}, đồng thời có thể phối với trang phục cơ bản để đi lại trước hoặc sau buổi tập. Trong ảnh, các món áo, quần, giày, túi và dụng cụ đi cùng chỉ là đồ phối cảnh, không nằm trong sản phẩm đang chọn. Hãy xem từng ảnh để hình dung phom dáng concept, góc nhìn khi chuyển động và cách phối màu trong đời sống.</p>
<h2>Thông tin cần xác minh trước khi bán</h2>
<p>Chất liệu, thành phần vải, độ co giãn, độ dày, thông số đo, hướng dẫn giặt và khả năng hỗ trợ vận động hiện chưa có dữ liệu hàng thật. Các mô tả hình dáng ở đây là đặc điểm thiết kế đề xuất, không phải cam kết kỹ thuật. Kích thước S, M, L và XL chỉ dùng để kiểm thử biến thể; chưa có bảng số đo xác nhận. Hãy liên hệ cửa hàng để nhận thông tin sản phẩm thực tế trước khi đặt mua. Fox Activewear sẽ cập nhật nội dung, giá và tồn kho khi mẫu hàng đã được kiểm tra và sẵn sàng bán.</p>`;
}

function makePayload(item) {
  const variants = item.colors.flatMap((color) => plan.sizes.map((size) => ({
    option1: color.label,
    option2: size,
    sku: `FOXV2-20261118-${item.key.slice(-2)}-${color.sku}-${size}`,
    price: item.price,
    inventory_quantity: plan.stock_by_size[size],
    inventory_management: "haravan",
    inventory_policy: "deny",
  })));
  return prepareProductPayload({
    title: item.title,
    handle: item.handle,
    body_html: description(item),
    vendor: "Fox Activewear",
    product_type: item.type,
    tags: ["Mẫu ý tưởng", "Dữ liệu minh họa", item.type, item.activity],
    options: [{ name: "Màu sắc" }, { name: "Kích thước" }],
    variants,
  });
}

const inputs = [];
for (const item of plan.products) {
  const imageEntries = [];
  for (const color of item.colors) {
    for (const sceneId of scenes) {
      const id = `${item.key}/${color.key}/${sceneId}`;
      const record = manifest.scenes[id];
      if (record?.qc_status !== "QC_PASSED" || record.qc_score < 30) throw new Error(`Image not QC passed: ${id}`);
      const image = await validateJpegFile(record.image_file, { label: id, width: 1600, height: 1600, maxBytes: 512_000 });
      imageEntries.push({ ...image, id, color: color.label, sceneId });
    }
  }
  inputs.push({ item, payload: makePayload(item), images: imageEntries });
}
if (inputs.length !== 10 || inputs.reduce((sum, input) => sum + input.images.length, 0) !== 78) throw new Error("Batch size mismatch");
const allSkus = inputs.flatMap((input) => input.payload.variants.map((variant) => variant.sku));
if (new Set(allSkus).size !== allSkus.length || allSkus.length !== 52) throw new Error("SKU matrix mismatch");
console.log(JSON.stringify({ prepared_products: inputs.length, images: 78, skus: allSkus.length, write_mode: writeMode }));
if (!writeMode) process.exit(0);

const connection = await service.checkConnection({ refreshToken: true });
if (connection.shop.id !== plan.shop_id) throw new Error(`Wrong shop ID ${connection.shop.id}; expected ${plan.shop_id}`);
let report = { batch_id: plan.batch_id, shop: connection.shop, status: "PUBLISHING", items: [] };
try { report = JSON.parse(await readFile(reportPath, "utf8")); } catch {}
await writeFile(reportPath, JSON.stringify(report, null, 2));

for (const input of inputs) {
  const { item, payload, images } = input;
  let remote = await service.findProductByHandle(payload.handle);
  let productId = remote?.id;
  if (!productId) {
    await service.assertProductIsUnique(payload);
    remote = await service.createProductDraft(payload);
    productId = remote?.id;
  }
  if (!productId) throw new Error(`No product ID for ${item.key}`);
  const id = String(productId);
  let record = report.items.find((entry) => entry.key === item.key);
  if (!record) {
    record = { key: item.key, title: item.title, handle: payload.handle, id, status: "DRAFT", expected_images: images.length, uploaded_images: 0, verified: false, published: false, color_mapping: {} };
    report.items.push(record);
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  try {
    const endpoint = `/com/products/${encodeURIComponent(id)}.json`;
    const { data: initialData } = await service.client.get(endpoint);
    remote = initialData.product ?? initialData;
    if (record.status === "COMPLETED" && (remote.published === true || remote.published_at)) {
      console.log(JSON.stringify({ key: item.key, id, status: "ALREADY_COMPLETED" }));
      continue;
    }
    if (remote.published === true || remote.published_at) throw new Error(`${item.key} is already published before verification`);
    const remoteVariants = remote.variants ?? [];
    const bySku = new Map(remoteVariants.map((variant) => [variant.sku, variant]));
    if (remoteVariants.length !== payload.variants.length || payload.variants.some((variant) => !bySku.has(variant.sku))) throw new Error(`${item.key} variants do not match`);
    for (const variant of payload.variants) {
      const actual = bySku.get(variant.sku);
      if (Number(actual.price) !== variant.price || Number(actual.inventory_quantity) !== variant.inventory_quantity || actual.option1 !== variant.option1 || actual.option2 !== variant.option2) {
        throw new Error(`${item.key} variant data mismatch: ${variant.sku}`);
      }
    }
    let { data: imageData } = await service.client.get(`/com/products/${id}/images.json`);
    let remoteImages = imageData.images ?? [];
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const alt = `${item.title} màu ${image.color}, ${sceneLabels[image.sceneId]}`;
      const existing = remoteImages.find((entry) => entry.filename === image.filename || entry.alt === alt);
      let uploaded = existing;
      if (!uploaded) {
        const variantIds = remoteVariants.filter((variant) => variant.option1 === image.color).map((variant) => variant.id);
        const imagePayload = {
          attachment: image.attachment,
          filename: image.filename,
          alt,
          position: index + 1,
        };
        if (image.sceneId === "S01-HERO") imagePayload.variant_ids = variantIds;
        let response;
        try {
          response = await service.client.post(`/com/products/${id}/images.json`, { image: imagePayload });
        } catch (error) {
          if (error?.status !== 422 || !imagePayload.variant_ids) throw error;
          delete imagePayload.variant_ids;
          record.variant_image_mapping_unsupported = true;
          response = await service.client.post(`/com/products/${id}/images.json`, { image: imagePayload });
        }
        uploaded = response.data.image ?? response.data;
      }
      if (!uploaded?.id) throw new Error(`${item.key} image upload missing ID: ${image.id}`);
      const scene = manifest.scenes[image.id];
      Object.assign(scene, { product_id: id, variant_ids: remoteVariants.filter((variant) => variant.option1 === image.color).map((variant) => String(variant.id)), haravan_image_id: String(uploaded.id), upload_status: "UPLOADED" });
      remoteImages.push(uploaded);
      record.uploaded_images = index + 1;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      await writeFile(reportPath, JSON.stringify(report, null, 2));
    }
    for (let readAttempt = 0; readAttempt < 4; readAttempt += 1) {
      imageData = (await service.client.get(`/com/products/${id}/images.json`)).data;
      remoteImages = imageData.images ?? [];
      if (remoteImages.length === images.length && remoteImages.every((image) => image.id && image.src)) break;
      if (readAttempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (remoteImages.length !== images.length) throw new Error(`${item.key} image count ${remoteImages.length}/${images.length}`);
    for (const image of images) {
      const scene = manifest.scenes[image.id];
      const found = remoteImages.find((entry) => String(entry.id) === scene.haravan_image_id);
      if (!found?.src) throw new Error(`${item.key} image read-back failed: ${image.id}`);
      scene.read_back_verified = true;
      scene.haravan_url = found.src;
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    record.status = "VERIFIED_DRAFT";
    record.verified = true;
    record.color_mapping = Object.fromEntries(item.colors.map((color) => [color.key, {
      label: color.label,
      skus: payload.variants.filter((variant) => variant.option1 === color.label).map((variant) => variant.sku),
      variant_ids: remoteVariants.filter((variant) => variant.option1 === color.label).map((variant) => String(variant.id)),
      image_ids: images.filter((image) => image.color === color.label).map((image) => manifest.scenes[image.id].haravan_image_id),
      hero_image_id: manifest.scenes[`${item.key}/${color.key}/S01-HERO`].haravan_image_id,
      hero_variant_ids_read_back: (remoteImages.find((image) => String(image.id) === manifest.scenes[`${item.key}/${color.key}/S01-HERO`].haravan_image_id)?.variant_ids ?? []).map(String),
      rule_status: "RULE_DATA_READY_FRONTEND_UNVERIFIED",
    }]));
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    await service.client.put(endpoint, { product: { id: productId, published: true, published_at: new Date().toISOString() } });
    const { data: finalData } = await service.client.get(endpoint);
    const final = finalData.product ?? finalData;
    if (!(final.published === true || final.published_at)) throw new Error(`${item.key} publish read-back failed`);
    record.status = "COMPLETED";
    record.published = true;
    record.storefront_url = `https://${connection.shop.domain}/products/${payload.handle}`;
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ key: item.key, id, status: record.status, images: record.uploaded_images, url: record.storefront_url }));
  } catch (error) {
    record.status = "PARTIAL";
    record.error = String(error.message ?? error);
    report.status = "PARTIAL";
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.error(JSON.stringify({ key: item.key, id, status: record.status, error: record.error }));
    if (error?.status === 401 || error?.status === 403) break;
  }
}
report.status = report.items.length === 10 && report.items.every((entry) => entry.status === "COMPLETED") ? "COMPLETED" : "PARTIAL";
await writeFile(reportPath, JSON.stringify(report, null, 2));
