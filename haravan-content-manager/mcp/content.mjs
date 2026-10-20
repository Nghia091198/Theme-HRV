import sanitizeHtml from "sanitize-html";

import { InputValidationError } from "./errors.mjs";

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "details",
  "div",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "hr",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "summary",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

const SAFE_STYLE_RULES = {
  "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
  "border": [/^[\d.]+(px|rem)\s+(solid|dashed)\s+(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\))$/i],
  "border-radius": [/^\d+(\.\d+)?(px|rem|%)$/i],
  "color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
  "font-style": [/^(normal|italic)$/i],
  "font-weight": [/^(normal|bold|[1-9]00)$/i],
  "margin": [/^[\d.\s-]+(px|rem|em|%)?$/i],
  "max-width": [/^\d+(\.\d+)?(px|rem|%)$/i],
  "padding": [/^[\d.\s-]+(px|rem|em|%)?$/i],
  "text-align": [/^(left|right|center|justify)$/i],
  "width": [/^\d+(\.\d+)?(px|rem|%)$/i],
};

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "style", "aria-label"],
    "*": ["style"],
    td: ["colspan", "rowspan", "style"],
    th: ["colspan", "rowspan", "scope", "style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { a: ["http", "https", "mailto", "tel"] },
  allowProtocolRelative: false,
  allowedStyles: { "*": SAFE_STYLE_RULES },
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === "_blank") {
        return {
          tagName,
          attribs: { ...attribs, rel: "noopener noreferrer" },
        };
      }
      return { tagName, attribs };
    },
  },
};

export function sanitizeContentHtml(html, fieldName = "body_html") {
  if (typeof html !== "string" || !html.trim()) {
    throw new InputValidationError(`${fieldName} must be a non-empty HTML string.`);
  }

  const clean = sanitizeHtml(html, SANITIZE_OPTIONS).trim();
  const plainText = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!plainText) {
    throw new InputValidationError(`${fieldName} has no readable content after sanitization.`);
  }
  return clean;
}

export function normalizeHandle(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);

  if (!normalized) {
    throw new InputValidationError("handle must contain at least one letter or number.");
  }
  return normalized;
}

function normalizeText(value, fieldName, maxLength = 255) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new InputValidationError(`${fieldName} is required.`);
  }
  if (text.length > maxLength) {
    throw new InputValidationError(`${fieldName} must not exceed ${maxLength} characters.`);
  }
  return text;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).join(", ");
  }
  return String(tags ?? "").trim();
}

export function prepareArticlePayload(article) {
  const title = normalizeText(article?.title, "article.title");
  const bodyHtml = sanitizeContentHtml(article?.body_html, "article.body_html");
  const summaryHtml = article?.summary_html
    ? sanitizeContentHtml(article.summary_html, "article.summary_html")
    : "";

  return {
    title,
    handle: normalizeHandle(article?.handle ?? title),
    body_html: bodyHtml,
    summary_html: summaryHtml,
    tags: normalizeTags(article?.tags),
    author: String(article?.author ?? "").trim(),
    published: false,
    published_at: null,
  };
}

function normalizeOption(option, index) {
  const name = normalizeText(option?.name, `product.options[${index}].name`, 100);
  return { name, position: index + 1 };
}

function normalizeVariant(variant, index, optionCount) {
  const price = Number(variant?.price);
  const compareAt = variant?.compare_at_price === null || variant?.compare_at_price === undefined || variant?.compare_at_price === ""
    ? null
    : Number(variant.compare_at_price);
  const inventoryQuantity = Number(variant?.inventory_quantity ?? 0);
  const sku = normalizeText(variant?.sku, `product.variants[${index}].sku`, 255);

  if (!Number.isInteger(price) || price < 0) {
    throw new InputValidationError(`product.variants[${index}].price must be a non-negative integer VND value.`);
  }
  if (compareAt !== null && (!Number.isInteger(compareAt) || compareAt < price)) {
    throw new InputValidationError(`product.variants[${index}].compare_at_price must be an integer greater than or equal to price.`);
  }
  if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
    throw new InputValidationError(`product.variants[${index}].inventory_quantity must be a non-negative integer.`);
  }

  const normalized = {
    sku,
    price,
    inventory_quantity: inventoryQuantity,
    inventory_management: String(variant?.inventory_management ?? "haravan"),
    inventory_policy: String(variant?.inventory_policy ?? "deny"),
    requires_shipping: variant?.requires_shipping !== false,
    taxable: variant?.taxable !== false,
  };

  if (compareAt !== null) normalized.compare_at_price = compareAt;
  for (let optionIndex = 1; optionIndex <= optionCount; optionIndex += 1) {
    normalized[`option${optionIndex}`] = normalizeText(
      variant?.[`option${optionIndex}`],
      `product.variants[${index}].option${optionIndex}`,
      255,
    );
  }

  if (inventoryQuantity === 0 && (normalized.inventory_management !== "haravan" || normalized.inventory_policy !== "deny")) {
    throw new InputValidationError(
      `Sold-out variant ${sku} must use inventory_management "haravan" and inventory_policy "deny".`,
    );
  }

  return normalized;
}

