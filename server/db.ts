import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import os from 'os';

function resolveDbPath(): string {
  const localPath = path.resolve(process.cwd(), 'kantro.sqlite');
  try {
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return localPath;
  } catch {
    const tmpPath = path.join(os.tmpdir(), 'kantro.sqlite');
    if (!fs.existsSync(tmpPath) && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, tmpPath);
      } catch (copyErr) {
        console.warn('Could not copy bundled kantro.sqlite to tmpdir:', copyErr);
      }
    }
    return tmpPath;
  }
}

const DB_PATH = resolveDbPath();
export const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for reliable concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('student', 'employee', 'admin')),
      username TEXT UNIQUE NOT NULL, -- College ID / Employee ID / Admin ID
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT,
      year_of_study TEXT,
      payment_preference TEXT DEFAULT 'counter' CHECK(payment_preference IN ('counter', 'online')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kitchen_stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_capacity_per_slot INTEGER NOT NULL DEFAULT 15,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      prep_time_minutes INTEGER NOT NULL,
      station_id TEXT NOT NULL,
      image_url TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY(station_id) REFERENCES kitchen_stations(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      low_stock_threshold REAL NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_item_ingredients (
      id TEXT PRIMARY KEY,
      menu_item_id TEXT NOT NULL,
      inventory_id TEXT NOT NULL,
      quantity_required REAL NOT NULL DEFAULT 1,
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      college_id TEXT NOT NULL,
      pickup_code TEXT NOT NULL,
      total_amount REAL NOT NULL,
      break_start TEXT,
      break_end TEXT,
      pickup_time TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('counter', 'online')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid_demo', 'refunded_demo')),
      order_status TEXT NOT NULL CHECK(order_status IN ('confirmed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'delayed')),
      flag_reason TEXT,
      admin_message TEXT,
      suggested_pickup_time TEXT,
      is_demo_seed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      prep_time_minutes INTEGER NOT NULL,
      station_id TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS slot_reservations (
      id TEXT PRIMARY KEY,
      slot_time TEXT NOT NULL,
      station_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      item_count INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(station_id) REFERENCES kitchen_stations(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      order_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('delay', 'flag', 'ready', 'general')),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  const salt = bcrypt.genSaltSync(10);
  const studentPasswordHash = bcrypt.hashSync('Student@123', salt);
  const kitchenPasswordHash = bcrypt.hashSync('Kitchen@123', salt);
  const adminPasswordHash = bcrypt.hashSync('Admin@123', salt);

  // Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, role, username, password_hash, full_name, department, year_of_study, payment_preference, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Demo Student (Empty personal order history!)
  insertUser.run('u_student_demo', 'student', 'DEMO2026', studentPasswordHash, 'Aditya Kumar', 'Computer Science & Engg', '3rd Year', 'counter', 'active');
  
  // Kitchen Employee
  insertUser.run('u_emp_01', 'employee', 'KITCHEN01', kitchenPasswordHash, 'Ramesh Sharma', 'Kitchen Services', 'Staff', 'counter', 'active');
  
  // Kitchen Administrator
  insertUser.run('u_admin_01', 'admin', 'ADMIN01', adminPasswordHash, 'Chef Sudhir Hegde', 'Canteen Operations', 'Administrator', 'counter', 'active');

  // Additional demo student accounts for sample orders
  insertUser.run('u_demo_s1', 'student', '4MT21CS045', studentPasswordHash, 'Rahul Varma', 'Computer Science', '4th Year', 'online', 'active');
  insertUser.run('u_demo_s2', 'student', '4MT22EC089', studentPasswordHash, 'Priya Nayak', 'Electronics', '3rd Year', 'counter', 'active');
  insertUser.run('u_demo_s3', 'student', '4MT23IS012', studentPasswordHash, 'Vikram Rao', 'Information Science', '2nd Year', 'online', 'active');
  insertUser.run('u_demo_s4', 'student', '4MT22ME034', studentPasswordHash, 'Ananya Shenoy', 'Mechanical Engg', '3rd Year', 'online', 'active');
  insertUser.run('u_demo_s5', 'student', '4MT24CI003', studentPasswordHash, 'Sneha Prabhu', 'AI & Data Science', '1st Year', 'counter', 'active');
  insertUser.run('u_demo_s6', 'student', '4MT21EE056', studentPasswordHash, 'Karthik Bhat', 'Electrical Engg', '4th Year', 'online', 'active');

  // Seed Kitchen Stations
  const insertStation = db.prepare(`
    INSERT INTO kitchen_stations (id, name, max_capacity_per_slot, description)
    VALUES (?, ?, ?, ?)
  `);
  insertStation.run('station_south', 'Dosa / South Indian Station', 15, 'Tawa, steamers, dosa & idli prep');
  insertStation.run('station_snacks', 'Snacks Station', 20, 'Sandwiches, fries, samosas & fast bites');
  insertStation.run('station_meals', 'Meals / Rice Station', 12, 'Thali, pulao, fried rice & curd rice');
  insertStation.run('station_beverages', 'Beverages Station', 25, 'Tea, filter coffee, cold brew & fresh juices');

  // Seed Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, display_order)
    VALUES (?, ?, ?)
  `);
  insertCategory.run('cat_south', 'South Indian', 1);
  insertCategory.run('cat_meals', 'Meals and Rice', 2);
  insertCategory.run('cat_snacks', 'Snacks', 3);
  insertCategory.run('cat_beverages', 'Beverages', 4);

  // Seed Inventory
  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, name, quantity, unit, low_stock_threshold, is_available)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertInventory.run('inv_rice_batter', 'Dosa / Idli Batter', 45, 'kg', 10, 1);
  insertInventory.run('inv_potato_masala', 'Potato Masala filling', 25, 'kg', 5, 1);
  insertInventory.run('inv_chutney_sambar', 'Fresh Chutney & Sambar', 60, 'litres', 15, 1);
  insertInventory.run('inv_rice_cooked', 'Basmati & Sona Masoori Rice', 50, 'kg', 12, 1);
  insertInventory.run('inv_bread', 'Sandwich Bread', 35, 'loaves', 8, 1);
  insertInventory.run('inv_cheese', 'Cheddar & Mozzarella', 15, 'kg', 4, 1);
  insertInventory.run('inv_coffee_decoction', 'Filter Coffee Decoction', 20, 'litres', 5, 1);
  insertInventory.run('inv_tea_leaves', 'Assam Tea Blend', 18, 'kg', 4, 1);
  insertInventory.run('inv_milk', 'Fresh Dairy Milk', 80, 'litres', 20, 1);
  insertInventory.run('inv_lemons', 'Farm Fresh Lemons', 100, 'pcs', 25, 1);
  insertInventory.run('inv_veggies', 'Assorted Diced Veggies', 30, 'kg', 8, 1);

  // Seed Menu Items
  const insertMenuItem = db.prepare(`
    INSERT INTO menu_items (id, category_id, name, description, price, prep_time_minutes, station_id, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // South Indian
  insertMenuItem.run('m_masala_dosa', 'cat_south', 'Masala Dosa', 'Crisp golden crepe filled with spiced potato masala and served with chutney & sambar', 50, 10, 'station_south', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80', 1);
  insertMenuItem.run('m_plain_dosa', 'cat_south', 'Plain Dosa', 'Golden buttery roast dosa served hot with coconut chutney and tangy vegetable sambar', 40, 8, 'station_south', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80', 1);
  insertMenuItem.run('m_set_dosa', 'cat_south', 'Set Dosa', 'Trio of feather-light fluffy sponge dosas served with creamy vegetable sagu and chutney', 45, 9, 'station_south', 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400&q=80', 1);
  insertMenuItem.run('m_idli_2', 'cat_south', 'Idli (2 pieces)', 'Steamed fluffy rice-lentil cakes served with traditional spiced sambar and fresh chutney', 30, 5, 'station_south', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80', 1);
  insertMenuItem.run('m_vada', 'cat_south', 'Vada', 'Crisp fried medu vada with golden crust and soft aromatic interior with peppercorns', 20, 6, 'station_south', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80', 1);
  insertMenuItem.run('m_idli_vada_combo', 'cat_south', 'Idli Vada Combo', 'The classic college breakfast duo: 2 soft steamed idlis paired with 1 crisp medu vada', 40, 7, 'station_south', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80', 1);
  insertMenuItem.run('m_poori_bhaji', 'cat_south', 'Poori Bhaji', 'Puffy golden whole wheat pooris served with mild aromatic potato bhaji and pickle', 45, 10, 'station_south', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80', 1);
  insertMenuItem.run('m_upma', 'cat_south', 'Upma', 'Hearty roasted semolina cooked with curry leaves, mustard seeds, cashews and vegetables', 30, 5, 'station_south', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80', 1);

  // Meals and Rice
  insertMenuItem.run('m_meals', 'cat_meals', 'South Indian Meals', 'Wholesome platter with steamed rice, sambar, rasam, palya, curd, papad and pickle', 80, 12, 'station_meals', 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&q=80', 1);
  insertMenuItem.run('m_fried_rice', 'cat_meals', 'Veg Fried Rice', 'Wok-tossed aromatic rice with crisp garden vegetables, scallions and mild soy seasoning', 70, 12, 'station_meals', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80', 1);
  insertMenuItem.run('m_pulao', 'cat_meals', 'Veg Pulao', 'Fragrant basmati rice cooked with whole spices, green peas, carrots, beans and mint', 65, 10, 'station_meals', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', 1);
  insertMenuItem.run('m_curd_rice', 'cat_meals', 'Curd Rice', 'Cooling tempered yoghurt rice garnished with mustard seeds, curry leaves, ginger & pomegranate', 40, 5, 'station_meals', 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&q=80', 1);
  insertMenuItem.run('m_lemon_rice', 'cat_meals', 'Lemon Rice', 'Zesty yellow rice tempered with roasted peanuts, curry leaves, mustard seeds and fresh lime', 45, 5, 'station_meals', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', 1);
  insertMenuItem.run('m_paneer_rice', 'cat_meals', 'Paneer Rice', 'Flavour-packed rice tossed with succulent roasted paneer cubes and rich Indian spices', 80, 13, 'station_meals', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80', 1);

  // Snacks
  insertMenuItem.run('m_veg_sandwich', 'cat_snacks', 'Veg Sandwich', 'Toasted bread loaded with sliced cucumber, tomato, capsicum, green mint chutney and butter', 45, 7, 'station_snacks', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80', 1);
  insertMenuItem.run('m_cheese_sandwich', 'cat_snacks', 'Cheese Sandwich', 'Melted cheese layered with sweet corn, capsicum and herbs inside crisp golden grilled slices', 60, 8, 'station_snacks', 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80', 1);
  insertMenuItem.run('m_samosa', 'cat_snacks', 'Samosa', 'Crunchy golden pastry stuffed with spiced potatoes and green peas, served with imli chutney', 20, 4, 'station_snacks', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80', 1);
  insertMenuItem.run('m_veg_puff', 'cat_snacks', 'Veg Puff', 'Flaky multi-layered baked puff pastry loaded with spiced mixed vegetable masala', 25, 4, 'station_snacks', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80', 1);
  insertMenuItem.run('m_french_fries', 'cat_snacks', 'French Fries', 'Crispy golden potato fingers tossed with sea salt and peri-peri seasoning', 50, 10, 'station_snacks', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&q=80', 1);
  insertMenuItem.run('m_maggi', 'cat_snacks', 'Maggi', 'Classic hot college-style masala Maggi noodles cooked with vegetables and extra tastemaker', 40, 8, 'station_snacks', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&q=80', 1);

  // Beverages
  insertMenuItem.run('m_tea', 'cat_beverages', 'Tea', 'Aromatic freshly brewed cutting chai infused with fresh ginger and cardamom', 12, 3, 'station_beverages', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80', 1);
  insertMenuItem.run('m_coffee', 'cat_beverages', 'Coffee', 'Authentic South Indian hot filter coffee with frothy crema in traditional steel tumbler style', 15, 4, 'station_beverages', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80', 1);
  insertMenuItem.run('m_cold_coffee', 'cat_beverages', 'Cold Coffee', 'Thick creamy chilled coffee blended with chocolate syrup and served chilled', 40, 5, 'station_beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80', 1);
  insertMenuItem.run('m_lime_juice', 'cat_beverages', 'Fresh Lime Juice', 'Refreshing sweet & salty lime cooler freshly squeezed and served on the rocks', 30, 4, 'station_beverages', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80', 1);
  insertMenuItem.run('m_fruit_juice', 'cat_beverages', 'Fresh Fruit Juice', 'Seasonal fresh fruit juice blended without artificial sweeteners', 40, 5, 'station_beverages', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 1);
  insertMenuItem.run('m_buttermilk', 'cat_beverages', 'Buttermilk', 'Spiced churned chaas with roasted cumin, coriander, curry leaves and green chilli hint', 20, 2, 'station_beverages', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80', 1);

  // Seed sample orders KA101 - KA106 as per prompt requirements
  // "The demo student account must initially have an empty My Orders page."
  // "The six sample kitchen orders must belong to other demo students, not the default demo student."
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, student_id, student_name, college_id, pickup_code, total_amount, 
      break_start, break_end, pickup_time, payment_method, payment_status, 
      order_status, flag_reason, admin_message, suggested_pickup_time, is_demo_seed, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, prep_time_minutes, station_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReservation = db.prepare(`
    INSERT INTO slot_reservations (id, slot_time, station_id, order_id, item_count)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Sample Order 1: KA101 | 2 Masala Dosas + Coffee | 12:40 PM | Confirmed
  insertOrder.run('KA101', 'u_demo_s1', 'Rahul Varma', '4MT21CS045', 'PK-7101', 115, '12:30', '13:00', '12:40 PM', 'online', 'paid_demo', 'confirmed', null, null, null, '2026-11-12 12:20:00', '2026-11-12 12:20:00');
  insertOrderItem.run('oi_101_1', 'KA101', 'm_masala_dosa', 'Masala Dosa', 2, 50, 10, 'station_south');
  insertOrderItem.run('oi_101_2', 'KA101', 'm_coffee', 'Coffee', 1, 15, 4, 'station_beverages');
  insertReservation.run('res_101_1', '12:40 PM', 'station_south', 'KA101', 2);
  insertReservation.run('res_101_2', '12:40 PM', 'station_beverages', 'KA101', 1);

  // Sample Order 2: KA102 | Veg Fried Rice | 12:45 PM | Preparing
  insertOrder.run('KA102', 'u_demo_s2', 'Priya Nayak', '4MT22EC089', 'PK-8202', 70, '12:35', '13:05', '12:45 PM', 'counter', 'pending', 'preparing', null, null, null, '2026-11-12 12:22:00', '2026-11-12 12:28:00');
  insertOrderItem.run('oi_102_1', 'KA102', 'm_fried_rice', 'Veg Fried Rice', 1, 70, 12, 'station_meals');
  insertReservation.run('res_102_1', '12:45 PM', 'station_meals', 'KA102', 1);

  // Sample Order 3: KA103 | 2 Idlis + Vada | 12:50 PM | Preparing
  insertOrder.run('KA103', 'u_demo_s3', 'Vikram Rao', '4MT23IS012', 'PK-9303', 50, '12:40', '13:10', '12:50 PM', 'online', 'paid_demo', 'preparing', null, null, null, '2026-11-12 12:25:00', '2026-11-12 12:32:00');
  insertOrderItem.run('oi_103_1', 'KA103', 'm_idli_2', 'Idli (2 pieces)', 1, 30, 5, 'station_south');
  insertOrderItem.run('oi_103_2', 'KA103', 'm_vada', 'Vada', 1, 20, 6, 'station_south');
  insertReservation.run('res_103_1', '12:50 PM', 'station_south', 'KA103', 2);

  // Sample Order 4: KA104 | Sandwich + Cold Coffee | 12:55 PM | Confirmed
  insertOrder.run('KA104', 'u_demo_s4', 'Ananya Shenoy', '4MT22ME034', 'PK-4404', 85, '12:45', '13:15', '12:55 PM', 'online', 'paid_demo', 'confirmed', null, null, null, '2026-11-12 12:30:00', '2026-11-12 12:30:00');
  insertOrderItem.run('oi_104_1', 'KA104', 'm_veg_sandwich', 'Veg Sandwich', 1, 45, 7, 'station_snacks');
  insertOrderItem.run('oi_104_2', 'KA104', 'm_cold_coffee', 'Cold Coffee', 1, 40, 5, 'station_beverages');
  insertReservation.run('res_104_1', '12:55 PM', 'station_snacks', 'KA104', 1);
  insertReservation.run('res_104_2', '12:55 PM', 'station_beverages', 'KA104', 1);

  // Sample Order 5: KA105 | South Indian Meals | 1:00 PM | Ready for Pickup
  insertOrder.run('KA105', 'u_demo_s5', 'Sneha Prabhu', '4MT24CI003', 'PK-5505', 80, '12:50', '13:20', '01:00 PM', 'counter', 'pending', 'ready', null, null, null, '2026-11-12 12:32:00', '2026-11-12 12:46:00');
  insertOrderItem.run('oi_105_1', 'KA105', 'm_meals', 'South Indian Meals', 1, 80, 12, 'station_meals');
  insertReservation.run('res_105_1', '01:00 PM', 'station_meals', 'KA105', 1);

  // Sample Order 6: KA106 | 2 Teas + 2 Samosas | 1:05 PM | Confirmed
  insertOrder.run('KA106', 'u_demo_s6', 'Karthik Bhat', '4MT21EE056', 'PK-6606', 64, '12:55', '13:25', '01:05 PM', 'online', 'paid_demo', 'confirmed', null, null, null, '2026-11-12 12:35:00', '2026-11-12 12:35:00');
  insertOrderItem.run('oi_106_1', 'KA106', 'm_tea', 'Tea', 2, 12, 3, 'station_beverages');
  insertOrderItem.run('oi_106_2', 'KA106', 'm_samosa', 'Samosa', 2, 20, 4, 'station_snacks');
  insertReservation.run('res_106_1', '01:05 PM', 'station_beverages', 'KA106', 2);
  insertReservation.run('res_106_2', '01:05 PM', 'station_snacks', 'KA106', 2);

  // Add sample historical records to fulfill the admin baseline:
  // "Total Orders: 42, Completed Orders: 28, Pending Orders: 9, Delayed Orders: 2, Sample Sales: ₹3,450"
  // Currently active: 6 orders (KA101-KA106: 3 confirmed, 2 preparing, 1 ready).
  // Let's add 2 delayed orders, 1 pending order, and 28 completed orders, and 5 cancelled orders for other students so the admin metrics match accurately.
  
  // 2 Delayed orders
  insertOrder.run('KA107', 'u_demo_s1', 'Rahul Varma', '4MT21CS045', 'PK-7707', 90, '12:20', '12:50', '12:35 PM', 'online', 'paid_demo', 'delayed', 'Peak station overload on Tawa', 'Due to high lunch rush on Dosa Tawa, your order is delayed by 10 minutes. New expected pickup: 12:45 PM.', '12:45 PM', '2026-11-12 12:15:00', '2026-11-12 12:30:00');
  insertOrderItem.run('oi_107_1', 'KA107', 'm_set_dosa', 'Set Dosa', 2, 45, 9, 'station_south');
  
  insertOrder.run('KA108', 'u_demo_s2', 'Priya Nayak', '4MT22EC089', 'PK-8808', 60, '12:30', '13:00', '12:45 PM', 'counter', 'pending', 'delayed', 'Ingredient replenishment in progress', 'Fresh cheese batch currently replenishing. Estimated ready time adjusted by 8 minutes.', '12:53 PM', '2026-11-12 12:20:00', '2026-11-12 12:35:00');
  insertOrderItem.run('oi_108_1', 'KA108', 'm_cheese_sandwich', 'Cheese Sandwich', 1, 60, 8, 'station_snacks');

  // Add 1 more pending order
  insertOrder.run('KA109', 'u_demo_s3', 'Vikram Rao', '4MT23IS012', 'PK-9909', 45, '13:00', '13:30', '01:15 PM', 'counter', 'pending', 'confirmed', null, null, null, '2026-11-12 12:40:00', '2026-11-12 12:40:00');
  insertOrderItem.run('oi_109_1', 'KA109', 'm_lemon_rice', 'Lemon Rice', 1, 45, 5, 'station_meals');

  // Seed 28 completed historical orders
  const completedItems = [
    { name: 'Masala Dosa', price: 50, prep: 10, st: 'station_south', id: 'm_masala_dosa' },
    { name: 'Tea', price: 12, prep: 3, st: 'station_beverages', id: 'm_tea' },
    { name: 'Veg Sandwich', price: 45, prep: 7, st: 'station_snacks', id: 'm_veg_sandwich' },
    { name: 'South Indian Meals', price: 80, prep: 12, st: 'station_meals', id: 'm_meals' },
    { name: 'Cold Coffee', price: 40, prep: 5, st: 'station_beverages', id: 'm_cold_coffee' },
    { name: 'Idli (2 pieces)', price: 30, prep: 5, st: 'station_south', id: 'm_idli_2' },
    { name: 'Veg Puff', price: 25, prep: 4, st: 'station_snacks', id: 'm_veg_puff' },
    { name: 'French Fries', price: 50, prep: 10, st: 'station_snacks', id: 'm_french_fries' }
  ];

  for (let i = 1; i <= 28; i++) {
    const item = completedItems[i % completedItems.length];
    const orderId = `KA_HIST_${100 + i}`;
    const code = `PK-H${1000 + i}`;
    const studentId = `u_demo_s${(i % 6) + 1}`;
    insertOrder.run(
      orderId,
      studentId,
      'Demo Student',
      '4MTDEMO',
      code,
      item.price,
      '11:00',
      '11:30',
      '11:20 AM',
      i % 2 === 0 ? 'online' : 'counter',
      i % 2 === 0 ? 'paid_demo' : 'pending',
      'completed',
      null,
      null,
      null,
      '2026-11-12 10:45:00',
      '2026-11-12 11:20:00'
    );
    insertOrderItem.run(`oi_hist_${i}`, orderId, item.id, item.name, 1, item.price, item.prep, item.st);
  }

  // Seed 5 cancelled orders for realistic reports
  for (let i = 1; i <= 5; i++) {
    const orderId = `KA_CANC_${200 + i}`;
    insertOrder.run(
      orderId,
      'u_demo_s1',
      'Rahul Varma',
      '4MT21CS045',
      `PK-C${i}`,
      40,
      '10:00',
      '10:30',
      '10:15 AM',
      'online',
      'refunded_demo',
      'cancelled',
      'Student requested cancellation',
      'Cancelled upon student schedule change.',
      null,
      '2026-11-12 09:50:00',
      '2026-11-12 10:05:00'
    );
  }

  console.log('Database initialized and seeded successfully with KANTRO AI catalog and demo accounts!');
}
