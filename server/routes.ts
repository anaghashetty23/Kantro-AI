import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import {
  calculateOrderPrepTime,
  evaluateBreakPickupSlots,
  minutesTo24H,
  timeStringToMinutes,
  minutesToTimeString,
  findAlternativeSlot,
  type CartItem
} from './scheduling.ts';
import { askKantroAssistant } from './gemini.ts';

export const apiRouter = Router();

// Helper to authenticate user from session cookie or Authorization header
export function getAuthenticatedUser(req: Request) {
  const token = req.cookies?.kantro_session || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const user = db.prepare('SELECT id, role, username, full_name, department, year_of_study, payment_preference, status FROM users WHERE id = ?').get(token) as any;
    if (user && user.status === 'active') {
      return user;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function getCookieOptions(req: Request) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

// ======================== AUTHENTICATION ========================

apiRouter.post('/auth/register', (req: Request, res: Response): any => {
  const { fullName, collegeId, department, yearOfStudy, password, confirmPassword } = req.body;

  if (!fullName || !collegeId || !department || !yearOfStudy || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check unique College ID
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(collegeId.trim().toUpperCase());
  if (existing) {
    return res.status(409).json({ error: `College ID ${collegeId} is already registered. Please login.` });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const userId = `u_std_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    db.prepare(`
      INSERT INTO users (id, role, username, password_hash, full_name, department, year_of_study, payment_preference, status)
      VALUES (?, 'student', ?, ?, ?, ?, ?, 'counter', 'active')
    `).run(userId, collegeId.trim().toUpperCase(), passwordHash, fullName.trim(), department.trim(), yearOfStudy.trim());

    // Set cookie
    res.cookie('kantro_session', userId, getCookieOptions(req));

    const user = db.prepare('SELECT id, role, username, full_name, department, year_of_study, payment_preference FROM users WHERE id = ?').get(userId);
    return res.json({ success: true, user, token: userId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to register account.' });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response): any => {
  const { username, password, expectedRole } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter ID and password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE UPPER(username) = ?').get(username.trim().toUpperCase()) as any;
  if (!user) {
    return res.status(401).json({ error: 'Account not found with this ID.' });
  }

  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({ error: `Unauthorized: ID belongs to ${user.role} portal.` });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated by administrator.' });
  }

  res.cookie('kantro_session', user.id, getCookieOptions(req));

  const { password_hash, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, token: user.id });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const opts = getCookieOptions(req);
  res.clearCookie('kantro_session', { httpOnly: opts.httpOnly, secure: opts.secure, sameSite: opts.sameSite });
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user });
});

apiRouter.patch('/auth/preferences', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { paymentPreference } = req.body;
  if (!['counter', 'online'].includes(paymentPreference)) {
    return res.status(400).json({ error: 'Invalid preference.' });
  }

  db.prepare('UPDATE users SET payment_preference = ? WHERE id = ?').run(paymentPreference, user.id);
  return res.json({ success: true, paymentPreference });
});

apiRouter.patch('/auth/change-password', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { currentPassword, newPassword } = req.body;
  const currentRecord = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;
  if (!bcrypt.compareSync(currentPassword, currentRecord.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// ======================== MENU ========================

apiRouter.get('/menu', (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
  const items = db.prepare(`
    SELECT m.*, c.name as category_name, s.name as station_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    JOIN kitchen_stations s ON m.station_id = s.id
    ORDER BY c.display_order ASC, m.price ASC
  `).all();

  res.json({ categories, items });
});

apiRouter.post('/menu', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { categoryId, name, description, price, prepTimeMinutes, stationId, imageUrl } = req.body;
  if (!categoryId || !name || !price || !prepTimeMinutes || !stationId) {
    return res.status(400).json({ error: 'Missing required menu fields.' });
  }

  const id = `m_${Date.now()}`;
  db.prepare(`
    INSERT INTO menu_items (id, category_id, name, description, price, prep_time_minutes, station_id, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, categoryId, name, description || '', price, prepTimeMinutes, stationId, imageUrl || '');

  return res.json({ success: true, id });
});

apiRouter.put('/menu/:id', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  const { name, description, price, prepTimeMinutes, isAvailable, stationId, categoryId, imageUrl } = req.body;

  db.prepare(`
    UPDATE menu_items
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        prep_time_minutes = COALESCE(?, prep_time_minutes),
        is_available = COALESCE(?, is_available),
        station_id = COALESCE(?, station_id),
        category_id = COALESCE(?, category_id),
        image_url = COALESCE(?, image_url)
    WHERE id = ?
  `).run(name, description, price, prepTimeMinutes, isAvailable, stationId, categoryId, imageUrl, id);

  return res.json({ success: true, message: 'Menu item updated.' });
});

apiRouter.delete('/menu/:id', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Menu item removed.' });
});

// ======================== SCHEDULING & SLOTS ========================

apiRouter.post('/schedule/slots', (req: Request, res: Response): any => {
  const { breakStart, breakEnd, preferredPickup, cartItems = [] } = req.body;

  if (!breakStart || !breakEnd) {
    return res.status(400).json({ error: 'Break start and end times are required.' });
  }

  const stations = db.prepare('SELECT * FROM kitchen_stations').all() as any[];

  // Fetch all active reservations
  const reservations = db.prepare(`
    SELECT r.slot_time, r.station_id, SUM(r.item_count) as booked_count
    FROM slot_reservations r
    JOIN orders o ON r.order_id = o.id
    WHERE o.order_status IN ('confirmed', 'accepted', 'preparing')
    GROUP BY r.slot_time, r.station_id
  `).all() as any[];

  const existingReservations: { [slot24: string]: { [stationId: string]: number } } = {};
  for (const r of reservations) {
    const slot24 = minutesTo24H(timeStringToMinutes(r.slot_time));
    if (!existingReservations[slot24]) {
      existingReservations[slot24] = {};
    }
    existingReservations[slot24][r.station_id] = r.booked_count;
  }

  // Get prep time breakdown
  const prepAnalysis = calculateOrderPrepTime(cartItems);

  // Evaluate slots
  const slots = evaluateBreakPickupSlots({
    breakStart,
    breakEnd,
    preferredPickup,
    cartItems,
    stations,
    existingReservations
  });

  return res.json({
    slots,
    totalPrepMinutes: prepAnalysis.totalPrepMinutes,
    stationBreakdown: prepAnalysis.stationBreakdown
  });
});

// ======================== ORDERS ========================

apiRouter.post('/orders', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'student') {
    return res.status(401).json({ error: 'Student login required to place orders.' });
  }

  const { items, breakStart, breakEnd, pickupTime, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty. Please add items.' });
  }

  if (!pickupTime) {
    return res.status(400).json({ error: 'Please select an available pickup slot.' });
  }

  if (!['counter', 'online'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  // Fetch menu details for all cart items to prevent client tampering
  const itemIds = items.map((i: any) => i.id);
  const placeholders = itemIds.map(() => '?').join(',');
  const menuRecords = db.prepare(`SELECT * FROM menu_items WHERE id IN (${placeholders})`).all(...itemIds) as any[];

  const fullCartItems: CartItem[] = [];
  let totalAmount = 0;

  for (const reqItem of items) {
    const record = menuRecords.find(m => m.id === reqItem.id);
    if (!record) {
      return res.status(400).json({ error: `Menu item ${reqItem.id} not found.` });
    }
    if (record.is_available !== 1) {
      return res.status(400).json({ error: `"${record.name}" is currently sold out. Please remove it from your cart.` });
    }
    const qty = Math.max(1, parseInt(reqItem.quantity, 10) || 1);
    totalAmount += record.price * qty;
    fullCartItems.push({
      id: record.id,
      name: record.name,
      price: record.price,
      prep_time_minutes: record.prep_time_minutes,
      station_id: record.station_id,
      quantity: qty
    });
  }

  // Check station capacity atomic reservation
  const stations = db.prepare('SELECT * FROM kitchen_stations').all() as any[];
  const prepAnalysis = calculateOrderPrepTime(fullCartItems);

  // Check current bookings for this slot
  const currentSlotBookings = db.prepare(`
    SELECT r.station_id, SUM(r.item_count) as booked
    FROM slot_reservations r
    JOIN orders o ON r.order_id = o.id
    WHERE r.slot_time = ? AND o.order_status IN ('confirmed', 'accepted', 'preparing')
    GROUP BY r.station_id
  `).all(pickupTime) as any[];

  for (const stationId of Object.keys(prepAnalysis.stationBreakdown)) {
    const station = stations.find(s => s.id === stationId);
    const maxCap = station ? station.max_capacity_per_slot : 15;
    const booked = currentSlotBookings.find(b => b.station_id === stationId)?.booked || 0;
    const requested = prepAnalysis.stationBreakdown[stationId].count;

    if (booked + requested > maxCap) {
      return res.status(409).json({
        error: `Slot ${pickupTime} became full at ${station?.name || 'the kitchen station'}. Please select another pickup slot.`
      });
    }
  }

  // Execute order creation in a single transaction
  const orderId = `KA${Math.floor(100 + Math.random() * 900)}`;
  const pickupCode = `PK-${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentStatus = paymentMethod === 'online' ? 'paid_demo' : 'pending';

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, student_id, student_name, college_id, pickup_code, total_amount,
        break_start, break_end, pickup_time, payment_method, payment_status,
        order_status, is_demo_seed, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      orderId,
      user.id,
      user.full_name,
      user.username,
      pickupCode,
      totalAmount,
      breakStart || null,
      breakEnd || null,
      pickupTime,
      paymentMethod,
      paymentStatus
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, prep_time_minutes, station_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReservation = db.prepare(`
      INSERT INTO slot_reservations (id, slot_time, station_id, order_id, item_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of fullCartItems) {
      const oiId = `oi_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      insertItem.run(
        oiId,
        orderId,
        item.id,
        item.name,
        item.quantity,
        item.price,
        item.prep_time_minutes,
        item.station_id
      );
    }

    for (const stationId of Object.keys(prepAnalysis.stationBreakdown)) {
      const resId = `res_${Date.now()}_${stationId}`;
      const count = prepAnalysis.stationBreakdown[stationId].count;
      insertReservation.run(resId, pickupTime, stationId, orderId, count);
    }

    // Create notification
    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, 'general')
    `).run(
      `notif_${Date.now()}`,
      user.id,
      orderId,
      'Order Confirmed!',
      `Order ${orderId} confirmed for pickup at ${pickupTime}. Pickup Code: ${pickupCode}.`
    );
  });

  try {
    tx();

    // Fetch created order with items
    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    return res.status(201).json({
      success: true,
      order: {
        ...createdOrder,
        items: orderItems
      }
    });
  } catch (err: any) {
    console.error('Failed to create order:', err);
    return res.status(500).json({ error: 'Failed to create order in database.' });
  }
});

