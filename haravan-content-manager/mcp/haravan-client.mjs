import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  ConfigurationError,
  HaravanApiError,
  HaravanAuthError,
  RequestTimeoutError,
  redact,
} from "./errors.mjs";

const DEFAULT_API_BASE = "https://apis.haravan.com";
const TOKEN_PLACEHOLDER = "${HARAVAN_ACCESS_TOKEN}";
const execFileAsync = promisify(execFile);

function normalizeToken(value) {
  const token = String(value ?? "").trim();
  return token && token !== TOKEN_PLACEHOLDER ? token : "";
}

export async function readHaravanTokenFromEnvironment(options = {}) {
  const processEnvironmentProvider = options.processEnvironmentProvider
    ?? (() => process.env.HARAVAN_ACCESS_TOKEN);
  const processToken = normalizeToken(processEnvironmentProvider());
  if (processToken) return processToken;

  const platform = options.platform ?? process.platform;
  const execute = options.execute ?? execFileAsync;
  if (platform !== "win32") return "";

  try {
    const { stdout } = await execute("reg.exe", [
      "query",
      "HKCU\\Environment",
      "/v",
      "HARAVAN_ACCESS_TOKEN",
    ], {
      encoding: "utf8",
      maxBuffer: 4096,
      timeout: 5000,
      windowsHide: true,
    });
    const match = String(stdout ?? "").match(/HARAVAN_ACCESS_TOKEN\s+REG_\w+\s+(.+)/i);
    return normalizeToken(match?.[1]);
  } catch {
    return "";
  }
}

export function createSessionTokenProvider(options = {}) {
  const environmentProvider = options.environmentProvider ?? readHaravanTokenFromEnvironment;
  let sessionToken = "";

  return {
    clear() {
      sessionToken = "";
    },
    async getToken() {
      if (!sessionToken) sessionToken = normalizeToken(await environmentProvider());
      return sessionToken;
    },
  };
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class RateLimiter {
  constructor(options = {}) {
    const maxPerSecond = options.maxPerSecond ?? 3;
    this.intervalMs = Math.ceil(1000 / maxPerSecond);
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
    this.nextAllowedAt = 0;
    this.cooldownUntil = 0;
    this.tail = Promise.resolve();
    this.lastCallLimit = null;
  }

  async acquire() {
    const turn = this.tail.then(async () => {
      const waitUntil = Math.max(this.nextAllowedAt, this.cooldownUntil);
      const delay = Math.max(0, waitUntil - this.now());
      if (delay > 0) await this.sleep(delay);
      this.nextAllowedAt = Math.max(waitUntil, this.now()) + this.intervalMs;
    });
    this.tail = turn.catch(() => {});
    return turn;
  }

  observe(headers) {
    const raw = headers?.get?.("x-haravan-api-call-limit");
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(raw ?? "");
    if (!match) return;

    const used = Number(match[1]);
    const capacity = Number(match[2]);
    this.lastCallLimit = { used, capacity };
    if (capacity - used <= 2) {
      this.cooldownUntil = Math.max(this.cooldownUntil, this.now() + this.intervalMs * 2);
    }
  }
}

function parseRetryAfter(value) {
  if (!value) return 1000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds * 1000));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 1000;
}

function extractApiMessage(data, status) {
  if (!data || typeof data !== "object") return `Haravan API returned HTTP ${status}.`;
  const candidate = data.message ?? data.error ?? data.errors;
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object") {
    const safeEntries = Object.entries(candidate)
      .slice(0, 10)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
    if (safeEntries.length) return safeEntries.join("; ");
  }
  return `Haravan API returned HTTP ${status}.`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

export class HaravanClient {
  constructor(options = {}) {
    this.apiBase = options.apiBase ?? DEFAULT_API_BASE;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.tokenProvider = options.tokenProvider ?? createSessionTokenProvider({
      environmentProvider: options.environmentProvider,
    });
    this.rateLimiter = options.rateLimiter ?? new RateLimiter({ maxPerSecond: 3 });
    this.sleep = options.sleep ?? defaultSleep;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.max429Retries = options.max429Retries ?? 3;

    if (typeof this.fetch !== "function") {
      throw new ConfigurationError("A Fetch API implementation is required.");
    }
  }

  async getToken() {
    const value = typeof this.tokenProvider === "function"
      ? await this.tokenProvider()
      : await this.tokenProvider.getToken();
    const token = normalizeToken(value);
    if (!token) {
      throw new ConfigurationError(
        "No Haravan access token is available. Run set-haravan-token.cmd locally, then retry check_connection.",
      );
    }
    return token;
  }

  clearToken() {
    this.tokenProvider?.clear?.();
  }

  buildUrl(endpoint, query = {}) {
    const url = new URL(endpoint, this.apiBase);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
    return url;
  }

  async request(endpoint, options = {}) {
    const method = options.method ?? "GET";
    const url = this.buildUrl(endpoint, options.query);
    const attempts = options.max429Retries ?? this.max429Retries;

    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      await this.rateLimiter.acquire();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
      let response;

      try {
        const token = await this.getToken();
        response = await this.fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "haravan-content-manager/0.1.0",
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof ConfigurationError) throw error;
        if (error?.name === "AbortError") {
          throw new RequestTimeoutError(`Haravan ${method} request timed out.`, { cause: error });
        }
        throw new HaravanApiError(`Haravan ${method} request failed: ${redact(error?.message)}`, {
          cause: error,
          retryable: method === "GET",
        });
      }

      clearTimeout(timeout);
      this.rateLimiter.observe(response.headers);
      const data = await readResponseBody(response);

      if (response.status === 429 && attempt < attempts) {
        await this.sleep(parseRetryAfter(response.headers.get("retry-after")));
        continue;
      }

      if (!response.ok) {
        const message = extractApiMessage(data, response.status);
        if (response.status === 401 || response.status === 403) {
          this.clearToken();
          throw new HaravanAuthError(message, { status: response.status });
        }
        throw new HaravanApiError(message, {
          status: response.status,
          code: response.status === 422 ? "HARAVAN_VALIDATION_ERROR" : "HARAVAN_API_ERROR",
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      return { data, status: response.status, headers: response.headers };
    }

    throw new HaravanApiError("Haravan rate limit retry budget was exhausted.", {
      status: 429,
      code: "HARAVAN_RATE_LIMITED",
      retryable: true,
    });
  }

  get(endpoint, query) {
    return this.request(endpoint, { method: "GET", query });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: "POST", body });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: "PUT", body });
  }
}
