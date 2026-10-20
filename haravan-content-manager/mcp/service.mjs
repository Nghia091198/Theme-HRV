import {
  DuplicateResourceError,
  HaravanApiError,
  InputValidationError,
  RequestTimeoutError,
  isAuthError,
  toSafeError,
} from "./errors.mjs";
import { prepareArticlePayload, prepareProductPayload } from "./content.mjs";
import { validateArticleImage, validateProductImages } from "./images.mjs";
import { HaravanClient } from "./haravan-client.mjs";

function asArray(data, key) {
  if (Array.isArray(data?.[key])) return data[key];
  return Array.isArray(data) ? data : [];
}

function unwrap(data, key) {
  return data?.[key] ?? data ?? null;
}

function resourceId(resource) {
  return resource?.id === undefined || resource?.id === null ? null : String(resource.id);
}

function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function hasImage(resource) {
  const image = resource?.image;
  return Boolean(image && (image.id || image.src || image.url));
}

function isPublished(resource) {
  return resource?.published === true || Boolean(resource?.published_at);
}

function auditRecord(fields) {
  return {
    batch_id: String(fields.batch_id ?? "unassigned").slice(0, 80),
    event: String(fields.event ?? "unknown").slice(0, 80),
    resource_id: fields.resource_id ? String(fields.resource_id) : null,
    http_status: Number.isInteger(fields.http_status) ? fields.http_status : null,
    error_code: fields.error_code ? String(fields.error_code).slice(0, 80) : null,
  };
}

export class HaravanContentService {
  constructor(options = {}) {
    this.client = options.client ?? new HaravanClient();
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? ((record) => process.stderr.write(`${JSON.stringify(record)}\n`));
    this.shopDomain = null;
    this.knownHandles = new Set();
    this.knownSkus = new Set();
    this.variantEndpointAvailable = null;
    this.remoteSkuSnapshot = null;
  }

  log(fields) {
    this.logger(auditRecord(fields));
  }

  async checkConnection(options = {}) {
    if (options.refreshToken) this.client.clearToken?.();
    const { data } = await this.client.get("/com/shop.json");
    const shop = unwrap(data, "shop");
    if (!shop || typeof shop !== "object") {
      throw new HaravanApiError("Haravan shop response did not include shop data.");
    }

    this.shopDomain = normalizeDomain(shop.domain ?? shop.myshopify_domain ?? shop.primary_domain);
    return {
      connected: true,
      shop: {
        id: resourceId(shop),
        name: String(shop.name ?? ""),
        domain: this.shopDomain || null,
        currency: String(shop.currency ?? ""),
        timezone: String(shop.timezone ?? shop.iana_timezone ?? ""),
      },
    };
  }

  async listBlogs() {
    const { data } = await this.client.get("/web/blogs.json");
    return asArray(data, "blogs").map((blog) => ({
      id: resourceId(blog),
      name: String(blog.title ?? blog.name ?? ""),
      handle: String(blog.handle ?? ""),
    }));
  }

  async ensureShopDomain() {
    if (!this.shopDomain) await this.checkConnection();
    return this.shopDomain;
  }

  async getBlog(blogId) {
    const blogs = await this.listBlogs();
    return blogs.find((blog) => blog.id === String(blogId)) ?? null;
  }

  async findArticleByHandle(blogId, handle) {
    const { data } = await this.client.get(`/web/blogs/${encodeURIComponent(blogId)}/articles.json`, {
      handle,
      limit: 50,
    });
    return asArray(data, "articles").find((article) => article.handle === handle) ?? null;
  }

  async createArticleDraft(blogId, article) {
    const endpoint = `/web/blogs/${encodeURIComponent(blogId)}/articles.json`;
    try {
      const { data } = await this.client.post(endpoint, { article });
      return unwrap(data, "article");
    } catch (error) {
      if (!(error instanceof RequestTimeoutError)) throw error;
      const recovered = await this.findArticleByHandle(blogId, article.handle);
      if (recovered) return recovered;
      const { data } = await this.client.post(endpoint, { article });
      return unwrap(data, "article");
    }
  }