// Student's own orders ONLY
apiRouter.get('/orders/my', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'student') {
    return res.status(401).json({ error: 'Student login required.' });
  }

  // Fetch only this student's orders
  const orders = db.prepare(`
    SELECT * FROM orders 
    WHERE student_id = ? 
    ORDER BY created_at DESC
  `).all(user.id) as any[];

  const orderIds = orders.map(o => o.id);
  let allItems: any[] = [];
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    allItems = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).all(...orderIds);
  }

  const enriched = orders.map(o => ({
    ...o,
    items: allItems.filter(i => i.order_id === o.id)
  }));

  return res.json({ orders: enriched });
});

// ======================== KITCHEN EMPLOYEE ========================

apiRouter.get('/kitchen/orders', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Kitchen employee access required.' });
  }

  const orders = db.prepare(`
    SELECT * FROM orders 
    WHERE order_status IN ('confirmed', 'accepted', 'preparing', 'ready', 'delayed')
    ORDER BY pickup_time ASC, created_at ASC
  `).all() as any[];

  const orderIds = orders.map(o => o.id);
  let allItems: any[] = [];
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    allItems = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).all(...orderIds);
  }

  const enriched = orders.map(o => {
    const items = allItems.filter(i => i.order_id === o.id);
    const maxPrep = Math.max(3, ...items.map(i => i.prep_time_minutes || 5));
    return {
      ...o,
      items,
      estimatedPrepMinutes: maxPrep
    };
  });

  return res.json({ orders: enriched });
});

