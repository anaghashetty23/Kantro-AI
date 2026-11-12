import React, { useState, useEffect } from 'react';
import { Order, KitchenStation } from '../types';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  CheckCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Filter,
  Flame,
  ShoppingBag
} from 'lucide-react';

interface KitchenDashboardProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({ currentTab, onSelectTab }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState<{ stations: KitchenStation[]; slots: any[] }>({
    stations: [],
    slots: []
  });
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchKitchenData = async () => {
    try {
      const [ordersRes, capacityRes] = await Promise.all([
        fetch('/api/kitchen/orders'),
        fetch('/api/kitchen/capacity')
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }

      if (capacityRes.ok) {
        const cData = await capacityRes.json();
        setCapacityData(cData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenData();
    // Live polling every 3 seconds for kitchen incoming stream
    const interval = setInterval(fetchKitchenData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setStatusUpdatingId(orderId);
    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchKitchenData();
      }
    } catch {
      // ignore
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Filter orders based on active tab
  const incomingOrders = orders.filter(o => o.order_status === 'confirmed');
  const preparingOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.order_status));
  const readyOrders = orders.filter(o => o.order_status === 'ready');
  const delayedOrders = orders.filter(o => o.order_status === 'delayed');

  // Stats
  const totalActive = orders.length;
  const newCount = incomingOrders.length;
  const prepCount = preparingOrders.length;
  const readyCount = readyOrders.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
                Kitchen Employee Portal
              </h1>
              <p className="text-xs text-[#777777]">
                KANTRO AI Live Kitchen Dispatch & Preparation Priority
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchKitchenData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-[#292929] text-xs font-bold rounded-xl shadow-2xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          <span>Refresh Live Queue</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            currentTab === 'dashboard'
              ? 'bg-[#FFF5CC] border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-[#777777] uppercase tracking-wider">
            Total Active Orders
          </div>
          <div className="text-3xl font-black text-[#292929] mt-2">{totalActive}</div>
          <div className="text-[11px] text-[#777777] mt-1">Real-time canteen workload</div>
        </button>

        <button
          onClick={() => onSelectTab('incoming')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            currentTab === 'incoming'
              ? 'bg-[#FFF5CC] border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            New Incoming Orders
          </div>
          <div className="text-3xl font-black text-[#292929] mt-2">{newCount}</div>
          <div className="text-[11px] text-amber-800 mt-1">Pending kitchen acceptance</div>
        </button>

        <button
          onClick={() => onSelectTab('preparing')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            currentTab === 'preparing'
              ? 'bg-[#FFF5CC] border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-orange-900 uppercase tracking-wider">
            Orders Being Prepared
          </div>
          <div className="text-3xl font-black text-[#292929] mt-2">{prepCount}</div>
          <div className="text-[11px] text-orange-800 mt-1">Cooking at kitchen stations</div>
        </button>

        <button
          onClick={() => onSelectTab('ready')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            currentTab === 'ready'
              ? 'bg-[#FFF5CC] border-amber-400 ring-2 ring-amber-400/50 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
            Ready for Pickup
          </div>
          <div className="text-3xl font-black text-emerald-800 mt-2">{readyCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Waiting at collection counter</div>
        </button>
      </div>

      {/* Tab Content 1: Kitchen Slots & Capacity Analysis */}
      {currentTab === 'slots' ? (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-stone-100">
            <Layers className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-black text-[#292929]">
                Kitchen Slot Capacity Utilization
              </h2>
              <p className="text-xs text-[#777777]">
                Calculated from real active student orders across stations to prevent break rush bottlenecks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {capacityData.stations.map(st => (
              <div key={st.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="text-xs font-bold text-[#292929] mb-1">{st.name}</div>
                <div className="text-sm font-black text-[#292929]">
                  Max: {st.max_capacity_per_slot} items / slot
                </div>
                <div className="text-[11px] text-[#777777] mt-1">{st.description}</div>
              </div>
            ))}
          </div>

          {capacityData.slots.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-[#777777]">
              No booked slot reservations currently active in the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {capacityData.slots.map(slot => {
                const totalCapAcrossStations = capacityData.stations.reduce(
                  (a, b) => a + b.max_capacity_per_slot,
                  0
                );
                const percent = Math.min(100, Math.round((slot.totalBooked / totalCapAcrossStations) * 100));
                const isFull = percent >= 90;

                return (
                  <div
                    key={slot.slotTime}
                    className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-amber-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-[#292929]">
                          {slot.slotTime}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isFull ? 'Slot Full' : 'Slot Available'}
                        </span>
                      </div>
                      <div className="text-xs text-[#777777]">
                        <strong>{slot.ordersCount}</strong> student order(s) scheduled for this window
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#777777]">
                          Booked Workload: <strong>{slot.totalBooked}</strong> items
                        </span>
                        <span className="font-bold text-[#292929]">
                          Remaining: {Math.max(0, totalCapAcrossStations - slot.totalBooked)} items ({100 - percent}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            percent > 80 ? 'bg-red-500' : percent > 50 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Tab Content 2: Order Queue List / Management */
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-black text-[#292929]">
                {currentTab === 'incoming'
                  ? 'Incoming New Orders'
                  : currentTab === 'preparing'
                  ? 'Orders Currently Cooking'
                  : currentTab === 'ready'
                  ? 'Ready for Student Pickup'
                  : 'Live Kitchen Orders Queue'}
              </h2>
              <p className="text-xs text-[#777777]">
                Sorted by scheduled pickup deadline and preparation priority.
              </p>
            </div>

            <div className="text-xs text-[#777777] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Auto-refreshing live</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-[#777777]">
              Loading kitchen stream...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#292929]">No active orders right now</h3>
              <p className="text-xs text-[#777777] mt-1">
                New student pre-orders will automatically pop up here as they are placed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[#777777] uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3 pr-4">Order ID & Code</th>
                    <th className="pb-3 px-4">Student</th>
                    <th className="pb-3 px-4">Ordered Food Items</th>
                    <th className="pb-3 px-4">Prep Est.</th>
                    <th className="pb-3 px-4">Pickup Deadline</th>
                    <th className="pb-3 px-4">Payment</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders
                    .filter(o => {
                      if (currentTab === 'incoming') return o.order_status === 'confirmed';
                      if (currentTab === 'preparing') return ['accepted', 'preparing'].includes(o.order_status);
                      if (currentTab === 'ready') return o.order_status === 'ready';
                      return true; // Dashboard shows all active
                    })
                    .map(order => {
                      const isUpdating = statusUpdatingId === order.id;

                      return (
                        <tr key={order.id} className="hover:bg-amber-50/40 transition-colors">
                          {/* Order ID & Pickup Code */}
                          <td className="py-4 pr-4">
                            <div className="font-mono font-black text-sm text-[#292929]">
                              #{order.id}
                            </div>
                            <div className="font-mono text-xs font-bold text-amber-900 bg-[#FFF5CC] px-2 py-0.5 rounded inline-block mt-0.5 border border-amber-300">
                              {order.pickup_code}
                            </div>
                            {order.is_demo_seed === 1 && (
                              <div className="text-[10px] text-stone-400 mt-0.5">Demo Queue</div>
                            )}
                          </td>

                          {/* Student */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-[#292929]">{order.student_name}</div>
                            <div className="font-mono text-[#777777] text-[11px]">{order.college_id}</div>
                          </td>

                          {/* Items */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="space-y-0.5">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="font-semibold text-stone-800">
                                  {item.quantity}× {item.item_name}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Prep Time */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-semibold text-stone-800">
                              <Flame className="w-3.5 h-3.5 text-amber-600" />
                              <span>{order.estimatedPrepMinutes || 8} min</span>
                            </div>
                            <div className="text-[10px] text-[#777777]">{order.created_at?.slice(11, 16)} recv</div>
                          </td>

                          {/* Pickup Deadline */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-black text-sm text-[#292929] bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 inline-block">
                              {order.pickup_time}
                            </div>
                          </td>

                          {/* Payment */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-bold text-[#292929]">₹{order.total_amount}</div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                order.payment_status === 'paid_demo'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {order.payment_status === 'paid_demo' ? 'Paid (Demo)' : 'Counter'}
                            </span>
                          </td>

                          {/* Current Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] capitalize ${
                                order.order_status === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.order_status === 'preparing'
                                  ? 'bg-orange-100 text-orange-900'
                                  : order.order_status === 'accepted'
                                  ? 'bg-blue-100 text-blue-900'
                                  : order.order_status === 'delayed'
                                  ? 'bg-red-100 text-red-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {order.order_status}
                            </span>
                          </td>

                          {/* Action Controls */}
                          <td className="py-4 pl-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.order_status === 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'accepted')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  Accept Order
                                </button>
                              )}

                              {(order.order_status === 'accepted' || order.order_status === 'confirmed') && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Start Cooking</span>
                                </button>
                              )}

                              {order.order_status === 'preparing' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'ready')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Mark Ready</span>
                                </button>
                              )}

                              {order.order_status === 'ready' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1.5 bg-[#292929] hover:bg-stone-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Complete Pickup</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
