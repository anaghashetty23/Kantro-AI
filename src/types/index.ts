export type UserRole = 'student' | 'employee' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  username: string; // College ID / Employee ID / Admin ID
  full_name: string;
  department?: string;
  year_of_study?: string;
  payment_preference: 'counter' | 'online';
  status: 'active' | 'inactive';
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  prep_time_minutes: number;
  station_id: string;
  station_name?: string;
  image_url: string;
  is_available: number;
}

export interface Category {
  id: string;
  name: string;
  display_order: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  prep_time_minutes: number;
  station_id: string;
  quantity: number;
  image_url?: string;
}

export interface SlotAnalysis {
  slotTime: string;
  slot24: string;
  isAvailable: boolean;
  reason?: string;
  stationCapacities?: {
    stationId: string;
    stationName: string;
    maxCapacity: number;
    booked: number;
    requested: number;
    remaining: number;
  }[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  prep_time_minutes: number;
  station_id: string;
}

export interface Order {
  id: string;
  student_id: string;
  student_name: string;
  college_id: string;
  pickup_code: string;
  total_amount: number;
  break_start?: string;
  break_end?: string;
  pickup_time: string;
  payment_method: 'counter' | 'online';
  payment_status: 'pending' | 'paid_demo' | 'refunded_demo';
  order_status: 'confirmed' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'delayed';
  flag_reason?: string;
  admin_message?: string;
  suggested_pickup_time?: string;
  is_demo_seed?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  estimatedPrepMinutes?: number;
}

export interface NotificationItem {
  id: string;
  student_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: 'delay' | 'flag' | 'ready' | 'general';
  is_read: number;
  created_at: string;
}

export interface KitchenStation {
  id: string;
  name: string;
  max_capacity_per_slot: number;
  description?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  is_available: number;
}