export function prepareProductPayload(product) {
  const title = normalizeText(product?.title, "product.title");
  const rawOptions = Array.isArray(product?.options) ? product.options : [];
  const rawVariants = Array.isArray(product?.variants) ? product.variants : [];

  if (rawOptions.length < 1 || rawOptions.length > 3) {
    throw new InputValidationError("product.options must contain between 1 and 3 options.");
  }
  if (rawVariants.length < 1 || rawVariants.length > 100) {
    throw new InputValidationError("product.variants must contain between 1 and 100 variants.");
  }

  const options = rawOptions.map(normalizeOption);
  const optionNames = new Set(options.map((option) => option.name.toLowerCase()));
  if (optionNames.size !== options.length) {
    throw new InputValidationError("product option names must be unique.");
  }

  const variants = rawVariants.map((variant, index) => normalizeVariant(variant, index, options.length));
  const skus = variants.map((variant) => variant.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) {
    throw new InputValidationError("product variant SKUs must be unique.");
  }

  const combinations = variants.map((variant) =>
    options.map((_, index) => variant[`option${index + 1}`].toLowerCase()).join("\u0000"),
  );
  if (new Set(combinations).size !== combinations.length) {
    throw new InputValidationError("product variant option combinations must be unique.");
  }

  return {
    title,
    handle: normalizeHandle(product?.handle ?? title),
    body_html: sanitizeContentHtml(product?.body_html, "product.body_html"),
    vendor: normalizeText(product?.vendor, "product.vendor", 255),
    product_type: normalizeText(product?.product_type, "product.product_type", 255),
    tags: normalizeTags(product?.tags),
    options,
    variants,
    published: false,
    published_at: null,
  };
}

export function buildVariantMatrix(optionDefinitions, configuration = {}) {
  if (!Array.isArray(optionDefinitions) || optionDefinitions.length < 1 || optionDefinitions.length > 3) {
    throw new InputValidationError("Variant matrix requires between 1 and 3 option definitions.");
  }

  const values = optionDefinitions.map((option, index) => {
    if (!Array.isArray(option.values) || option.values.length < 1) {
      throw new InputValidationError(`Option ${index + 1} must include at least one value.`);
    }
    return option.values.map((value) => normalizeText(value, `option ${index + 1} value`, 100));
  });

  const combinations = values.reduce(
    (current, optionValues) => current.flatMap((combination) => optionValues.map((value) => [...combination, value])),
    [[]],
  );
  if (combinations.length > 100) {
    throw new InputValidationError("Variant matrix exceeds Haravan's 100 variant limit.");
  }

  const batchKey = normalizeHandle(configuration.batchKey ?? "demo").toUpperCase();
  const basePrice = Number(configuration.basePrice ?? 100000);
  const soldOut = Boolean(configuration.soldOut);

  return combinations.map((combination, index) => {
    const price = Math.round((basePrice + (index % 4) * 10000) / 1000) * 1000;
    const variant = {
      sku: `${batchKey}-${String(index + 1).padStart(3, "0")}`,
      price,
      inventory_management: "haravan",
      inventory_policy: "deny",
      inventory_quantity: soldOut ? 0 : index % 5,
    };
    combination.forEach((value, optionIndex) => {
      variant[`option${optionIndex + 1}`] = value;
    });
    return variant;
  });
}

export function validateBatchProductRules(products) {
  if (!Array.isArray(products) || products.length < 1) {
    throw new InputValidationError("A product batch must contain at least one product.");
  }

  const normalized = products.map(prepareProductPayload);
  const isSoldOut = (product) => product.variants.every((variant) => variant.inventory_quantity === 0);
  const isComplex = (product) => product.options.length === 3 && product.variants.length >= 12 && product.variants.length <= 24;

  if (normalized.length === 1) {
    if (!isSoldOut(normalized[0]) || !isComplex(normalized[0])) {
      throw new InputValidationError("A single-product batch must be fully sold out with 3 options and 12-24 variants.");
    }
    const prices = new Set(normalized[0].variants.map((variant) => variant.price));
    if (prices.size < 2) {
      throw new InputValidationError("A single-product batch must include varied variant prices.");
    }
    return normalized;
  }

  if (!normalized.some(isSoldOut)) {
    throw new InputValidationError("A multi-product batch must include at least one fully sold-out product.");
  }
  if (!normalized.some(isComplex)) {
    throw new InputValidationError("A multi-product batch must include a 3-option product with 12-24 variants.");
  }
  return normalized;
}
