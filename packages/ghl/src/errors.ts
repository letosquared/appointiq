/** Error thrown for non-2xx responses from the GHL API (live or sandbox). */
export class GhlApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusCode?: number,
    readonly path?: string,
    readonly body?: unknown,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'GhlApiError';
    this.status = status ?? statusCode ?? 0;
  }
}

/** Raised when the transport itself fails (network, DNS, timeouts). */
export class GhlTransportError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'GhlTransportError';
  }
}

/** Raised when required configuration (e.g. API key for live mode) is missing. */
export class GhlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhlConfigError';
  }
}