apiRouter.patch('/kitchen/orders/:id/status', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Kitchen employee access required.' });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'preparing', 'ready', 'completed', 'delayed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status transition.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  db.prepare('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

  // If status is ready, create notification for student
  if (status === 'ready') {
    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, 'ready')
    `).run(
      `notif_${Date.now()}`,
      order.student_id,
      id,
      'Food is Ready for Pickup!',
      `Order ${order.id} is ready at the canteen counter. Show Pickup Code: ${order.pickup_code}.`
    );
  }

  // If completed, release slot reservation
  if (status === 'completed') {
    db.prepare('DELETE FROM slot_reservations WHERE order_id = ?').run(id);
  }

  return res.json({ success: true, status });
});

apiRouter.get('/kitchen/capacity', (_req: Request, res: Response) => {
  const stations = db.prepare('SELECT * FROM kitchen_stations').all() as any[];
  const reservations = db.prepare(`
    SELECT r.slot_time, r.station_id, SUM(r.item_count) as booked, COUNT(DISTINCT r.order_id) as order_count
    FROM slot_reservations r
    JOIN orders o ON r.order_id = o.id
    WHERE o.order_status IN ('confirmed', 'accepted', 'preparing')
    GROUP BY r.slot_time, r.station_id
  `).all() as any[];

  // Group by slot
  const slotsMap: { [slotTime: string]: any } = {};
  for (const r of reservations) {
    if (!slotsMap[r.slot_time]) {
      slotsMap[r.slot_time] = {
        slotTime: r.slot_time,
        totalBooked: 0,
        ordersCount: 0,
        stations: {}
      };
    }
    slotsMap[r.slot_time].totalBooked += r.booked;
    slotsMap[r.slot_time].ordersCount += r.order_count;
    slotsMap[r.slot_time].stations[r.station_id] = r.booked;
  }

  return res.json({ stations, slots: Object.values(slotsMap) });
});

// ======================== ADMIN DASHBOARD ========================

apiRouter.get('/admin/orders', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { status, collegeId } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' AND order_status = ?';
    params.push(status);
  }

  if (collegeId) {
    query += ' AND UPPER(college_id) LIKE ?';
    params.push(`%${(collegeId as string).toUpperCase()}%`);
  }

  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params) as any[];
  const orderIds = orders.map(o => o.id);
  let allItems: any[] = [];
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    allItems = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).all(...orderIds);
  }

  const enriched = orders.map(o => ({
    ...o,
    items: allItems.filter(i => i.order_id === o.id)
  }));

  return res.json({ orders: enriched });
});

apiRouter.patch('/admin/orders/:id/action', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  const { action, flagReason, message, suggestedPickupTime } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (action === 'flag') {
    db.prepare(`
      UPDATE orders
      SET flag_reason = ?, admin_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(flagReason, message, id);

    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, 'Order Notice from Kitchen', ?, 'flag')
    `).run(`notif_${Date.now()}`, order.student_id, id, message || `Order note: ${flagReason}`);
  } else if (action === 'delay') {
    db.prepare(`
      UPDATE orders
      SET order_status = 'delayed',
          flag_reason = ?,
          admin_message = ?,
          suggested_pickup_time = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(flagReason || 'Delayed due to kitchen preparation volume', message, suggestedPickupTime, id);

    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, 'Rescue My Break: Order Delayed', ?, 'delay')
    `).run(
      `notif_${Date.now()}`,
      order.student_id,
      id,
      message || `Your order is delayed. New estimated pickup time: ${suggestedPickupTime}. Check Rescue My Break in My Orders.`
    );
  } else if (action === 'cancel') {
    const paymentStatus = order.payment_status === 'paid_demo' ? 'refunded_demo' : 'pending';
    db.prepare(`
      UPDATE orders
      SET order_status = 'cancelled',
          payment_status = ?,
          flag_reason = ?,
          admin_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(paymentStatus, flagReason || 'Order cancelled by canteen admin', message, id);

    db.prepare('DELETE FROM slot_reservations WHERE order_id = ?').run(id);

    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, 'Order Cancelled', ?, 'flag')
    `).run(`notif_${Date.now()}`, order.student_id, id, message || 'Your order was cancelled by canteen management.');
  }

  return res.json({ success: true, message: 'Order updated successfully.' });
});

apiRouter.get('/admin/stats', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  const completed = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'completed'").get() as { count: number };
  const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('confirmed', 'accepted')").get() as { count: number };
  const preparing = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'preparing'").get() as { count: number };
  const delayed = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'delayed'").get() as { count: number };
  const sales = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE order_status != 'cancelled'").get() as { total: number };

  return res.json({
    totalOrders: total.count,
    completedOrders: completed.count,
    pendingOrders: pending.count,
    preparingOrders: preparing.count,
    delayedOrders: delayed.count,
    totalSales: sales.total || 0
  });
});

apiRouter.get('/admin/stations', (_req: Request, res: Response) => {
  const stations = db.prepare('SELECT * FROM kitchen_stations').all();
  res.json({ stations });
});

apiRouter.put('/admin/stations/:id', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  const { maxCapacityPerSlot } = req.body;

  db.prepare('UPDATE kitchen_stations SET max_capacity_per_slot = ? WHERE id = ?').run(maxCapacityPerSlot, id);
  return res.json({ success: true });
});

apiRouter.get('/admin/inventory', (_req: Request, res: Response) => {
  const inventory = db.prepare('SELECT * FROM inventory ORDER BY name ASC').all();
  res.json({ inventory });
});

apiRouter.patch('/admin/inventory/:id', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  const { quantity, isAvailable } = req.body;

  db.prepare(`
    UPDATE inventory
    SET quantity = COALESCE(?, quantity),
        is_available = COALESCE(?, is_available),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(quantity, isAvailable, id);

  return res.json({ success: true });
});

