import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Limitadores de tasa serverless-friendly (HTTP, sin conexión persistente).
 *
 * Si las variables de entorno UPSTASH_* no están configuradas, los limiters
 * se inicializan en modo no-op (siempre permiten) — útil en desarrollo local
 * sin cuenta Upstash. En producción son obligatorias.
 */

const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstash ? Redis.fromEnv() : null;

function makeLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) {
    return {
      limit: async () => ({
        success: true,
        limit: tokens,
        remaining: tokens,
        reset: Date.now() + 60_000,
      }),
    };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: "foroprime",
  });
}

export const limiters = {
  auth: makeLimiter(5, "1 m"),
  createPost: makeLimiter(10, "1 h"),
  createComment: makeLimiter(30, "1 h"),
  vote: makeLimiter(60, "1 m"),
  search: makeLimiter(30, "1 m"),
  updateProfile: makeLimiter(10, "1 h"),
};

export type LimiterKey = keyof typeof limiters;

/**
 * Aplica el limiter dado. Lanza Error si excede.
 * El identifier debe ser estable y único por solicitante (ej: `${ip}:${userId}`).
 */
export async function enforceLimit(key: LimiterKey, identifier: string): Promise<void> {
  const result = await limiters[key].limit(identifier);
  if (!result.success) {
    throw new Error("rate_limited");
  }
}
