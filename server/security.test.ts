import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  generateSessionToken,
  generateCsrfToken,
  hashSessionToken,
  timingSafeEqualStr,
  generateOrderId,
  generatePickupCode,
  isValidKitchenTransition,
  isValidTimeString,
  parsePositiveInt,
  parsePositiveNumber,
  isValidImageUrl,
  isValidId,
  isOriginAllowed,
  RateLimiter
} from './security';

test('session tokens are unpredictable, hashed with SHA-256, and timing-safe compared', () => {
  const t1 = generateSessionToken();
  const t2 = generateSessionToken();
  assert.equal(t1.length, 64);
  assert.equal(t2.length, 64);
  assert.notEqual(t1, t2);

  const h1 = hashSessionToken(t1);
  const h2 = hashSessionToken(t2);
  assert.equal(h1.length, 64);
  assert.notEqual(h1, t1);
  assert.notEqual(h1, h2);
  assert.equal(hashSessionToken(t1), h1);

  const csrf = generateCsrfToken();
  assert.equal(csrf.length, 48);
  assert.equal(timingSafeEqualStr(csrf, csrf), true);
  assert.equal(timingSafeEqualStr(csrf, csrf.slice(0, -1) + (csrf.endsWith('a') ? 'b' : 'a')), false);
  assert.equal(timingSafeEqualStr(csrf, 'short'), false);
});

test('order ID and pickup code generation produce unique formatted identifiers', () => {
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const id = generateOrderId();
    const code = generatePickupCode();
    assert.match(id, /^KA-[A-Z0-9]{10}$/);
    assert.match(code, /^PK-\d{6}$/);
    ids.add(id);
    codes.add(code);
  }
  assert.equal(ids.size, 200);
  assert.ok(codes.size >= 195);
});

test('order status transitions enforce valid workflow and block terminal reversals', () => {
  assert.equal(isValidKitchenTransition('confirmed', 'accepted'), true);
  assert.equal(isValidKitchenTransition('confirmed', 'preparing'), true);
  assert.equal(isValidKitchenTransition('accepted', 'preparing'), true);
  assert.equal(isValidKitchenTransition('preparing', 'ready'), true);
  assert.equal(isValidKitchenTransition('ready', 'completed'), true);
  assert.equal(isValidKitchenTransition('delayed', 'ready'), true);

  // Disallowed backward or terminal transitions
  assert.equal(isValidKitchenTransition('completed', 'confirmed'), false);
  assert.equal(isValidKitchenTransition('completed', 'preparing'), false);
  assert.equal(isValidKitchenTransition('cancelled', 'confirmed'), false);
  assert.equal(isValidKitchenTransition('cancelled', 'ready'), false);
  assert.equal(isValidKitchenTransition('ready', 'preparing'), false);
  assert.equal(isValidKitchenTransition('preparing', 'accepted'), false);
  assert.equal(isValidKitchenTransition('confirmed', 'completed'), false);
});

test('input validation helpers reject malformed times, quantities, prices, IDs, and URLs', () => {
  assert.equal(isValidTimeString('12:45 PM'), true);
  assert.equal(isValidTimeString('01:05 PM'), true);
  assert.equal(isValidTimeString('13:30'), true);
  assert.equal(isValidTimeString('25:00'), false);
  assert.equal(isValidTimeString('12:99 PM'), false);
  assert.equal(isValidTimeString('bad-time'), false);

  assert.equal(parsePositiveInt(3, 1, 20), 3);
  assert.equal(parsePositiveInt('5', 1, 20), 5);
  assert.equal(parsePositiveInt(0, 1, 20), null);
  assert.equal(parsePositiveInt(-2, 1, 20), null);
  assert.equal(parsePositiveInt(1.5, 1, 20), null);
  assert.equal(parsePositiveInt(25, 1, 20), null);

  assert.equal(parsePositiveNumber(45.5, 1, 10000), 45.5);
  assert.equal(parsePositiveNumber(-10, 1, 10000), null);
  assert.equal(parsePositiveNumber(0, 1, 10000), null);
  assert.equal(parsePositiveNumber(NaN, 1, 10000), null);

  assert.equal(isValidId('KA101'), true);
  assert.equal(isValidId('m_masala_dosa'), true);
  assert.equal(isValidId('bad/id'), false);
  assert.equal(isValidId(''), false);

  assert.equal(isValidImageUrl('https://images.unsplash.com/photo-1'), true);
  assert.equal(isValidImageUrl('/assets/food.png'), true);
  assert.equal(isValidImageUrl('javascript:alert(1)'), false);
  assert.equal(isValidImageUrl('//evil.com/x.png'), false);
});

test('CORS origin check allows same-host and localhost, rejects untrusted cross-origins', () => {
  assert.equal(isOriginAllowed(undefined, 'localhost:3000'), true);
  assert.equal(isOriginAllowed('http://localhost:3000', 'localhost:3000'), true);
  assert.equal(isOriginAllowed('https://ais-dev.example.run.app', 'ais-dev.example.run.app'), true);
  assert.equal(isOriginAllowed('https://evil.attacker.com', 'localhost:3000'), false);
});

test('rate limiter blocks excess requests within window and resets after expiry', () => {
  const limiter = new RateLimiter(3, 10_000);
  assert.equal(limiter.check('user1', 1000).allowed, true);
  assert.equal(limiter.check('user1', 2000).allowed, true);
  assert.equal(limiter.check('user1', 3000).allowed, true);
  const blocked = limiter.check('user1', 4000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  // Different key unaffected
  assert.equal(limiter.check('user2', 4000).allowed, true);

  // Window expires
  assert.equal(limiter.check('user1', 12_000).allowed, true);
});

test('SQLite immediate transaction serializes capacity check and prevents overbooking', () => {
  const memDb = new Database(':memory:');
  memDb.exec(`
    CREATE TABLE stations (id TEXT PRIMARY KEY, max_capacity INTEGER);
    CREATE TABLE reservations (id TEXT PRIMARY KEY, slot TEXT, station_id TEXT, count INTEGER);
    INSERT INTO stations VALUES ('st_1', 2);
    INSERT INTO reservations VALUES ('r0', '12:45 PM', 'st_1', 1);
  `);

  const tryReserve = memDb.transaction((id: string, qty: number) => {
    const station = memDb.prepare('SELECT max_capacity FROM stations WHERE id = ?').get('st_1') as { max_capacity: number };
    const row = memDb.prepare('SELECT COALESCE(SUM(count), 0) as booked FROM reservations WHERE slot = ? AND station_id = ?').get('12:45 PM', 'st_1') as { booked: number };
    if (row.booked + qty > station.max_capacity) {
      throw new Error('CAPACITY_FULL');
    }
    memDb.prepare('INSERT INTO reservations VALUES (?, ?, ?, ?)').run(id, '12:45 PM', 'st_1', qty);
  });

  // First reservation of 1 item succeeds (booked becomes 2/2)
  tryReserve.immediate('r1', 1);
  // Second reservation of 1 item fails atomically
  assert.throws(() => tryReserve.immediate('r2', 1), /CAPACITY_FULL/);

  const finalRow = memDb.prepare('SELECT SUM(count) as booked FROM reservations').get() as { booked: number };
  assert.equal(finalRow.booked, 2);
  memDb.close();
});