apiRouter.get('/admin/accounts', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const accounts = db.prepare(`
    SELECT id, role, username, full_name, department, year_of_study, status, created_at
    FROM users
    ORDER BY role DESC, created_at DESC
  `).all();

  return res.json({ accounts });
});

apiRouter.patch('/admin/accounts/:id/status', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  return res.json({ success: true, status });
});

apiRouter.get('/admin/reports', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  const completed = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'completed'").get() as { count: number };
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'cancelled'").get() as { count: number };
  const sales = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE order_status != 'cancelled'").get() as { total: number };

  const popular = db.prepare(`
    SELECT item_name, SUM(quantity) as total_sold, SUM(quantity * unit_price) as revenue
    FROM order_items
    GROUP BY item_name
    ORDER BY total_sold DESC
    LIMIT 6
  `).all();

  return res.json({
    totalOrders: total.count,
    completedOrders: completed.count,
    cancelledOrders: cancelled.count,
    totalSales: sales.total || 0,
    popularItems: popular
  });
});

// ======================== AI ASSISTANT ========================

apiRouter.post('/ai/chat', async (req: Request, res: Response): Promise<any> => {
  const { prompt, history, studentBreak } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const result = await askKantroAssistant({ prompt, history, studentBreak });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Assistant encountered an error.' });
  }
});

