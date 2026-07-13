import type { VercelRequest } from '@vercel/node';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 20;

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0] ?? 'unknown';
  return req.socket?.remoteAddress ?? 'unknown';
}

async function checkKvLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { kv } = await import('@vercel/kv');
    const bucketKey = `tnf:ratelimit:${key}`;
    const current = await kv.get<number>(bucketKey);
    const count = current ?? 0;
    if (count >= MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }
    const next = count + 1;
    if (count === 0) {
      await kv.set(bucketKey, next, { px: WINDOW_MS });
    } else {
      await kv.incr(bucketKey);
    }
    return { allowed: true, remaining: Math.max(0, MAX_REQUESTS - next) };
  } catch {
    return checkMemoryLimit(key);
  }
}

function checkMemoryLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (bucket.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - bucket.count };
}

export async function enforceRateLimit(req: VercelRequest): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const ip = getClientIp(req);
  const hasKv = Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  );
  if (hasKv) return checkKvLimit(ip);
  return checkMemoryLimit(ip);
}
