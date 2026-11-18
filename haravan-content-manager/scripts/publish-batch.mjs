import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateBatchProductRules } from "../mcp/content.mjs";
import { isAuthError, toSafeError } from "../mcp/errors.mjs";
import { validateProductImages } from "../mcp/images.mjs";
import { HaravanContentService } from "../mcp/service.mjs";

// Batch folder under output/: pN-*.json payloads, pN-*.jpg images (image order = colour order).
const BATCH = "fox-batch-b1111f";
const CHECK_ONLY = process.argv.includes("--check");

const batchDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "output", BATCH);
const files = (await readdir(batchDir)).sort();
const items = [];
for (const file of files.filter((name) => /^p\d+-.+\.json$/i.test(name))) {
  const prefix = file.split("-")[0];
  const { product } = JSON.parse(await readFile(path.join(batchDir, file), "utf8"));
  const imagePaths = files
    .filter((name) => name.startsWith(`${prefix}-`) && /\.jpe?g$/i.test(name))
    .map((name) => path.join(batchDir, name));
  items.push({ file, product, imagePaths });
}

const report = { batch: BATCH, mode: CHECK_ONLY ? "check" : "publish", items: [] };
try {
  validateBatchProductRules(items.map((item) => item.product));
  report.batch_rules = "ok";
} catch (error) {
  report.batch_rules = toSafeError(error);
}

const service = CHECK_ONLY ? null : new HaravanContentService({ logger: () => {} });
for (const item of items) {
  const entry = { file: item.file, title: item.product.title, images: item.imagePaths.map((p) => path.basename(p)) };
  try {
    if (CHECK_ONLY) {
      const images = await validateProductImages(item.imagePaths);
      entry.status = "ready";
      entry.image_check = images.map((image) => `${image.width}x${image.height} ${image.bytes}B`);
    } else {
      Object.assign(entry, await service.createProduct({ batch_id: BATCH, product: item.product, image_paths: item.imagePaths }));
    }
  } catch (error) {
    entry.status = "failed";
    entry.error = toSafeError(error);
    if (isAuthError(error)) {
      report.items.push(entry);
      report.stopped = "authentication";
      break;
    }
  }
  report.items.push(entry);
}

console.log(JSON.stringify(report, null, 2));
