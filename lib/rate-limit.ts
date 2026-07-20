import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// ⚠️ IMPORTANT — SERVERLESS LIMITATION:
// This rate limiter stores state in Node.js process memory (a Map).
// On serverless platforms (Vercel, AWS Lambda), each function invocation
// may run in a DIFFERENT container with its own isolated memory, so rate
// limit counters are NOT shared across instances.
//
// For production deployments at scale, replace this with a Redis-backed
// solution (e.g. Upstash Redis + @upstash/ratelimit, or Vercel KV)
// so that limits are enforced globally across all function instances.
//
// This in-process limiter still provides meaningful protection against
// single-IP attacks on the same instance (e.g., during development or
// when function instances are warmed and reused).
const memoryStore = new Map<string, RateLimitRecord>();

// Clean up expired timestamps periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Gets client IP address from standard headers (x-forwarded-for, x-real-ip)
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Checks sliding window rate limit for a key (IP or key combination).
 * @param key Unique identifier (e.g., `voter-login:192.168.1.1`)
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
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

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}
