import { HaravanClient } from "../mcp/haravan-client.mjs";

// Read-only: products that already have photos, with their first option values (colours) and image URLs.
const client = new HaravanClient();
const { data } = await client.get("/com/products.json", {
  fields: "id,title,handle,product_type,options,variants,images",
  limit: 50,
});

const products = (data?.products ?? [])
  .filter((product) => (product.images ?? []).length > 0)
  .map((product) => ({
    id: product.id,
    title: product.title,
    type: product.product_type,
    colours: [...new Set((product.variants ?? []).map((variant) => variant.option1).filter(Boolean))],
    images: (product.images ?? []).map((image) => ({
      src: image.src,
      variant_ids: (image.variant_ids ?? []).length,
    })),
  }));

console.log(JSON.stringify(products, null, 2));
