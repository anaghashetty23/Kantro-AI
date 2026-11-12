import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UtensilsCrossed,
  ArrowRight,
  RefreshCw,
  Bell,
  Sparkles,
  Check
} from 'lucide-react';

interface MyOrdersPageProps {
  onGoToMenu: () => void;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onGoToMenu }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [acceptingDelayId, setAcceptingDelayId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const fetchMyOrders = async () => {
    try {
      const res = await fetch('/api/orders/my');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
    // Reliable polling every 4 seconds for live order status updates
    const interval = setInterval(fetchMyOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptDelay = async (orderId: string) => {
    setAcceptingDelayId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept-delay`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setToastMsg(`Break Rescheduled! New pickup confirmed for ${data.newPickupTime}.`);
        fetchMyOrders();
        setTimeout(() => setToastMsg(''), 5000);
      }
    } catch {
      // ignore
    } finally {
      setAcceptingDelayId(null);
    }
  };

  const activeOrders = orders.filter(o =>
    ['confirmed', 'accepted', 'preparing', 'ready', 'delayed'].includes(o.order_status)
  );

  const completedOrders = orders.filter(o => o.order_status === 'completed');
  const cancelledOrders = orders.filter(o => o.order_status === 'cancelled');

  const displayedOrders =
    activeTab === 'active'
      ? activeOrders
      : activeTab === 'completed'
      ? completedOrders
      : cancelledOrders;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Confirmed
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            Accepted by Kitchen
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 animate-pulse">
            Cooking / Preparing
          </span>
        );
      case 'ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            Ready for Pickup!
          </span>
        );
      case 'delayed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Delayed
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-red-600">
            Cancelled
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-stone-100">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
              <Clock className="w-5 h-5 text-[#292929]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
              My Canteen Orders
            </h1>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Live order milestones and pickup collection codes. Automatically syncs with kitchen updates.
          </p>
        </div>

        <button
          onClick={fetchMyOrders}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-[#777777] hover:text-[#292929] bg-white px-3 py-1.5 rounded-xl border border-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'bg-[#F4C542] text-[#292929] shadow-2xs'
              : 'text-[#777777] hover:bg-stone-100'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-[#F4C542] text-[#292929] shadow-2xs'
              : 'text-[#777777] hover:bg-stone-100'
          }`}
        >
          Completed ({completedOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-[#F4C542] text-[#292929] shadow-2xs'
              : 'text-[#777777] hover:bg-stone-100'
          }`}
        >
          Cancelled ({cancelledOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[#777777]">
          Loading your personal order history...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-200">
          <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#292929]">
            {activeTab === 'active'
              ? "You haven't placed any orders yet."
              : `No ${activeTab} orders found.`}
          </h2>
          <p className="text-xs text-[#777777] mt-1 mb-6">
            Pre-order your favorite meal now and collect it right on your class break.
          </p>
          <button
            onClick={onGoToMenu}
            className="px-6 py-2.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Explore Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map(order => {
            const isDelayed = order.order_status === 'delayed';
            const isReady = order.order_status === 'ready';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border p-6 transition-all ${
                  isReady
                    ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
                    : isDelayed
                    ? 'border-red-300 shadow-sm'
                    : 'border-stone-200 shadow-2xs'
                }`}
              >
                {/* Rescue My Break Banner if delayed or flagged */}
                {(isDelayed || order.admin_message) && (
                  <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900">
                    <div className="flex items-center gap-2 font-black text-sm mb-1 text-red-900">
                      <Sparkles className="w-4 h-4 text-red-600" />
                      <span>Rescue My Break Recovery Alert</span>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed">
                      {order.admin_message || order.flag_reason || 'Order is delayed due to high kitchen volume.'}
                    </p>

                    {order.suggested_pickup_time && isDelayed && (
                      <div className="mt-3 pt-3 border-t border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs">
                          Updated Estimated Pickup Slot:{' '}
                          <strong className="font-bold text-red-950">
                            {order.suggested_pickup_time}
                          </strong>
                        </div>
                        <button
                          onClick={() => handleAcceptDelay(order.id)}
                          disabled={acceptingDelayId === order.id}
                          className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
                        >
                          {acceptingDelayId === order.id ? 'Rescheduling...' : 'Accept Rescheduled Slot'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Top Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-black text-[#292929]">
                      #{order.id}
                    </span>
                    {getStatusBadge(order.order_status)}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-[#777777] uppercase font-bold">
                        Pickup Code
                      </div>
                      <div className="font-mono font-black text-sm bg-stone-100 text-[#292929] px-2.5 py-0.5 rounded-lg border border-stone-200">
                        {order.pickup_code}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items & Times */}
                <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[#777777] font-semibold mb-1.5">Ordered Items:</div>
                    <div className="space-y-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-stone-800">
                          <span>
                            {item.quantity}× {item.item_name}
                          </span>
                          <span className="font-semibold">₹{item.unit_price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 sm:pl-4 sm:border-l border-stone-100">
                    <div className="flex justify-between">
                      <span className="text-[#777777]">Scheduled Pickup Slot:</span>
                      <span className="font-black text-[#292929] bg-[#FFF5CC] px-2 py-0.5 rounded">
                        {order.pickup_time}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#777777]">Order Time:</span>
                      <span className="text-stone-700">{order.created_at}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#777777]">Payment Method:</span>
                      <span className="capitalize font-semibold text-stone-800">
                        {order.payment_method === 'online' ? 'Pay Online (Demo)' : 'Pay at Counter'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#777777]">Payment Status:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                          order.payment_status === 'paid_demo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.payment_status === 'refunded_demo'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {order.payment_status === 'paid_demo'
                          ? 'Paid (Demo)'
                          : order.payment_status === 'refunded_demo'
                          ? 'Refunded (Demo)'
                          : 'Pending / Counter'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer total */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="text-[#777777]">
                    {isReady && (
                      <span className="font-bold text-emerald-700">
                        ⚡ Food is waiting at the counter. Show code {order.pickup_code}.
                      </span>
                    )}
                  </div>
                  <div className="font-black text-sm text-[#292929]">
                    Total: ₹{order.total_amount}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
