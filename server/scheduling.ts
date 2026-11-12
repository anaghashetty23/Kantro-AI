export interface CartItem {
  id: string;
  name: string;
  price: number;
  prep_time_minutes: number;
  station_id: string;
  quantity: number;
}

export interface StationCapacity {
  id: string;
  name: string;
  max_capacity_per_slot: number;
}

export interface StationWorkload {
  [stationId: string]: number; // count of items booked
}

export interface SlotAnalysis {
  slotTime: string; // e.g. "12:45 PM"
  slot24: string; // e.g. "12:45"
  isAvailable: boolean;
  reason?: string;
  stationCapacities: {
    stationId: string;
    stationName: string;
    maxCapacity: number;
    booked: number;
    requested: number;
    remaining: number;
  }[];
}

/**
 * Calculates preparation duration accounting for station parallelization:
 * - Items in DIFFERENT stations can be prepared in parallel: duration is the max of the stations.
 * - Items in the SAME station share resources: base time of slowest item + (additional items * incremental overhead).
 */
export function calculateOrderPrepTime(items: CartItem[]): {
  totalPrepMinutes: number;
  stationBreakdown: { [stationId: string]: { count: number; prepMinutes: number } };
} {
  if (!items || items.length === 0) {
    return { totalPrepMinutes: 5, stationBreakdown: {} };
  }

  const stationMap: { [stationId: string]: { count: number; maxBase: number; items: CartItem[] } } = {};

  for (const item of items) {
    const stId = item.station_id || 'station_general';
    if (!stationMap[stId]) {
      stationMap[stId] = { count: 0, maxBase: 0, items: [] };
    }
    stationMap[stId].count += item.quantity;
    stationMap[stId].maxBase = Math.max(stationMap[stId].maxBase, item.prep_time_minutes);
    stationMap[stId].items.push(item);
  }

  const breakdown: { [stationId: string]: { count: number; prepMinutes: number } } = {};
  let maxStationPrep = 0;

  for (const stId of Object.keys(stationMap)) {
    const st = stationMap[stId];
    // Baseline is max individual item prep time, plus 1.5 min per extra unit on the same station
    const extraCount = Math.max(0, st.count - 1);
    const stationMinutes = Math.round(st.maxBase + extraCount * 1.5);
    breakdown[stId] = { count: st.count, prepMinutes: stationMinutes };
    if (stationMinutes > maxStationPrep) {
      maxStationPrep = stationMinutes;
    }
  }

  return {
    totalPrepMinutes: Math.max(3, maxStationPrep),
    stationBreakdown: breakdown
  };
}

/**
 * Converts "12:45" or "12:45 PM" to total minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');
  const numPart = clean.replace(/(AM|PM)/gi, '').trim();
  const [hoursStr, minutesStr] = numPart.split(':');
  let h = parseInt(hoursStr, 10) || 0;
  const m = parseInt(minutesStr, 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Converts minutes from midnight to formatted "HH:MM AM/PM"
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${mStr} ${ampm}`;
}

export function minutesTo24H(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr}`;
}

/**
 * Generates slots within a break window and evaluates feasibility.
 */
export function evaluateBreakPickupSlots(params: {
  breakStart: string; // e.g. "12:45"
  breakEnd: string; // e.g. "13:15"
  preferredPickup?: string; // e.g. "13:00"
  cartItems: CartItem[];
  stations: StationCapacity[];
  existingReservations: { [slot24: string]: StationWorkload };
  currentMinutes?: number; // optionally override for testing
}): SlotAnalysis[] {
  const { breakStart, breakEnd, cartItems, stations, existingReservations, currentMinutes } = params;
  
  const startM = timeStringToMinutes(breakStart);
  const endM = timeStringToMinutes(breakEnd);
  
  if (endM <= startM) {
    return [];
  }

  const { totalPrepMinutes, stationBreakdown } = calculateOrderPrepTime(cartItems);

  // Generate slots in 5-minute intervals between start and end
  const slots: SlotAnalysis[] = [];
  const slotInterval = 5;

  for (let m = startM; m <= endM; m += slotInterval) {
    const slot24 = minutesTo24H(m);
    const slotTime = minutesToTimeString(m);
    const slotWorkload = existingReservations[slot24] || {};

    let isAvailable = true;
    let reason: string | undefined = undefined;

    // Check if slot allows enough preparation time if current time is provided
    if (typeof currentMinutes === 'number') {
      const leadTimeMinutes = m - currentMinutes;
      if (leadTimeMinutes < totalPrepMinutes) {
        isAvailable = false;
        reason = `Needs at least ${totalPrepMinutes} min prep time (only ${Math.max(0, leadTimeMinutes)} min left)`;
      }
    }

    // Check break boundary tolerance (pickup at least 2 mins before break end so student can actually eat)
    if (m === endM && endM - startM >= 10) {
      // Just a warning or strict boundary
    }

    const stationCapacities = stations.map(station => {
      const maxCap = station.max_capacity_per_slot || 15;
      const booked = slotWorkload[station.id] || 0;
      const requested = stationBreakdown[station.id]?.count || 0;
      const remaining = Math.max(0, maxCap - booked);

      if (requested > 0 && remaining < requested) {
        isAvailable = false;
        reason = `${station.name} is full (${booked}/${maxCap} booked)`;
      }

      return {
        stationId: station.id,
        stationName: station.name,
        maxCapacity: maxCap,
        booked,
        requested,
        remaining
      };
    });

    slots.push({
      slotTime,
      slot24,
      isAvailable,
      reason,
      stationCapacities
    });
  }

  return slots;
}

/**
 * Generates an alternative suggested slot when an order is delayed.
 */
export function findAlternativeSlot(
  currentPickupTime: string,
  delayMinutes: number,
  availableSlots: SlotAnalysis[]
): string | null {
  const targetMinutes = timeStringToMinutes(currentPickupTime) + delayMinutes;
  
  // Find first available slot >= targetMinutes
  const nextFeasible = availableSlots.find(s => {
    return s.isAvailable && timeStringToMinutes(s.slot24) >= targetMinutes;
  });

  if (nextFeasible) {
    return nextFeasible.slotTime;
  }

  return minutesToTimeString(targetMinutes);
}
