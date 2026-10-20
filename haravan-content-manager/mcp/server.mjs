import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { HaravanContentService } from "./service.mjs";
import { toSafeError } from "./errors.mjs";

const articleSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z.string().min(1).max(255),
  body_html: z.string().min(1),
  summary_html: z.string().optional(),
  author: z.string().max(255).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  image_alt: z.string().max(500).optional(),
});

const optionSchema = z.object({
  name: z.string().min(1).max(100),
});

const variantSchema = z.object({
  sku: z.string().min(1).max(255),
  price: z.number().int().nonnegative(),
  compare_at_price: z.number().int().nonnegative().nullable().optional(),
  inventory_quantity: z.number().int().nonnegative(),
  inventory_management: z.string().optional(),
  inventory_policy: z.string().optional(),
  option1: z.string().min(1),
  option2: z.string().min(1).optional(),
  option3: z.string().min(1).optional(),
  requires_shipping: z.boolean().optional(),
  taxable: z.boolean().optional(),
});

const productSchema = z.object({
  title: z.string().min(1).max(255),
  handle: z.string().min(1).max(255),
  body_html: z.string().min(1),
  vendor: z.string().min(1).max(255),
  product_type: z.string().min(1).max(255),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  options: z.array(optionSchema).min(1).max(3),
  variants: z.array(variantSchema).min(1).max(100),
});

function resultContent(result, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError,
  };
}

function errorResult(error) {
  return resultContent({ ok: false, error: toSafeError(error) }, true);
}

async function runTool(action) {
  try {
    return resultContent({ ok: true, result: await action() });
  } catch (error) {
    return errorResult(error);
  }
}

export function createServer(options = {}) {
  const service = options.service ?? new HaravanContentService();
  const server = new McpServer({
    name: "haravan-content-manager",
    version: "0.1.0",
  });

  server.registerTool("check_connection", {
    title: "Check Haravan connection",
    description: "Validate the temporary token configured by the local helper and return non-sensitive shop information.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  }, async () => runTool(() => service.checkConnection({ refreshToken: true })));

  server.registerTool("list_blogs", {
    title: "List Haravan blogs",
    description: "List available Haravan blogs with IDs, names, and handles.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  }, async () => runTool(() => service.listBlogs()));

  server.registerTool("create_article", {
    title: "Create and publish a Haravan article",
    description: "Create an unpublished article, upload and verify its local JPEG cover, then publish it.",
    inputSchema: {
      batch_id: z.string().min(1).max(80).optional(),
      blog_id: z.union([z.string().min(1), z.number().int().positive()]),
      article: articleSchema,
      image_path: z.string().min(1),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  }, async (input) => runTool(() => service.createArticle(input)));

  server.registerTool("create_product", {
    title: "Create and publish a Haravan product",
    description: "Create an unpublished product, upload three local JPEGs, verify options and variants, then publish it.",
    inputSchema: {
      batch_id: z.string().min(1).max(80).optional(),
      product: productSchema,
      image_paths: z.array(z.string().min(1)).length(3),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  }, async (input) => runTool(() => service.createProduct(input)));

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryPoint) {
  startServer().catch((error) => {
    const safe = toSafeError(error);
    process.stderr.write(`${JSON.stringify({ event: "server_start_failed", error_code: safe.code })}\n`);
    process.exitCode = 1;
  });
}
