import { GhlApiError, GhlConfigError, GhlTransportError } from './errors';

/** A single HTTP-like request understood by every GHL transport. */
export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path relative to the API base, e.g. `/contacts` or `/contacts/{id}/tags`. */
  path: string;
  query?: Record<string, string | number | boolean | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

/** Anything that can serve the GHL contract — the real API or the sandbox. */
export interface Transport {
  request(opts: HttpRequestOptions): Promise<HttpResponse>;
}

export interface HttpTransportOptions {
  baseUrl: string;
  apiKey?: string;
  /** Extra headers sent on every request (e.g. custom version overrides). */
  headers?: Record<string, string>;
  /** Default version header per path prefix (GHL requires a Version header). */
  versions?: Record<string, string>;
  fetchImpl?: typeof fetch;
  /** Max retries for idempotent requests that fail with 429/5xx. Default 3. */
  maxRetries?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const IDEMPOTENT = new Set(['GET', 'PUT', 'DELETE', 'PATCH']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Talks to the real GoHighLevel API (services.leadconnectorhq.com) or any
 * URL that speaks the same contract, including a locally-mounted sandbox.
 */
export class HttpTransport implements Transport {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly versions: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;

  constructor(opts: HttpTransportOptions) {
    if (!opts.baseUrl) throw new GhlConfigError('HttpTransport requires a baseUrl');
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.extraHeaders = opts.headers ?? {};
    this.versions = opts.versions ?? {};
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  async request(opts: HttpRequestOptions): Promise<HttpResponse> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...this.extraHeaders,
      ...opts.headers,
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const version = this.versionFor(opts.path);
    if (version && !headers.Version) headers.Version = version;

    const init: RequestInit = {
      method: opts.method,
      headers,
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    const attempts = IDEMPOTENT.has(opts.method) ? this.maxRetries + 1 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(2 ** attempt * 150);
      try {
        const res = await this.fetchImpl(url, init);
        const text = await res.text();
        let body: unknown = null;
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
        if (!res.ok) {
          if (RETRYABLE_STATUS.has(res.status) && attempt < attempts - 1) {
            lastError = new GhlApiError(`HTTP ${res.status}`, res.status, undefined, opts.path, body);
            continue;
          }
          throw new GhlApiError(
            typeof body === 'string' || typeof body === 'object' && body !== null
              ? describeError(body, res.status, opts.path)
              : `HTTP ${res.status} on ${opts.method} ${opts.path}`,
            res.status,
            undefined,
            opts.path,
            body,
          );
        }
        return { status: res.status, body };
      } catch (err) {
        if (err instanceof GhlApiError) throw err;
        lastError = err;
        if (attempt >= attempts - 1) {
          throw new GhlTransportError(`Request to ${url} failed: ${String(err)}`, err, opts.path);
        }
      }
    }
    throw new GhlTransportError(`Request to ${url} failed after retries`, lastError, opts.path);
  }

  private buildUrl(
    path: string,
    query?: HttpRequestOptions['query'],
  ): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === '') continue;
        if (Array.isArray(value)) {
          value.forEach((v) => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private versionFor(path: string): string | undefined {
    for (const [prefix, version] of Object.entries(this.versions)) {
      if (path.startsWith(prefix)) return version;
    }
    return undefined;
  }
}

function describeError(body: unknown, status: number, path?: string): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    const msg = b.message ?? b.error ?? b.detail;
    if (msg) return String(msg);
  }
  return `HTTP ${status} on ${path ?? 'unknown path'}`;
}
