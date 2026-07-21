import { NextRequest } from "next/server";

// ─── Upstash Redis-backed rate limiter (production) ─────────────────────────
// Uses @upstash/ratelimit for globally-consistent limits across serverless
// instances. Falls back to the in-process store when UPSTASH_REDIS_REST_URL
// is not set (local dev, or if Redis is not yet configured).
//
// To enable Redis:
//   1. Create a free Redis database at https://console.upstash.com
//   2. Copy the REST URL and token into your .env:
//        UPSTASH_REDIS_REST_URL="https://..."
//        UPSTASH_REDIS_REST_TOKEN="..."
//   3. Deploy / restart the server — limits will now be globally enforced.
// ─────────────────────────────────────────────────────────────────────────────

let redisRatelimiter: ((key: string, limit: number, windowMs: number) => Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }>) | null = null;

// Lazily initialise the Redis limiter only when env vars are present.
// This prevents import errors in local dev environments without Redis.
async function getRedisLimiter() {
  if (redisRatelimiter) return redisRatelimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({ url, token });

    redisRatelimiter = async (key: string, limit: number, windowMs: number) => {
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        prefix: "nacoss_rl",
      });

      const result = await ratelimit.limit(key);
      const retryAfterMs = result.reset - Date.now();
      return {
        success: result.success,
        remaining: result.remaining,
        retryAfterSeconds: result.success ? 0 : Math.ceil(retryAfterMs / 1000),
      };
    };

    return redisRatelimiter;
  } catch {
    // Redis unavailable — fall through to in-memory limiter
    return null;
  }
}

// ─── In-process fallback rate limiter ───────────────────────────────────────
// Still useful for local dev and for bursty attacks on the same warm instance.

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

// Purge stale entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { success: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  record.timestamps.push(now);
  return { success: true, remaining: limit - record.timestamps.length, retryAfterSeconds: 0 };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Gets client IP address from standard proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Checks a sliding-window rate limit for the given key.
 * Uses Upstash Redis when configured, falls back to in-process memory store.
 *
 * @param key    Unique key, e.g. `voter-register:192.168.1.1`
 * @param limit  Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; retryAfterSeconds: number }> {
  const redisLimiter = await getRedisLimiter();
  if (redisLimiter) {
    return redisLimiter(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