// ======================== NOTIFICATIONS & RESCUE MY BREAK ========================

apiRouter.get('/notifications', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });

  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE student_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
  `).all(user.id);

  return res.json({ notifications });
});

apiRouter.patch('/notifications/:id/read', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });

  const { id } = req.params;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND student_id = ?').run(id, user.id);
  return res.json({ success: true });
});

apiRouter.post('/orders/:id/accept-delay', (req: Request, res: Response): any => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'student') return res.status(401).json({ error: 'Student login required.' });

  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND student_id = ?').get(id, user.id) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.suggested_pickup_time) {
    db.prepare(`
      UPDATE orders
      SET pickup_time = suggested_pickup_time,
          order_status = 'confirmed',
          flag_reason = NULL,
          admin_message = 'Student accepted updated pickup time: ' || suggested_pickup_time,
          suggested_pickup_time = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    // Update reservations
    db.prepare('UPDATE slot_reservations SET slot_time = ? WHERE order_id = ?').run(order.suggested_pickup_time, id);

    db.prepare(`
      INSERT INTO notifications (id, student_id, order_id, title, message, type)
      VALUES (?, ?, ?, 'Break Rescheduled Successfully', ?, 'general')
    `).run(
      `notif_${Date.now()}`,
      user.id,
      id,
      `Your order ${id} has been rescheduled to ${order.suggested_pickup_time}. Kitchen notified!`
    );

    return res.json({ success: true, newPickupTime: order.suggested_pickup_time });
  }

  return res.status(400).json({ error: 'No suggested pickup time found on this order.' });
});
