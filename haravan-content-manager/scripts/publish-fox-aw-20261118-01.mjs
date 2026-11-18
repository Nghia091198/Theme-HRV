import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prepareProductPayload } from "../mcp/content.mjs";
import { validateProductImages } from "../mcp/images.mjs";
import { HaravanContentService } from "../mcp/service.mjs";

const batchId = "fox-aw-20261118-01";
const expectedShopId = "200001232562";
const outputDir = path.resolve("output", batchId);
const reportPath = path.join(outputDir, "batch-report.json");
const manifestPath = path.join(outputDir, "manifest.json");
const inputFiles = ["p1-product.json", "p2-product.json"];
const service = new HaravanContentService();

const inputs = [];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const passedPaths = new Set(
  Object.values(manifest.scenes)
    .filter((scene) => scene.status === "QC_PASSED")
    .map((scene) => path.normalize(scene.image_file)),
);

for (const filename of inputFiles) {
  const input = JSON.parse(await readFile(path.join(outputDir, filename), "utf8"));
  const product = prepareProductPayload(input.product);
  const images = await validateProductImages(input.image_paths);
  if (images.length !== 6 || images.some((image) => !passedPaths.has(path.normalize(image.path)))) {
    throw new Error(`${filename}: images must be the six QC-passed files for this product.`);
  }
  if (product.variants.some((variant) => !variant.sku.includes("FOXAW-20261118-"))) {
    throw new Error(`${filename}: SKU is missing the batch key.`);
  }
  inputs.push({ filename, product, imagePaths: input.image_paths, images });
}

const connection = await service.checkConnection({ refreshToken: true });
if (connection.shop.id !== expectedShopId) {
  throw new Error(`Wrong shop ID ${connection.shop.id}; expected ${expectedShopId}. No product was written.`);
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
report.shop_connection = { ...connection.shop, matches_target: true, target_org_id: expectedShopId };
report.status = "PUBLISHING";
report.items ??= [];
await writeFile(reportPath, JSON.stringify(report, null, 2));

for (const input of inputs) {
  const duplicate = await service.findProductByHandle(input.product.handle);
  if (duplicate) {
    report.items.push({ title: input.product.title, handle: input.product.handle, id: String(duplicate.id), status: "DUPLICATE_SKIPPED" });
    report.status = "PARTIAL";
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    continue;
  }

  const result = await service.createProduct({ batch_id: batchId, product: input.product, image_paths: input.imagePaths });
  const item = { ...result, source_file: input.filename, verified: false, image_urls: [] };
  report.items.push(item);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  if (result.status !== "published") continue;

  const { data } = await service.client.get(`/com/products/${encodeURIComponent(result.id)}.json`);
  const remote = data.product ?? data;
  let remoteImages = Array.isArray(remote.images) ? remote.images : [];
  if (remoteImages.length !== input.images.length) {
    const imageResponse = await service.client.get(`/com/products/${encodeURIComponent(result.id)}/images.json`);
    remoteImages = imageResponse.data.images ?? [];
  }
  const actualSkus = new Set((remote.variants ?? []).map((variant) => String(variant.sku)));
  const expectedSkus = input.product.variants.map((variant) => variant.sku);
  const imageUrls = remoteImages
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((image) => ({ id: image.id == null ? null : String(image.id), src: image.src ?? image.url ?? null, position: image.position }));
  const verified = String(remote.id) === String(result.id)
    && remote.handle === input.product.handle
    && (remote.published === true || Boolean(remote.published_at))
    && expectedSkus.every((sku) => actualSkus.has(sku))
    && imageUrls.length === input.images.length
    && imageUrls.every((image) => Boolean(image.id && image.src));

  item.verified = verified;
  item.image_urls = imageUrls;
  item.remote_variant_count = (remote.variants ?? []).length;
  item.remote_published = remote.published === true || Boolean(remote.published_at);
  item.status = verified ? "COMPLETED" : "PARTIAL_VERIFY_FAILED";
  if (verified) {
    for (let index = 0; index < input.imagePaths.length; index += 1) {
      const scene = Object.values(manifest.scenes).find((entry) => path.normalize(entry.image_file) === path.normalize(input.imagePaths[index]));
      Object.assign(scene, { status: "VERIFIED", uploaded: true, haravan_image_id: imageUrls[index].id, haravan_url: imageUrls[index].src });
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
  report.created_products = report.items.filter((entry) => entry.id).length;
  report.published_products = report.items.filter((entry) => entry.remote_published).length;
  report.status = report.items.every((entry) => entry.status === "COMPLETED") ? "COMPLETED" : "PARTIAL";
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ title: item.title, id: item.id, status: item.status, image_count: imageUrls.length, storefront_url: item.storefront_url }));
}

report.created_products = report.items.filter((entry) => entry.id).length;
report.published_products = report.items.filter((entry) => entry.remote_published).length;
report.status = report.items.every((entry) => entry.status === "COMPLETED") ? "COMPLETED" : "PARTIAL";
await writeFile(reportPath, JSON.stringify(report, null, 2));
