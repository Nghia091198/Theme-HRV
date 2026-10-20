import path from "node:path";
import { fileURLToPath } from "node:url";

import { HaravanClient } from "../../mcp/haravan-client.mjs";
import { validateProductImages } from "../../mcp/images.mjs";

const outputDirectory = path.dirname(fileURLToPath(import.meta.url));

const products = [
  {
    id: 1075978670,
    title: "Ao chay nu AeroFlex dai tay",
    images: [
      ["ao-chay-aero-xanh-bien-human.jpg", "Xanh bien"],
      ["ao-chay-aero-den-human.jpg", "Den"],
      ["ao-chay-aero-trang-human.jpg", "Trang"],
    ],
  },
  {
    id: 1075978671,
    title: "Quan legging nu Flow Sculpt",
    images: [
      ["legging-flow-den-human.jpg", "Den"],
      ["legging-flow-xanh-reu-human.jpg", "Xanh reu"],
      ["legging-flow-nau-cacao-human.jpg", "Nau cacao"],
    ],
  },
  {
    id: 1075978673,
    title: "Ao bra Pilates Calm Support",
    images: [
      ["ao-bra-pilates-hong-phan-human.jpg", "Hong phan"],
      ["ao-bra-pilates-kem-human.jpg", "Kem"],
      ["ao-bra-pilates-xanh-suong-human.jpg", "Xanh suong"],
    ],
  },
  {
    id: 1075978674,
    title: "Quan short nam Sprint 5",
    images: [
      ["quan-short-sprint-den-human.jpg", "Den"],
      ["quan-short-sprint-xanh-coban-human.jpg", "Xanh coban"],
      ["quan-short-sprint-cam-san-ho-human.jpg", "Cam san ho"],
    ],
  },
  {
    id: 1075978675,
    title: "Ao khoac the thao Motion Shell",
    images: [
      ["ao-khoac-motion-xam-khoi-human.jpg", "Xam khoi"],
      ["ao-khoac-motion-xanh-navy-human.jpg", "Xanh navy"],
      ["ao-khoac-motion-be-cat-human.jpg", "Be cat"],
    ],
  },
];

function unwrap(data, key) {
  return data?.[key] ?? data;
}

function imageId(image) {
  const value = Number(image?.id);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Haravan did not return a valid image ID.");
  }
  return value;
}

function groupVariantIds(product) {
  const groups = new Map();
  for (const variant of product?.variants ?? []) {
    const optionValue = String(variant.option1 ?? "").trim().toLocaleLowerCase("vi");
    if (!groups.has(optionValue)) groups.set(optionValue, []);
    if (variant.id !== undefined && variant.id !== null) {
      groups.get(optionValue).push(variant.id);
    }
  }
  return groups;
}

async function listImages(client, productId) {
  const response = await client.get(`/com/products/${encodeURIComponent(productId)}/images.json`);
  const images = unwrap(response.data, "images");
  if (!Array.isArray(images)) throw new Error(`Image list was invalid for product ${productId}.`);
  return images;
}

async function replaceProductImages(client, definition, validatedImages) {
  const productResponse = await client.get(`/com/products/${encodeURIComponent(definition.id)}.json`);
  const product = unwrap(productResponse.data, "product");
  if (!product || Number(product.id) !== definition.id) {
    throw new Error(`Product verification failed for ${definition.id}.`);
  }

  const originalImages = await listImages(client, definition.id);
  const originalIds = originalImages.map(imageId);
  if (!originalIds.length) throw new Error(`Product ${definition.id} has no original images to replace.`);

  const variantGroups = groupVariantIds(product);
  const uploadedIds = [];

  try {
    for (let index = 0; index < validatedImages.length; index += 1) {
      const image = validatedImages[index];
      const color = definition.images[index][1];
      const payload = {
        attachment: image.attachment,
        filename: image.filename,
        alt: `${product.title} - ${color}`,
        position: originalImages.length + index + 1,
      };
      const matchingVariantIds = variantGroups.get(color.toLocaleLowerCase("vi"));
      if (matchingVariantIds?.length) payload.variant_ids = matchingVariantIds;

      const response = await client.post(`/com/products/${encodeURIComponent(definition.id)}/images.json`, {
        image: payload,
      });
      uploadedIds.push(imageId(unwrap(response.data, "image")));
    }

    const afterUpload = await listImages(client, definition.id);
    const afterUploadIds = new Set(afterUpload.map(imageId));
    if (!uploadedIds.every((id) => afterUploadIds.has(id))) {
      throw new Error(`New image verification failed for product ${definition.id}. Original images were retained.`);
    }
  } catch (error) {
    error.message = `${error.message} Uploaded new image IDs retained: ${uploadedIds.join(", ") || "none"}.`;
    throw error;
  }

  for (const originalId of originalIds) {
    await client.request(
      `/com/products/${encodeURIComponent(definition.id)}/images/${encodeURIComponent(originalId)}.json`,
      { method: "DELETE" },
    );
  }

  const finalImages = await listImages(client, definition.id);
  const finalIds = new Set(finalImages.map(imageId));
  const missingNewImages = uploadedIds.filter((id) => !finalIds.has(id));
  const remainingOldImages = originalIds.filter((id) => finalIds.has(id));
  if (missingNewImages.length || remainingOldImages.length || finalImages.length !== 3) {
    throw new Error(
      `Final verification failed for product ${definition.id}: `
      + `${finalImages.length} images, missing new IDs [${missingNewImages.join(", ")}], `
      + `remaining old IDs [${remainingOldImages.join(", ")}].`,
    );
  }

  return {
    id: definition.id,
    title: product.title,
    removed_image_ids: originalIds,
    new_image_ids: uploadedIds,
  };
}

async function main() {
  const prepared = [];

  // Validate the complete batch before the first remote mutation.
  for (const definition of products) {
    const paths = definition.images.map(([filename]) => path.join(outputDirectory, filename));
    prepared.push({
      definition,
      images: await validateProductImages(paths),
    });
  }

  const client = new HaravanClient();
  const results = [];
  for (const item of prepared) {
    const result = await replaceProductImages(client, item.definition, item.images);
    results.push(result);
    console.log(JSON.stringify({ event: "product_images_replaced", ...result }));
  }

  console.log(JSON.stringify({ event: "batch_complete", product_count: results.length }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: "batch_failed",
    name: error?.name ?? "Error",
    code: error?.code ?? null,
    status: error?.status ?? null,
    message: error?.message ?? String(error),
  }));
  process.exitCode = 1;
});
