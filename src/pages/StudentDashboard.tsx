import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { MenuItem, SlotAnalysis, Order } from '../types';
import {
  Clock,
  Sparkles,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Check,
  ChevronRight,
  Flame
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const {
    items: cartItems,
    addItem,
    breakSchedule,
    setBreakSchedule,
    selectedSlot,
    setSelectedSlot
  } = useCart();

  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Slots evaluation state
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [evaluatedSlots, setEvaluatedSlots] = useState<SlotAnalysis[]>([]);
  const [slotsError, setSlotsError] = useState('');
  const [prepInfo, setPrepInfo] = useState<{ totalMinutes: number } | null>(null);

  // Fetch initial popular menu items & active order
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          // Select 4 popular items
          const popular = data.items.filter((i: MenuItem) =>
            ['m_masala_dosa', 'm_idli_2', 'm_veg_sandwich', 'm_coffee'].includes(i.id)
          );
          setPopularItems(popular.length > 0 ? popular : data.items.slice(0, 4));
        }
      })
      .catch(() => {});

    fetchActiveOrder();
  }, []);

  const fetchActiveOrder = () => {
    setLoadingOrders(true);
    fetch('/api/orders/my')
      .then(res => res.json())
      .then(data => {
        if (data.orders) {
          const active = data.orders.find((o: Order) =>
            ['confirmed', 'accepted', 'preparing', 'ready', 'delayed'].includes(o.order_status)
          );
          setActiveOrder(active || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  };

  const handleCheckSlots = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSlotsLoading(true);
    setSlotsError('');

    try {
      const res = await fetch('/api/schedule/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakStart: breakSchedule.breakStart,
          breakEnd: breakSchedule.breakEnd,
          preferredPickup: breakSchedule.preferredPickup,
          cartItems
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSlotsError(data.error || 'Failed to check pickup slots.');
        setEvaluatedSlots([]);
      } else {
        setEvaluatedSlots(data.slots || []);
        setPrepInfo({ totalMinutes: data.totalPrepMinutes });
        
        // If current selected slot is not available or not set, auto-select first available slot
        if (data.slots && data.slots.length > 0) {
          const isCurrentValid = data.slots.some((s: SlotAnalysis) => s.slotTime === selectedSlot && s.isAvailable);
          if (!isCurrentValid) {
            const firstAvail = data.slots.find((s: SlotAnalysis) => s.isAvailable);
            if (firstAvail) {
              setSelectedSlot(firstAvail.slotTime);
            }
          }
        }
      }
    } catch (err: any) {
      setSlotsError('Could not connect to kitchen slot engine.');
    } finally {
      setSlotsLoading(false);
    }
  };

  // Run slot evaluation automatically on mount or break change
  useEffect(() => {
    handleCheckSlots();
  }, [breakSchedule.breakStart, breakSchedule.breakEnd]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Personalized Greeting */}
      <div className="bg-gradient-to-r from-amber-100/60 via-amber-50 to-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-bold text-[#292929] border border-amber-300 mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            KANTRO AI Smart Canteen Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
            Hello, {user?.full_name || 'Student'}!
          </h1>
          <p className="text-base sm:text-lg text-[#777777] font-medium mt-1">
            Plan your break. Order ahead. Enjoy your food.
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-[#777777]">
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-stone-200">
              ID: {user?.username}
            </span>
            <span>•</span>
            <span>{user?.department}</span>
          </div>
        </div>

        {/* Quick Cart Pill */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFF5CC] border border-amber-300 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-[#292929]" />
          </div>
          <div>
            <div className="text-xs text-[#777777] uppercase font-bold tracking-wider">Your Cart</div>
            <div className="text-sm font-black text-[#292929]">
              {cartItems.length === 0 ? 'Empty' : `${cartItems.length} item(s)`}
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('cart')}
            className="ml-2 px-3 py-1.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Open Cart
          </button>
        </div>
      </div>

      {/* Section D: Active Order (if present) */}
      {activeOrder && (
        <div className="bg-white rounded-3xl p-6 border-2 border-amber-400 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#777777] uppercase">Active Pre-Order</span>
                  <span className="font-mono text-sm font-black text-[#292929]">#{activeOrder.id}</span>
                </div>
                <div className="text-sm font-bold text-[#292929]">
                  Pickup Slot: <span className="text-amber-800 bg-[#FFF5CC] px-2 py-0.5 rounded">{activeOrder.pickup_time}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-[#777777]">Pickup Counter Code</div>
                <div className="font-mono text-lg font-black text-[#292929] bg-stone-100 px-3 py-0.5 rounded-lg border border-stone-200">
                  {activeOrder.pickup_code}
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('orders')}
                className="px-4 py-2 bg-[#292929] hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Track Status
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#777777] gap-2">
            <div>
              <span className="font-medium text-[#292929]">Status: </span>
              <span className="capitalize font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                {activeOrder.order_status}
              </span>
            </div>
            <div>
              {activeOrder.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
            </div>
            <div className="font-bold text-[#292929]">
              Total: ₹{activeOrder.total_amount}
            </div>
          </div>
        </div>
      )}

      {/* Section A: Your Break Schedule */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
                <Clock className="w-5 h-5 text-[#292929]" />
              </div>
              <h2 className="text-xl font-black text-[#292929] tracking-tight">
                Your Break Schedule
              </h2>
            </div>
            <p className="text-xs text-[#777777] mt-1">
              Enter your class break window. KANTRO AI calculates kitchen capacity and shows feasible pickup slots.
            </p>
          </div>

          {prepInfo && (
            <div className="text-xs bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-[#777777]">
              Current Cart Prep Time: <span className="font-bold text-[#292929]">{prepInfo.totalMinutes} mins</span>
            </div>
          )}
        </div>

        {/* Manual Break Details Form */}
        <form onSubmit={handleCheckSlots} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1.5">
              Break Start Time
            </label>
            <input
              type="time"
              required
              value={breakSchedule.breakStart}
              onChange={e => setBreakSchedule(prev => ({ ...prev, breakStart: e.target.value }))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1.5">
              Break End Time
            </label>
            <input
              type="time"
              required
              value={breakSchedule.breakEnd}
              onChange={e => setBreakSchedule(prev => ({ ...prev, breakEnd: e.target.value }))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1.5">
              Preferred Pickup Time
            </label>
            <input
              type="time"
              value={breakSchedule.preferredPickup}
              onChange={e => setBreakSchedule(prev => ({ ...prev, preferredPickup: e.target.value }))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={slotsLoading}
              className="w-full py-2.5 px-4 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {slotsLoading ? (
                <span>Checking Workload...</span>
              ) : (
                <>
                  <span>Check Available Pickup Slots</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Slot Results Display */}
        {slotsError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{slotsError}</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#292929] uppercase tracking-wider">
              Available Pickup Slots for Your Break
            </span>
            <span className="text-[11px] text-[#777777]">
              Click a slot to set your scheduled collection time
            </span>
          </div>

          {evaluatedSlots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-[#777777]">
              Set your break start and end time above to view kitchen pickup slots.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {evaluatedSlots.map(slot => {
                const isSelected = selectedSlot === slot.slotTime;
                return (
                  <button
                    key={slot.slotTime}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot.slotTime)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      !slot.isAvailable
                        ? 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#FFF5CC] border-amber-400 ring-2 ring-amber-400/50 shadow-xs cursor-pointer'
                        : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-stone-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-sm text-[#292929]">
                        {slot.slotTime}
                      </span>
                      {slot.isAvailable ? (
                        isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-700" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </div>

                    <div className="text-[11px] mt-1 leading-tight">
                      {slot.isAvailable ? (
                        <span className="font-semibold text-emerald-700">Available</span>
                      ) : (
                        <span className="text-stone-500 line-clamp-2" title={slot.reason}>
                          {slot.reason || 'Full'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot && (
            <div className="mt-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-700" />
                <span>
                  Selected Pickup Time:{' '}
                  <strong className="text-[#292929] font-bold">{selectedSlot}</strong> (Reserved during checkout)
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('menu')}
                className="font-bold text-[#292929] hover:underline"
              >
                Browse Menu to Add Food →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section B: Quick Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('menu')}
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-xs transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-100/70 border border-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-6 h-6 text-[#292929]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#292929]">View Full Menu</div>
              <div className="text-xs text-[#777777]">Browse 26+ fresh canteen items</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#292929] transition-colors" />
        </button>

        <button
          onClick={() => onNavigateTab('assistant')}
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-xs transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FFF5CC] border border-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#292929]">Ask AI Assistant</div>
              <div className="text-xs text-[#777777]">Smart break & budget planning</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#292929] transition-colors" />
        </button>

        <button
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-xs transition-all text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6 text-[#292929]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#292929]">View My Orders</div>
              <div className="text-xs text-[#777777]">Track status & pickup codes</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#292929] transition-colors" />
        </button>
      </section>

      {/* Section C: Popular Food Items */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
              <Flame className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-[#292929] tracking-tight">
              Popular Food Items
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('menu')}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularItems.map(item => {
            const inCart = cartItems.find(i => i.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between"
              >
                <div className="relative h-40 bg-stone-100 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg text-xs font-bold text-[#292929] border border-stone-200">
                    ₹{item.price}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{item.prep_time_minutes} min prep</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#292929] mb-1 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#777777] line-clamp-2 mb-4 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div className="text-base font-black text-[#292929]">
                      ₹{item.price}
                    </div>

                    <button
                      onClick={() => addItem(item, 1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{inCart ? `Add (${inCart.quantity})` : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