  async createArticle(input) {
    const batchId = String(input.batch_id ?? `article-${this.now().getTime()}`);
    const blogId = String(input.blog_id ?? "").trim();
    if (!blogId) throw new InputValidationError("blog_id is required.");

    // Validate all local input before the first Haravan write.
    const article = prepareArticlePayload(input.article);
    const image = await validateArticleImage(input.image_path);
    const duplicate = await this.findArticleByHandle(blogId, article.handle);
    if (duplicate) {
      throw new DuplicateResourceError(`Article handle ${article.handle} already exists.`, {
        resourceId: resourceId(duplicate),
      });
    }

    const draft = await this.createArticleDraft(blogId, article);
    const draftId = resourceId(draft);
    if (!draftId) throw new HaravanApiError("Haravan did not return an article ID after draft creation.");
    this.log({ batch_id: batchId, event: "article_draft_created", resource_id: draftId, http_status: 201 });

    const endpoint = `/web/blogs/${encodeURIComponent(blogId)}/articles/${encodeURIComponent(draftId)}.json`;
    try {
      await this.client.put(endpoint, {
        article: {
          id: draftId,
          image: {
            attachment: image.attachment,
            filename: image.filename,
            alt: String(input.article?.image_alt ?? input.article?.title ?? "").trim(),
          },
        },
      });

      const { data: verifyData } = await this.client.get(endpoint);
      const verified = unwrap(verifyData, "article");
      if (!hasImage(verified)) {
        throw new HaravanApiError("Article image verification failed.", {
          code: "ARTICLE_IMAGE_VERIFY_FAILED",
          resourceId: draftId,
        });
      }
      if (isPublished(verified)) {
        throw new HaravanApiError("Article became published before verification completed.", {
          code: "ARTICLE_DRAFT_STATE_INVALID",
          resourceId: draftId,
        });
      }

      const publishedAt = this.now().toISOString();
      await this.client.put(endpoint, {
        article: { id: draftId, published: true, published_at: publishedAt },
      });
      const { data: publishedData } = await this.client.get(endpoint);
      const published = unwrap(publishedData, "article");
      if (!isPublished(published)) {
        throw new HaravanApiError("Article publish verification failed.", {
          code: "ARTICLE_PUBLISH_VERIFY_FAILED",
          resourceId: draftId,
        });
      }

      const domain = await this.ensureShopDomain();
      const blog = await this.getBlog(blogId);
      const storefrontUrl = domain && blog?.handle
        ? `https://${domain}/blogs/${blog.handle}/${article.handle}`
        : null;
      this.log({ batch_id: batchId, event: "article_published", resource_id: draftId, http_status: 200 });
      return {
        batch_id: batchId,
        status: "published",
        id: draftId,
        title: article.title,
        handle: article.handle,
        storefront_url: storefrontUrl,
        image: { width: image.width, height: image.height, bytes: image.bytes },
      };
    } catch (error) {
      error.resourceId = error.resourceId ?? draftId;
      this.log({
        batch_id: batchId,
        event: "article_draft_retained",
        resource_id: draftId,
        http_status: error.status,
        error_code: error.code,
      });
      if (isAuthError(error)) throw error;
      return {
        batch_id: batchId,
        status: "draft-retained",
        id: draftId,
        title: article.title,
        handle: article.handle,
        storefront_url: null,
        error: toSafeError(error),
      };
    }
  }

  async findProductByHandle(handle) {
    const { data } = await this.client.get("/com/products.json", {
      handle,
      fields: "id,handle,variants",
      limit: 50,
    });
    return asArray(data, "products").find((product) => product.handle === handle) ?? null;
  }

  async findVariantBySku(sku) {
    if (this.variantEndpointAvailable !== false) {
      try {
        const { data } = await this.client.get("/com/variants.json", { sku, limit: 10 });
        this.variantEndpointAvailable = true;
        return asArray(data, "variants").find((variant) => String(variant.sku).toLowerCase() === sku.toLowerCase()) ?? null;
      } catch (error) {
        if (error?.status !== 404) throw error;
        this.variantEndpointAvailable = false;
      }
    }

    if (!this.remoteSkuSnapshot) {
      this.remoteSkuSnapshot = new Map();
      for (let page = 1; page <= 20; page += 1) {
        const { data } = await this.client.get("/com/products.json", {
          fields: "id,variants",
          limit: 250,
          page,
        });
        const products = asArray(data, "products");
        for (const product of products) {
          for (const variant of product.variants ?? []) {
            if (variant.sku) this.remoteSkuSnapshot.set(String(variant.sku).toLowerCase(), variant);
          }
        }
        if (products.length < 250) break;
      }
    }
    return this.remoteSkuSnapshot.get(sku.toLowerCase()) ?? null;
  }

  async assertProductIsUnique(product) {
    if (this.knownHandles.has(product.handle)) {
      throw new DuplicateResourceError(`Product handle ${product.handle} was already created in this session.`);
    }

    const handleMatch = await this.findProductByHandle(product.handle);
    if (handleMatch) {
      throw new DuplicateResourceError(`Product handle ${product.handle} already exists.`, {
        resourceId: resourceId(handleMatch),
      });
    }

    for (const variant of product.variants) {
      const skuKey = variant.sku.toLowerCase();
      if (this.knownSkus.has(skuKey)) {
        throw new DuplicateResourceError(`Product SKU ${variant.sku} was already created in this session.`);
      }
      const skuMatch = await this.findVariantBySku(variant.sku);
      if (skuMatch) {
        throw new DuplicateResourceError(`Product SKU ${variant.sku} already exists.`, {
          resourceId: resourceId(skuMatch),
        });
      }
    }
  }

  async createProductDraft(product) {
    try {
      const { data } = await this.client.post("/com/products.json", { product });
      return unwrap(data, "product");
    } catch (error) {
      if (!(error instanceof RequestTimeoutError)) throw error;
      const recovered = await this.findProductByHandle(product.handle);
      if (recovered) return recovered;
      const { data } = await this.client.post("/com/products.json", { product });
      return unwrap(data, "product");
    }
  }

