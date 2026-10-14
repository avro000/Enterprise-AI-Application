/**
 * Production-Grade In-Memory SWR (Stale-While-Revalidate) & LRU Cache
 *
 * Implements:
 * 1. Instant 0ms synchronous hydration from memory on tab switches (eliminates loading spinners).
 * 2. Stale-While-Revalidate background re-fetching when data is older than staleThreshold.
 * 3. In-flight request deduplication (prevents duplicate simultaneous HTTP calls for the same query).
 * 4. Adaptive Least-Recently-Used (LRU) eviction and TTL garbage collection to bound memory usage.
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  fetchedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  ttlMs: number;
}

export class SwrLruCache {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<any>>();
  private maxEntries: number;
  private defaultTtlMs: number;
  private staleThresholdMs: number;
  private cleanupTimer: any;

  constructor(options?: {
    maxEntries?: number;
    defaultTtlMs?: number;
    staleThresholdMs?: number;
  }) {
    this.maxEntries = options?.maxEntries ?? 50; // Maximum cached queries
    this.defaultTtlMs = options?.defaultTtlMs ?? 3 * 60 * 1000; // 3-minute balanced TTL
    this.staleThresholdMs = options?.staleThresholdMs ?? 30 * 1000; // 30s fresh window before SWR

    // Background garbage collection every 60 seconds
    if (typeof window !== "undefined") {
      this.cleanupTimer = setInterval(() => this.purgeExpired(), 60 * 1000);
    }
  }

  public get<T = any>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.fetchedAt;

    // Hard expired?
    if (age > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats for LRU tracking
    entry.lastAccessedAt = now;
    entry.accessCount += 1;

    // Check if stale (needs background revalidation)
    const isStale = age > this.staleThresholdMs;
    return { data: entry.data, isStale };
  }

  public set<T = any>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;

    // If already exists, update
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.data = data;
      entry.fetchedAt = now;
      entry.lastAccessedAt = now;
      entry.accessCount += 1;
      entry.ttlMs = ttl;
      return;
    }

    // If capacity reached, evict the Least Recently Used (LRU) entry
    if (this.cache.size >= this.maxEntries) {
      this.evictLru();
    }

    this.cache.set(key, {
      key,
      data,
      fetchedAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      ttlMs: ttl,
    });
  }

  public invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        // Mark as expired so the next access revalidates immediately
        const entry = this.cache.get(key);
        if (entry) {
          entry.fetchedAt = 0; // Force stale
        }
      }
    }
  }

  public evict(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  public async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.fetchedAt > entry.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global singleton cache instance
export const globalQueryCache = new SwrLruCache({
  maxEntries: 60,
  defaultTtlMs: 3 * 60 * 1000, // 3 minutes balanced TTL
  staleThresholdMs: 25 * 1000, // 25 seconds fresh threshold
});
