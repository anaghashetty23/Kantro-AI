import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderPrepTime,
  timeStringToMinutes,
  minutesToTimeString,
  evaluateBreakPickupSlots,
  type CartItem
} from './scheduling.ts';

test('time conversions convert 12h and 24h formats accurately', () => {
  assert.equal(timeStringToMinutes('12:00 PM'), 720);
  assert.equal(timeStringToMinutes('12:45 PM'), 765);
  assert.equal(timeStringToMinutes('01:15 PM'), 795);
  assert.equal(timeStringToMinutes('09:30 AM'), 570);
  assert.equal(timeStringToMinutes('12:00 AM'), 0);

  assert.equal(minutesToTimeString(765), '12:45 PM');
  assert.equal(minutesToTimeString(795), '1:15 PM');
});

test('calculateOrderPrepTime handles single and multiple items across stations', () => {
  const singleDosa: CartItem[] = [
    { id: 'm_dosa', name: 'Masala Dosa', price: 50, prep_time_minutes: 10, station_id: 'st_south', quantity: 1 }
  ];
  const res1 = calculateOrderPrepTime(singleDosa);
  assert.equal(res1.totalPrepMinutes, 10);
  assert.equal(res1.stationBreakdown['st_south'].count, 1);

  // Two dosas on the same station: base 10 + 1 * 1.5 = 12 mins (approx)
  const twoDosas: CartItem[] = [
    { id: 'm_dosa', name: 'Masala Dosa', price: 50, prep_time_minutes: 10, station_id: 'st_south', quantity: 2 }
  ];
  const res2 = calculateOrderPrepTime(twoDosas);
  assert.equal(res2.totalPrepMinutes, 12);

  // Parallel stations: Dosa (10 min) + Coffee (4 min) on different station -> max is 10 min
  const dosaAndCoffee: CartItem[] = [
    { id: 'm_dosa', name: 'Masala Dosa', price: 50, prep_time_minutes: 10, station_id: 'st_south', quantity: 1 },
    { id: 'm_coffee', name: 'Coffee', price: 15, prep_time_minutes: 4, station_id: 'st_bev', quantity: 1 }
  ];
  const res3 = calculateOrderPrepTime(dosaAndCoffee);
  assert.equal(res3.totalPrepMinutes, 10);
  assert.equal(res3.stationBreakdown['st_south'].count, 1);
  assert.equal(res3.stationBreakdown['st_bev'].count, 1);
});

test('evaluateBreakPickupSlots rejects slots with insufficient lead time or full capacity', () => {
  const stations = [
    { id: 'st_south', name: 'South Indian Station', max_capacity_per_slot: 2 },
    { id: 'st_bev', name: 'Beverage Station', max_capacity_per_slot: 10 }
  ];

  const items: CartItem[] = [
    { id: 'm_dosa', name: 'Masala Dosa', price: 50, prep_time_minutes: 10, station_id: 'st_south', quantity: 2 }
  ];

  // Current time: 12:40 (760 mins). Break: 12:45 to 13:10 (765 to 790 mins)
  // Prep time needed: 12 mins.
  // 12:45 slot is in 5 mins -> Insufficient prep time!
  // 12:55 slot is in 15 mins -> Sufficient!
  // At 12:55 slot, let st_south already have 2 items booked -> Capacity full!
  const existingReservations = {
    '12:55': { st_south: 2 }
  };

  const slots = evaluateBreakPickupSlots({
    breakStart: '12:45',
    breakEnd: '13:10',
    cartItems: items,
    stations,
    existingReservations,
    currentMinutes: 760 // 12:40
  });

  assert.ok(slots.length > 0);
  
  // 12:45 should be unavailable due to prep time
  const slot1245 = slots.find(s => s.slot24 === '12:45');
  assert.ok(slot1245);
  assert.equal(slot1245.isAvailable, false);
  assert.match(slot1245.reason || '', /prep time/i);

  // 12:55 should be unavailable due to station capacity
  const slot1255 = slots.find(s => s.slot24 === '12:55');
  assert.ok(slot1255);
  assert.equal(slot1255.isAvailable, false);
  assert.match(slot1255.reason || '', /capacity|full/i);

  // 13:00 should be available!
  const slot1300 = slots.find(s => s.slot24 === '13:00');
  assert.ok(slot1300);
  assert.equal(slot1300.isAvailable, true);
});