  variantIdsForImages(product) {
    const groups = new Map();
    for (const variant of product?.variants ?? []) {
      const optionValue = String(variant.option1 ?? "").toLowerCase();
      if (!groups.has(optionValue)) groups.set(optionValue, []);
      if (variant.id !== undefined && variant.id !== null) groups.get(optionValue).push(variant.id);
    }
    return [...groups.values()].slice(0, 3);
  }

  async verifyProduct(productId, expected) {
    const endpoint = `/com/products/${encodeURIComponent(productId)}.json`;
    const { data } = await this.client.get(endpoint);
    const product = unwrap(data, "product");
    if (!product) throw new HaravanApiError("Product verification response was empty.");

    const options = Array.isArray(product.options) ? product.options : [];
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let images = Array.isArray(product.images) ? product.images : [];
    if (images.length < 3) {
      const imageResponse = await this.client.get(`/com/products/${encodeURIComponent(productId)}/images.json`);
      images = asArray(imageResponse.data, "images");
    }

    if (options.length !== expected.options.length) {
      throw new HaravanApiError("Product option verification failed.", { code: "PRODUCT_OPTIONS_VERIFY_FAILED" });
    }
    if (variants.length !== expected.variants.length) {
      throw new HaravanApiError("Product variant verification failed.", { code: "PRODUCT_VARIANTS_VERIFY_FAILED" });
    }
    if (images.length < 3) {
      throw new HaravanApiError("Product image verification failed.", { code: "PRODUCT_IMAGES_VERIFY_FAILED" });
    }
    if (isPublished(product)) {
      throw new HaravanApiError("Product became published before verification completed.", {
        code: "PRODUCT_DRAFT_STATE_INVALID",
      });
    }
    return { product, imageCount: images.length };
  }

  async createProduct(input) {
    const batchId = String(input.batch_id ?? `product-${this.now().getTime()}`);

    // Validate all local input before the first Haravan write.
    const product = prepareProductPayload(input.product);
    const images = await validateProductImages(input.image_paths);
    await this.assertProductIsUnique(product);

    const draft = await this.createProductDraft(product);
    const draftId = resourceId(draft);
    if (!draftId) throw new HaravanApiError("Haravan did not return a product ID after draft creation.");
    this.log({ batch_id: batchId, event: "product_draft_created", resource_id: draftId, http_status: 201 });

    let uploadedImageCount = 0;
    try {
      const variantGroups = this.variantIdsForImages(draft);
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const imagePayload = {
          attachment: image.attachment,
          filename: image.filename,
          alt: `${product.title} - ${draft?.variants?.[index]?.option1 ?? `image ${index + 1}`}`,
          position: index + 1,
        };
        if (variantGroups[index]?.length) imagePayload.variant_ids = variantGroups[index];

        await this.client.post(`/com/products/${encodeURIComponent(draftId)}/images.json`, {
          image: imagePayload,
        });
        uploadedImageCount += 1;
      }

      const verification = await this.verifyProduct(draftId, product);
      const publishedAt = this.now().toISOString();
      const productEndpoint = `/com/products/${encodeURIComponent(draftId)}.json`;
      await this.client.put(productEndpoint, {
        product: { id: draftId, published: true, published_at: publishedAt },
      });
      const { data: publishedData } = await this.client.get(productEndpoint);
      const published = unwrap(publishedData, "product");
      if (!isPublished(published)) {
        throw new HaravanApiError("Product publish verification failed.", {
          code: "PRODUCT_PUBLISH_VERIFY_FAILED",
          resourceId: draftId,
        });
      }

      this.knownHandles.add(product.handle);
      product.variants.forEach((variant) => this.knownSkus.add(variant.sku.toLowerCase()));
      const domain = await this.ensureShopDomain();
      const storefrontUrl = domain ? `https://${domain}/products/${product.handle}` : null;
      this.log({ batch_id: batchId, event: "product_published", resource_id: draftId, http_status: 200 });
      return {
        batch_id: batchId,
        status: "published",
        id: draftId,
        title: product.title,
        handle: product.handle,
        storefront_url: storefrontUrl,
        option_count: product.options.length,
        variant_count: product.variants.length,
        image_count: verification.imageCount,
        images: images.map((image) => ({ width: image.width, height: image.height, bytes: image.bytes })),
      };
    } catch (error) {
      error.resourceId = error.resourceId ?? draftId;
      this.log({
        batch_id: batchId,
        event: "product_draft_retained",
        resource_id: draftId,
        http_status: error.status,
        error_code: error.code,
      });
      if (isAuthError(error)) throw error;
      return {
        batch_id: batchId,
        status: "draft-retained",
        id: draftId,
        title: product.title,
        handle: product.handle,
        storefront_url: null,
        option_count: product.options.length,
        variant_count: product.variants.length,
        image_count: uploadedImageCount,
        error: toSafeError(error),
      };
    }
  }
}
