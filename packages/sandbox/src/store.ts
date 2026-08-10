import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Redis } from '@upstash/redis';

/**
 * The sandbox persists whole collections as single keys behind a tiny KV
 * interface. That keeps every backend (memory / file / Upstash Redis) identical
 * and trivially swap-able at demo scale, and it lets the router treat the store
 * as an append-only journal of collections. A production GHL replica would shard
 * per entity — the interface here is deliberately small so that swap stays easy.
 */
export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface Store {
  readonly kind: 'memory' | 'file' | 'upstash';
  /** Read a whole collection (array) or undefined if never written. */
  getCollection<T>(name: string): Promise<T[] | undefined>;
  /** Write a whole collection. */
  putCollection<T>(name: string, value: T[]): Promise<void>;
  /** Create-or-replace a collection. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

export function collections(): string[] {
  return ['contacts', 'customFields', 'calendars', 'appointments', 'workflows', 'webhooks', 'events', 'meta', 'runs', 'outbox'];
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private readonly data = new Map<string, unknown>();

  async getCollection<T>(name: string): Promise<T[] | undefined> {
    return this.data.get(name) as T[] | undefined;
  }

  async putCollection<T>(name: string, value: T[]): Promise<void> {
    this.data.set(name, structuredClone(value));
  }

  async reset(): Promise<void> {
    this.data.clear();
  }

  async close(): Promise<void> {}
}

/* ------------------------------------------------------------------ */
/* File (local dev / CI)                                               */
/* ------------------------------------------------------------------ */

export interface FileStoreOptions {
  /** Directory where the JSON "database" lives. Defaults to `.sandbox-data`. */
  dir?: string;
}

export class FileStore implements Store {
  readonly kind = 'file' as const;
  private readonly dir: string;

  constructor(opts: FileStoreOptions = {}) {
    this.dir = opts.dir ?? join(process.cwd(), '.sandbox-data');
  }

  async getCollection<T>(name: string): Promise<T[] | undefined> {
    // Read fresh from disk on every call so separate module instances (Next dev
    // compiles each route bundle in isolation) always see the same state.
    const file = join(this.dir, `${name}.json`);
    try {
      const raw = await readFile(file, 'utf8');
      return JSON.parse(raw) as T[];
    } catch {
      return undefined;
    }
  }

  async putCollection<T>(name: string, value: T[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, `${name}.json`), JSON.stringify(value, null, 2), 'utf8');
  }

  async reset(): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.rm(this.dir, { recursive: true, force: true });
    await fs.mkdir(this.dir, { recursive: true });
  }

  async close(): Promise<void> {}
}

/* ------------------------------------------------------------------ */
/* Upstash Redis (Vercel)                                              */
/* ------------------------------------------------------------------ */

const PREFIX = 'appointiq:sandbox:';

export interface UpstashStoreOptions {
  url?: string;
  token?: string;
  prefix?: string;
}

export class UpstashStore implements Store {
  readonly kind = 'upstash' as const;
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(opts: UpstashStoreOptions = {}) {
    const url = opts.url ?? process.env.KV_REST_API_URL;
    const token = opts.token ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) {
      throw new Error('UpstashStore requires KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    this.redis = new Redis({ url, token });
    this.prefix = opts.prefix ?? PREFIX;
  }

  async getCollection<T>(name: string): Promise<T[] | undefined> {
    const value = await this.redis.get<T[]>(`${this.prefix}${name}`);
    return value ?? undefined;
  }

  async putCollection<T>(name: string, value: T[]): Promise<void> {
    await this.redis.set(`${this.prefix}${name}`, value as T[]);
  }

  async reset(): Promise<void> {
    const keys = collections().map((name) => `${this.prefix}${name}`);
    if (keys.length) await this.redis.del(...keys);
  }

  async close(): Promise<void> {}
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export type StoreBackend = 'memory' | 'file' | 'upstash';

export interface CreateStoreOptions {
  backend?: StoreBackend;
  /** Used by the file backend. */
  dir?: string;
  /** Used by the upstash backend. */
  url?: string;
  token?: string;
}

export function createStore(opts: CreateStoreOptions = {}): Store {
  const backend = opts.backend ?? process.env.SANDBOX_STORE ?? 'memory';
  switch (backend) {
    case 'memory':
      return new MemoryStore();
    case 'file':
      return new FileStore({ dir: opts.dir });
    case 'upstash':
      return new UpstashStore({ url: opts.url, token: opts.token });
    default:
      throw new Error(`Unknown store backend: ${backend}`);
  }
}

/** Small helper for tests: rebuild an in-memory store seeded with a dataset. */
export async function seedStore(store: Store, dataset: Record<string, unknown[]>): Promise<void> {
  await store.reset();
  for (const [name, rows] of Object.entries(dataset)) {
    await store.putCollection(name, rows as never[]);
  }
}
