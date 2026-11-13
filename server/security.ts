import crypto from 'crypto';
import type { Request } from 'express';

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const VALID_ORDER_STATUSES = [
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'delayed'
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

const KITCHEN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['accepted', 'preparing', 'delayed'],
  accepted: ['preparing', 'delayed'],
  preparing: ['ready', 'delayed'],
  delayed: ['accepted', 'preparing', 'ready'],
  ready: ['completed'],
  completed: [],
  cancelled: []
};

export function isValidKitchenTransition(currentStatus: string, nextStatus: string): boolean {
  if (!VALID_ORDER_STATUSES.includes(currentStatus as OrderStatus)) return false;
  if (!VALID_ORDER_STATUSES.includes(nextStatus as OrderStatus)) return false;
  const allowed = KITCHEN_TRANSITIONS[currentStatus as OrderStatus];
  return allowed.includes(nextStatus as OrderStatus);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function generateOrderId(): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KA-${timePart}${randPart}`;
}

export function generatePickupCode(): string {
  return `PK-${crypto.randomInt(100000, 1000000)}`;
}

export function isValidId(value: unknown, maxLen = 64): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= maxLen &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const clean = value.trim();
  if (clean.length < 4 || clean.length > 12) return false;
  // Matches "12:45", "1:05 PM", "01:00 PM", "9:30 AM", etc.
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/i);
  if (!match) return false;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3];
  if (minute < 0 || minute > 59) return false;
  if (ampm) {
    return hour >= 1 && hour <= 12;
  }
  return hour >= 0 && hour <= 23;
}

export function parsePositiveInt(value: unknown, min: number, max: number): number | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < min || value > max) return null;
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = parseInt(value.trim(), 10);
    if (parsed >= min && parsed <= max) return parsed;
  }
  return null;
}

export function parsePositiveNumber(value: unknown, min: number, max: number): number | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return Math.round(num * 100) / 100;
}

export function isValidImageUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > 500) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

export function shouldUseSecureCookie(req: Request): boolean {
  if (isHttpsRequest(req)) return true;
  if (process.env.NODE_ENV === 'production') {
    const host = (req.hostname || '').toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1';
  }
  return false;
}

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ]);

  const addUrl = (raw?: string) => {
    if (!raw) return;
    try {
      const parsed = new URL(raw.trim());
      origins.add(parsed.origin);
    } catch {
      // Ignore placeholder values like "MY_APP_URL"
    }
  };

  addUrl(process.env.APP_URL);

  if (process.env.NG_ALLOWED_HOSTS) {
    for (const host of process.env.NG_ALLOWED_HOSTS.split(',')) {
      const clean = host.trim();
      if (clean) {
        origins.add(`https://${clean}`);
        origins.add(`http://${clean}`);
      }
    }
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const entry of process.env.ALLOWED_ORIGINS.split(',')) {
      addUrl(entry);
    }
  }

  return origins;
}

export function isOriginAllowed(origin: string | undefined, requestHost?: string): boolean {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (requestHost && parsed.host.toLowerCase() === requestHost.toLowerCase()) {
      return true;
    }
    return getAllowedOrigins().has(parsed.origin);
  } catch {
    return false;
  }
}

export class RateLimiter {
  private buckets = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastCleanup = Date.now();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    if (now - this.lastCleanup > this.windowMs) {
      this.cleanup(now);
    }
    const cutoff = now - this.windowMs;
    const timestamps = (this.buckets.get(key) || []).filter(ts => ts > cutoff);

    if (timestamps.length >= this.maxRequests) {
      this.buckets.set(key, timestamps);
      const oldest = timestamps[0];
      const retryAfterMs = Math.max(1000, oldest + this.windowMs - now);
      return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private cleanup(now: number) {
    const cutoff = now - this.windowMs;
    for (const [key, timestamps] of this.buckets.entries()) {
      const valid = timestamps.filter(ts => ts > cutoff);
      if (valid.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, valid);
      }
    }
    this.lastCleanup = now;
  }
}
