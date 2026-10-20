export function redact(value) {
  let text = String(value ?? "Unknown error")
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/("?(?:access_)?token"?\s*[:=]\s*")[^"]+(")/gi, "$1[REDACTED]$2")
    .replace(/([?&](?:access_)?token=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/("attachment"\s*:\s*")[^"]+(")/gi, "$1[REDACTED]$2");
  return text.slice(0, 500);
}

export class ContentManagerError extends Error {
  constructor(message, options = {}) {
    super(redact(message), options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code ?? "CONTENT_MANAGER_ERROR";
    this.status = options.status ?? null;
    this.resourceId = options.resourceId ?? null;
    this.retryable = Boolean(options.retryable);
  }
}

export class ConfigurationError extends ContentManagerError {
  constructor(message) {
    super(message, { code: "CONFIGURATION_ERROR" });
  }
}

export class InputValidationError extends ContentManagerError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "VALIDATION_ERROR" });
  }
}

export class DuplicateResourceError extends ContentManagerError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "DUPLICATE_RESOURCE" });
  }
}

export class HaravanApiError extends ContentManagerError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "HARAVAN_API_ERROR" });
  }
}

export class HaravanAuthError extends HaravanApiError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "HARAVAN_AUTH_ERROR" });
  }
}

export class RequestTimeoutError extends HaravanApiError {
  constructor(message, options = {}) {
    super(message, { ...options, code: "HARAVAN_TIMEOUT", retryable: true });
  }
}

export function isAuthError(error) {
  return error instanceof HaravanAuthError || error?.status === 401 || error?.status === 403;
}

export function toSafeError(error) {
  return {
    code: error?.code ?? "UNEXPECTED_ERROR",
    message: redact(error?.message),
    status: Number.isInteger(error?.status) ? error.status : null,
    resource_id: error?.resourceId ? String(error.resourceId) : null,
    retryable: Boolean(error?.retryable),
  };
}
