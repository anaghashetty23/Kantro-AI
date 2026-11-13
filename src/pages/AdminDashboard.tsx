import React, { useState, useEffect } from 'react';
import { Order, MenuItem, Category, KitchenStation, InventoryItem, User } from '../types';
import { apiFetch } from '../utils/csrf';
import {
  ShieldCheck,
  LayoutDashboard,
  Clock,
  UtensilsCrossed,
  Layers,
  Package,
  Users,
  FileBarChart,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Send,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Bell
} from 'lucide-react';

interface AdminDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

function formatOrderTime12h(ts?: string): string {
  if (!ts) return '-';
  const hhmm = ts.slice(11, 16);
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return ts;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || '00'} ${suffix}`;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTab, onSelectTab }) => {
  // Stats
  const [stats, setStats] = useState<any>({
    totalOrders: 42,
    completedOrders: 28,
    pendingOrders: 6,
    preparingOrders: 5,
    readyOrders: 1,
    delayedOrders: 2,
    totalSales: 3450,
    isDemoStats: true
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [orderSearchId, setOrderSearchId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Problematic Order Action Modal State
  const [flagModalOrder, setFlagModalOrder] = useState<Order | null>(null);
  const [flagAction, setFlagAction] = useState<'flag' | 'delay' | 'cancel'>('delay');
  const [flagReason, setFlagReason] = useState('Peak station volume on Dosa Tawa');
  const [flagMessage, setFlagMessage] = useState(
    'Due to high lunch rush on Dosa Tawa, your order is delayed by 10 minutes. Please accept updated slot.'
  );
  const [suggestedPickupTime, setSuggestedPickupTime] = useState('12:55 PM');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Menu Management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    categoryId: 'cat_south',
    description: '',
    price: 50,
    prepTimeMinutes: 10,
    stationId: 'station_south',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80'
  });

  // Capacity & Stations
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [demoWorkloads, setDemoWorkloads] = useState<any[]>([]);
  const [editingCapacity, setEditingCapacity] = useState<{ [id: string]: number }>({});
  const [stationSaving, setStationSaving] = useState(false);

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Accounts
  const [accounts, setAccounts] = useState<User[]>([]);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);

  // Reports
  const [reports, setReports] = useState<any>({
    totalOrders: 42,
    completedOrders: 28,
    cancelledOrders: 1,
    delayedOrders: 2,
    totalSales: 3450,
    isDemoReport: true,
    popularItems: []
  });

  const [loading, setLoading] = useState(true);

  // Fetch all admin data
  const fetchAllData = async () => {
    try {
      const [statsRes, ordersRes, menuRes, stationsRes, invRes, accRes, repRes, notifRes] =
        await Promise.all([
          apiFetch('/api/admin/stats'),
          apiFetch(`/api/admin/orders?status=${orderFilterStatus}&collegeId=${orderSearchId}`),
          apiFetch('/api/menu'),
          apiFetch('/api/admin/stations'),
          apiFetch('/api/admin/inventory'),
          apiFetch('/api/admin/accounts'),
          apiFetch('/api/admin/reports'),
          apiFetch('/api/notifications')
        ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }
      if (menuRes.ok) {
        const mData = await menuRes.json();
        setMenuItems(mData.items || []);
        setCategories(mData.categories || []);
      }
      if (stationsRes.ok) {
        const sData = await stationsRes.json();
        setStations(sData.stations || []);
        setDemoWorkloads(sData.demoWorkloads || []);
        const capMap: { [id: string]: number } = {};
        sData.stations.forEach((s: KitchenStation) => {
          capMap[s.id] = s.max_capacity_per_slot;
        });
        setEditingCapacity(capMap);
      }
      if (invRes.ok) {
        const iData = await invRes.json();
        setInventory(iData.inventory || []);
      }
      if (accRes.ok) {
        const aData = await accRes.json();
        setAccounts(aData.accounts || []);
        setDemoAccounts(aData.demoAccounts || []);
      }
      if (repRes.ok) {
        setReports(await repRes.json());
      }
      if (notifRes.ok) {
        const nData = await notifRes.json();
        setNotifications(nData.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [orderFilterStatus, orderSearchId]);

  // Handle problematic order actions (flag, delay, cancel)
  const handleExecuteOrderAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalOrder) return;

    setIsSubmittingAction(true);
    try {
      const res = await apiFetch(`/api/admin/orders/${flagModalOrder.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: flagAction,
          flagReason,
          message: flagMessage,
          suggestedPickupTime: flagAction === 'delay' ? suggestedPickupTime : undefined
        })
      });

      if (res.ok) {
        setFlagModalOrder(null);
        fetchAllData();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Menu Item Save / Update / Delete / Toggle
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingMenuItem ? `/api/menu/${editingMenuItem.id}` : '/api/menu';
    const method = editingMenuItem ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuForm)
      });
      if (res.ok) {
        setShowAddMenuModal(false);
        setEditingMenuItem(null);
        fetchAllData();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const res = await apiFetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: item.is_available === 1 ? 0 : 1 })
      });
      if (res.ok) fetchAllData();
    } catch {
      // ignore
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this menu item?')) return;
    try {
      const res = await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAllData();
    } catch {
      // ignore
    }
  };

  // Station Capacity Save
  const handleSaveStationCapacity = async (stationId: string) => {
    setStationSaving(true);
    try {
      const res = await apiFetch(`/api/admin/stations/${stationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCapacityPerSlot: editingCapacity[stationId] })
      });
      if (res.ok) {
        alert('Station capacity updated! Scheduling engine adjusted.');
        fetchAllData();
      }
    } catch {
      // ignore
    } finally {
      setStationSaving(false);
    }
  };

  // Inventory toggle
  const handleToggleInventory = async (item: InventoryItem) => {
    try {
      await apiFetch(`/api/admin/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: item.is_available === 1 ? 0 : 1 })
      });
      fetchAllData();
    } catch {
      // ignore
    }
  };

  // Account status toggle
  const handleToggleAccountStatus = async (userAcc: User) => {
    try {
      await apiFetch(`/api/admin/accounts/${userAcc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: userAcc.status === 'active' ? 'inactive' : 'active' })
      });
      fetchAllData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-800 border border-purple-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
                Canteen Administrator Console
              </h1>
              <p className="text-xs text-[#777777]">
                Live Operational Control, Menu & Capacity Management, and Problem Recovery
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAllData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-[#292929] text-xs font-bold rounded-xl shadow-2xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
          <span>Refresh All Canteen Data</span>
        </button>
      </div>

      {/* Nav Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'all_orders', label: 'All Orders', icon: Clock },
          { id: 'menu_mgmt', label: 'Menu Management', icon: UtensilsCrossed },
          { id: 'capacity_mgmt', label: 'Kitchen Capacity', icon: Layers },
          { id: 'inventory_mgmt', label: 'Inventory', icon: Package },
          { id: 'accounts_mgmt', label: 'Accounts', icon: Users },
          { id: 'reports', label: 'Reports', icon: FileBarChart }
        ].map(t => {
          const Icon = t.icon;
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#292929] text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-[#292929] hover:bg-stone-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================== VIEW 1: OVERVIEW ===================== */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#292929] uppercase tracking-wider">
                Demo Canteen Statistics
              </h2>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300">
                DEMO DATA
              </span>
            </div>
            {stats.liveStats && stats.liveStats.totalOrders > 0 && (
              <div className="text-xs text-[#777777]">
                Live Student Orders (Separate): <strong>{stats.liveStats.totalOrders}</strong> (₹{stats.liveStats.totalSales})
              </div>
            )}
          </div>

          {/* Demo Operational Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-[#777777] uppercase">Total Orders</div>
              <div className="text-2xl font-black text-[#292929] mt-1">{stats.totalOrders}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">Demo Statistics</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Completed</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{stats.completedOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Collected (Demo)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-amber-700 uppercase">Pending Orders</div>
              <div className="text-2xl font-black text-amber-700 mt-1">{stats.pendingOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Awaiting prep (Demo)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-orange-700 uppercase">Preparing</div>
              <div className="text-2xl font-black text-orange-700 mt-1">{stats.preparingOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Cooking now (Demo)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Ready for Pickup</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{stats.readyOrders ?? 1}</div>
              <div className="text-[10px] text-stone-400 mt-1">At counter (Demo)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-red-700 uppercase">Delayed Orders</div>
              <div className="text-2xl font-black text-red-700 mt-1">{stats.delayedOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Rescue My Break</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] font-bold text-[#292929] uppercase">Demo Sales</div>
              <div className="text-2xl font-black text-[#292929] mt-1">₹{stats.totalSales.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">Sample revenue</div>
            </div>
          </div>

          {/* Administrator Notifications Section */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#292929] flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Administrator Notifications
              </h3>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300">
                Demonstration Notifications
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-xs text-[#777777] py-2">No administrator alerts right now.</div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-2xl bg-[#FFF5CC]/45 border border-amber-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#292929] flex items-center gap-2">
                        <span>{n.title}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-white text-amber-900 border border-amber-300">
                          DEMO DATA
                        </span>
                      </div>
                      <p className="text-stone-700 mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-[#777777] whitespace-nowrap">
                      {formatOrderTime12h(n.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Problematic Orders Notice Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-[#292929] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Order Management & Delay Recovery (Rescue My Break)
                </h3>
                <p className="text-xs text-[#777777] mt-1">
                  If an order has a missing ingredient, delayed tawa, or requires clarification, use the "Flag / Delay" tool in All Orders to message the student with an alternative pickup slot.
                </p>
              </div>
              <button
                onClick={() => onSelectTab('all_orders')}
                className="px-4 py-2 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                Manage Orders →
              </button>
            </div>
          </div>

          {/* Live Recent Orders Preview */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#292929]">Recent Canteen Pre-Orders</h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                Includes Demo Orders
              </span>
            </div>
            <div className="divide-y divide-stone-100 text-xs">
              {orders.slice(0, 7).map(o => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#292929]">#{o.id}</span>
                    {o.is_demo_seed === 1 && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#FFF5CC] text-amber-900 border border-amber-300">
                        DEMO
                      </span>
                    )}
                    <span className="font-semibold">{o.student_name} ({o.college_id})</span>
                    <span className="text-[#777777]">• Pickup: {o.pickup_time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">₹{o.total_amount}</span>
                    <span className="px-2 py-0.5 rounded font-bold capitalize bg-stone-100 text-stone-800">
                      {o.order_status === 'ready' ? 'Ready for Pickup' : o.order_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: ALL ORDERS ===================== */}
      {currentTab === 'all_orders' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-black text-[#292929]">All Student Orders</h2>
              <p className="text-xs text-[#777777]">
                Filter, inspect details, flag delays, send student notifications, and trigger Rescue My Break.
              </p>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={orderFilterStatus}
                onChange={e => setOrderFilterStatus(e.target.value)}
                className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-[#292929] focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={orderSearchId}
                  onChange={e => setOrderSearchId(e.target.value)}
                  placeholder="Search College ID..."
                  className="pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-[#777777] uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3 pr-4">Order ID & Code</th>
                  <th className="pb-3 px-4">Student & College ID</th>
                  <th className="pb-3 px-4">Food Items</th>
                  <th className="pb-3 px-4">Order & Pickup Time</th>
                  <th className="pb-3 px-4">Payment Method & Status</th>
                  <th className="pb-3 px-4">Order Status</th>
                  <th className="pb-3 pl-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-mono font-black text-sm text-[#292929]">#{order.id}</div>
                      <div className="font-mono text-xs font-bold text-amber-900 bg-[#FFF5CC] px-1.5 py-0.2 rounded inline-block">
                        {order.pickup_code}
                      </div>
                      {order.is_demo_seed === 1 && (
                        <div className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded inline-block mt-1 ml-1">
                          DEMO DATA
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#292929]">{order.student_name}</div>
                      <div className="font-mono text-stone-500 text-[11px]">{order.college_id}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="line-clamp-2">
                        {order.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'Item details'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#292929]">Pickup: {order.pickup_time}</div>
                      <div className="text-[10px] text-stone-500">Order: {formatOrderTime12h(order.created_at)}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#292929]">
                        ₹{order.total_amount} • {order.payment_method === 'online' ? 'Online' : 'Counter'}
                      </div>
                      <div className="text-[10px] text-stone-500 capitalize">
                        {order.payment_status === 'paid_demo'
                          ? 'Paid (Demo)'
                          : order.payment_status === 'refunded_demo'
                          ? 'Refunded (Demo)'
                          : 'Pending'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] capitalize ${
                          order.order_status === 'delayed'
                            ? 'bg-red-100 text-red-900'
                            : order.order_status === 'ready'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.order_status === 'completed'
                            ? 'bg-stone-200 text-stone-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {order.order_status === 'ready' ? 'Ready for Pickup' : order.order_status}
                      </span>
                    </td>

                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#292929] transition-colors"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setFlagModalOrder(order);
                            setFlagAction('delay');
                            setSuggestedPickupTime('12:55 PM');
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-[#292929] font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Flag / Delay</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ===================== VIEW 3: MENU MANAGEMENT ===================== */}
      {currentTab === 'menu_mgmt' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-black text-[#292929]">Menu Management</h2>
              <p className="text-xs text-[#777777]">
                Add, edit prices, update preparation times, or toggle dish availability instantly.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingMenuItem(null);
                setMenuForm({
                  name: '',
                  categoryId: 'cat_south',
                  description: '',
                  price: 50,
                  prepTimeMinutes: 10,
                  stationId: 'station_south',
                  imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80'
                });
                setShowAddMenuModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Menu Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-300 transition-all flex items-start gap-3"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0 border"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-sm text-[#292929]">{item.name}</h4>
                    <span className="font-black text-sm text-[#292929]">₹{item.price}</span>
                  </div>
                  <div className="text-xs text-[#777777] mt-0.5">{item.category_name}</div>
                  <div className="text-xs text-amber-800 font-semibold mt-1">
                    Prep: {item.prep_time_minutes} min
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-100">
                    <button
                      onClick={() => handleToggleItemAvailability(item)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        item.is_available === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.is_available === 1 ? 'Available' : 'Unavailable'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingMenuItem(item);
                          setMenuForm({
                            name: item.name,
                            categoryId: item.category_id,
                            description: item.description,
                            price: item.price,
                            prepTimeMinutes: item.prep_time_minutes,
                            stationId: item.station_id,
                            imageUrl: item.image_url
                          });
                          setShowAddMenuModal(true);
                        }}
                        className="p-1 text-stone-500 hover:text-[#292929]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-1 text-stone-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===================== VIEW 4: KITCHEN CAPACITY ===================== */}
      {currentTab === 'capacity_mgmt' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-[#292929]">Kitchen Station Capacity Limits</h2>
              <p className="text-xs text-[#777777]">
                Configure maximum preparation slots per station. Updates directly recalibrate the student pickup scheduling engine.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300 self-start sm:self-auto">
              Demo Workload Snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stations.map(st => {
              const demoLoad = demoWorkloads.find(w => w.station_id === st.id);
              const maxCap = demoLoad ? demoLoad.max_capacity : st.max_capacity_per_slot;
              const currentLoad = demoLoad ? demoLoad.current_workload : 0;
              const remainingCap = demoLoad ? demoLoad.remaining_capacity : maxCap;
              const loadPct = Math.min(100, Math.round((currentLoad / maxCap) * 100));
              const statusLabel = demoLoad ? demoLoad.status_label : 'Available';

              return (
                <div key={st.id} className="bg-stone-50 rounded-2xl p-6 border border-stone-200 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-[#292929]">
                        {demoLoad ? demoLoad.display_name : st.name}
                      </h3>
                      <p className="text-xs text-[#777777] mt-0.5">{st.description}</p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        statusLabel === 'Limited'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Demonstration Workload & Remaining Capacity */}
                  {demoLoad && (
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 uppercase text-[10px]">
                          DEMO DATA • Station Load
                        </span>
                        <span className="font-bold text-[#292929]">
                          Remaining: {remainingCap} / {maxCap}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#777777]">
                        <span>Maximum Capacity: <strong className="text-[#292929]">{maxCap}</strong></span>
                        <span>Current Workload: <strong className="text-[#292929]">{currentLoad}</strong></span>
                      </div>
                      <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            statusLabel === 'Limited' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${loadPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#292929] mb-1">
                        Live Scheduling Max Orders / Slot:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingCapacity[st.id] || st.max_capacity_per_slot}
                        onChange={e =>
                          setEditingCapacity(prev => ({
                            ...prev,
                            [st.id]: parseInt(e.target.value, 10) || 1
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm font-bold text-[#292929] focus:outline-hidden"
                      />
                    </div>

                    <button
                      onClick={() => handleSaveStationCapacity(st.id)}
                      disabled={stationSaving}
                      className="self-end py-2 px-4 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================== VIEW 5: INVENTORY ===================== */}
      {currentTab === 'inventory_mgmt' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-[#292929]">Canteen Ingredient Inventory</h2>
              <p className="text-xs text-[#777777]">
                Track raw materials and ingredient stocks. Unavailable ingredients protect students from ordering sold-out recipes.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300 self-start sm:self-auto">
              Demo Inventory Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map(inv => {
              const isLow = inv.quantity <= inv.low_stock_threshold;
              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#292929]">{inv.name}</h4>
                        <span className="text-[10px] font-bold uppercase text-stone-400">DEMO DATA</span>
                      </div>
                      {inv.is_available === 0 ? (
                        <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                          Low Stock
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          In Stock
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-[#292929] mt-2">
                      {inv.quantity} <span className="text-xs font-normal text-[#777777]">{inv.unit}</span>
                    </div>
                    <div className="text-[11px] text-[#777777] mt-0.5">
                      Threshold: {inv.low_stock_threshold} {inv.unit}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-3">
                    <span className="text-xs text-[#777777]">Availability:</span>
                    <button
                      onClick={() => handleToggleInventory(inv)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                        inv.is_available === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {inv.is_available === 1 ? 'In Stock' : 'Mark Out of Stock'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================== VIEW 6: ACCOUNTS ===================== */}
      {currentTab === 'accounts_mgmt' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-[#292929]">Student & Employee Accounts</h2>
              <p className="text-xs text-[#777777]">
                View demo student & kitchen staff showcase records alongside active login accounts.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300 self-start sm:self-auto">
              Demo Directory + System Accounts
            </span>
          </div>

          {/* Demo Showcase Accounts */}
          {demoAccounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#292929]">Demo Student Accounts</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FFF5CC] text-amber-900 border border-amber-300">
                    DEMO DATA
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[#777777] uppercase text-[10px] font-bold">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Department</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {demoAccounts
                      .filter(a => a.role === 'student')
                      .map(acc => (
                        <tr key={acc.id}>
                          <td className="py-2.5 font-bold text-[#292929]">{acc.full_name}</td>
                          <td className="py-2.5 text-stone-700 font-semibold">{acc.department}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                acc.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {acc.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#292929]">Demo Kitchen Employee Accounts</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FFF5CC] text-amber-900 border border-amber-300">
                    DEMO DATA
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[#777777] uppercase text-[10px] font-bold">
                      <th className="pb-2">Employee</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {demoAccounts
                      .filter(a => a.role === 'employee')
                      .map(acc => (
                        <tr key={acc.id}>
                          <td className="py-2.5 font-bold text-[#292929]">{acc.full_name}</td>
                          <td className="py-2.5 text-stone-700 font-semibold">{acc.department}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                acc.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {acc.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Login Accounts */}
          <div>
            <h3 className="font-bold text-sm text-[#292929] mb-3">Registered Login Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[#777777] uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3 pr-4">User ID & Role</th>
                    <th className="pb-3 px-4">Full Name</th>
                    <th className="pb-3 px-4">Login Identifier (USN / Emp ID)</th>
                    <th className="pb-3 px-4">Department / Year</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {accounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-stone-50/70">
                      <td className="py-3 pr-4">
                        <span className="font-bold text-[#292929]">{acc.id}</span>
                        <div className="text-[10px] uppercase font-bold text-stone-500 mt-0.5">
                          {acc.role}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#292929]">{acc.full_name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-stone-700">{acc.username}</td>
                      <td className="py-3 px-4 text-stone-600">
                        {acc.department || '-'} {acc.year_of_study ? `(${acc.year_of_study})` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            acc.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {acc.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleAccountStatus(acc)}
                            className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                          >
                            {acc.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ===================== VIEW 7: REPORTS ===================== */}
      {currentTab === 'reports' && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-[#292929]">Canteen Operational Reports</h2>
              <p className="text-xs text-[#777777]">
                Aggregated order volumes, completed sales, and top popular food items.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF5CC] text-amber-900 border border-amber-300 self-start sm:self-auto">
              Demo Report Data
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="text-xs text-[#777777] font-semibold">Total Orders Today</div>
              <div className="text-3xl font-black text-[#292929] mt-1">{reports.totalOrders}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">DEMO DATA</div>
            </div>
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="text-xs text-emerald-700 font-semibold">Completed Orders</div>
              <div className="text-3xl font-black text-emerald-700 mt-1">{reports.completedOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Demo sample</div>
            </div>
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="text-xs text-red-700 font-semibold">Cancelled Orders</div>
              <div className="text-3xl font-black text-red-700 mt-1">{reports.cancelledOrders}</div>
              <div className="text-[10px] text-stone-400 mt-1">Demo sample</div>
            </div>
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="text-xs text-amber-700 font-semibold">Delayed Orders</div>
              <div className="text-3xl font-black text-amber-700 mt-1">{reports.delayedOrders ?? 2}</div>
              <div className="text-[10px] text-stone-400 mt-1">Demo sample</div>
            </div>
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="text-xs text-[#292929] font-semibold">Demo Sales</div>
              <div className="text-3xl font-black text-[#292929] mt-1">₹{reports.totalSales.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">Sample revenue</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#292929]">Top Popular Food Items</h3>
              <span className="text-xs text-[#777777]">
                Popular: <strong className="text-[#292929]">Masala Dosa</strong> • 2nd: <strong className="text-[#292929]">Veg Fried Rice</strong>
              </span>
            </div>
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[#777777] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Demo Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reports.popularItems?.map((pi: any, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-bold text-[#292929]">
                        {pi.item_name}
                        {pi.rank && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.2 rounded bg-[#FFF5CC] text-amber-900 border border-amber-300">
                            {pi.rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{pi.total_sold} servings</td>
                      <td className="py-3 px-4 text-right font-black text-[#292929]">₹{pi.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ===================== PROBLEM ORDER / FLAG MODAL ===================== */}
      {flagModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-black text-[#292929]">
                  Manage Problematic Order #{flagModalOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setFlagModalOrder(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteOrderAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#292929] uppercase mb-1">
                  Select Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlagAction('delay')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-colors ${
                      flagAction === 'delay'
                        ? 'bg-[#F4C542] text-[#292929] border-amber-400'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Mark as Delayed
                  </button>

                  <button
                    type="button"
                    onClick={() => setFlagAction('flag')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-colors ${
                      flagAction === 'flag'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Flag / Note
                  </button>

                  <button
                    type="button"
                    onClick={() => setFlagAction('cancel')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-colors ${
                      flagAction === 'cancel'
                        ? 'bg-red-100 text-red-900 border-red-300'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#292929] uppercase mb-1">
                  Reason for Flagging
                </label>
                <select
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-[#292929]"
                >
                  <option value="Peak station volume on Dosa Tawa">Peak station volume on Dosa Tawa</option>
                  <option value="Selected item is currently unavailable">Selected item is currently unavailable</option>
                  <option value="Ingredient is out of stock">Ingredient is out of stock</option>
                  <option value="Requested pickup time cannot be met">Requested pickup time cannot be met</option>
                  <option value="Order details require student clarification">Order details require clarification</option>
                </select>
              </div>

              {flagAction === 'delay' && (
                <div>
                  <label className="block font-bold text-[#292929] uppercase mb-1">
                    Suggested Alternative Pickup Slot (Rescue My Break)
                  </label>
                  <input
                    type="text"
                    value={suggestedPickupTime}
                    onChange={e => setSuggestedPickupTime(e.target.value)}
                    placeholder="e.g. 12:55 PM"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-[#292929]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#292929] uppercase mb-1">
                  Message Sent Directly to Student's App
                </label>
                <textarea
                  rows={3}
                  value={flagMessage}
                  onChange={e => setFlagMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFlagModalOrder(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#292929] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold rounded-xl shadow-xs"
                >
                  {isSubmittingAction ? 'Updating...' : 'Send Notice to Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== VIEW ORDER DETAILS MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-black text-[#292929]">
                Order Details #{selectedOrder.id}
              </h3>
              <button onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#777777]">Student Name:</span>
                <span className="font-bold">{selectedOrder.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">College ID / USN:</span>
                <span className="font-mono font-bold">{selectedOrder.college_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Pickup Code:</span>
                <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 rounded">
                  {selectedOrder.pickup_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Pickup Time:</span>
                <span className="font-bold">{selectedOrder.pickup_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Payment:</span>
                <span className="font-semibold capitalize">
                  {selectedOrder.payment_method} ({selectedOrder.payment_status})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Current Status:</span>
                <span className="font-bold capitalize">{selectedOrder.order_status}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100">
              <div className="font-bold text-stone-800 mb-1">Items:</div>
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[#292929] py-0.5">
                  <span>{item.quantity}× {item.item_name}</span>
                  <span className="font-bold">₹{item.unit_price * item.quantity}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-stone-100 flex justify-between font-black text-sm">
                <span>Total Amount:</span>
                <span>₹{selectedOrder.total_amount}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ===================== ADD / EDIT MENU MODAL ===================== */}
      {showAddMenuModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-black text-[#292929]">
                {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setShowAddMenuModal(false)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#292929] mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={menuForm.name}
                  onChange={e => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Category</label>
                <select
                  value={menuForm.categoryId}
                  onChange={e => setMenuForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#292929] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={menuForm.price}
                    onChange={e =>
                      setMenuForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#292929] mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    required
                    value={menuForm.prepTimeMinutes}
                    onChange={e =>
                      setMenuForm(prev => ({
                        ...prev,
                        prepTimeMinutes: parseInt(e.target.value, 10) || 5
                      }))
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Kitchen Station</label>
                <select
                  value={menuForm.stationId}
                  onChange={e => setMenuForm(prev => ({ ...prev, stationId: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="station_south">Dosa / South Indian Station</option>
                  <option value="station_meals">Meals / Rice Station</option>
                  <option value="station_snacks">Snacks Station</option>
                  <option value="station_beverages">Beverages Station</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Image URL</label>
                <input
                  type="text"
                  value={menuForm.imageUrl}
                  onChange={e => setMenuForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-[#292929] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={menuForm.description}
                  onChange={e => setMenuForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="px-4 py-2 bg-stone-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold rounded-xl"
                >
                  {editingMenuItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
