import React from 'react';
import { Order } from '../types';
import { CheckCircle2, Clock, QrCode, ArrowRight, UtensilsCrossed, ShieldCheck } from 'lucide-react';

interface OrderConfirmationPageProps {
  order: Order;
  onTrackInOrders: () => void;
  onGoToMenu: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order,
  onTrackInOrders,
  onGoToMenu
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight mb-2">
          Your Order is Confirmed!
        </h1>
        <p className="text-sm text-[#777777] max-w-md mx-auto mb-6">
          Your food is being prepared. Please collect it at your scheduled pickup time.
        </p>

        {/* Pickup Code Hero Box */}
        <div className="bg-gradient-to-br from-[#FFF5CC] to-amber-50 rounded-2xl p-6 border border-amber-300 max-w-sm mx-auto mb-8 shadow-xs">
          <div className="text-xs text-amber-900 font-bold uppercase tracking-wider mb-1">
            Canteen Counter Pickup Code
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#292929] tracking-wider font-mono my-2">
            {order.pickup_code}
          </div>
          <div className="text-xs text-[#777777]">
            Show this code at the canteen collection counter
          </div>
        </div>

        {/* Order Details Receipt */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-left text-xs space-y-3 mb-8">
          <div className="flex justify-between items-center pb-2 border-b border-stone-200">
            <span className="text-[#777777]">Order Reference ID</span>
            <span className="font-mono font-bold text-sm text-[#292929]">#{order.id}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#777777]">Scheduled Pickup Time</span>
            <span className="font-black text-sm text-[#292929] bg-[#FFF5CC] px-2.5 py-0.5 rounded border border-amber-300">
              {order.pickup_time}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#777777]">Payment Method</span>
            <span className="font-bold text-[#292929] capitalize">
              {order.payment_method === 'online' ? 'Pay Online (Demo)' : 'Pay at Counter'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#777777]">Payment Status</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                order.payment_status === 'paid_demo'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {order.payment_status === 'paid_demo' ? 'Paid (Demo)' : 'Pending / Counter'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#777777]">Current Order Status</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded capitalize">
              {order.order_status}
            </span>
          </div>

          {/* Items breakdown */}
          <div className="pt-2 border-t border-stone-200">
            <div className="text-[#777777] mb-1 font-semibold">Ordered Items:</div>
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[#292929] py-0.5">
                <span>{item.quantity}× {item.item_name}</span>
                <span className="font-bold">₹{item.unit_price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-black text-[#292929]">
            <span>Total Amount Paid</span>
            <span>₹{order.total_amount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onTrackInOrders}
            className="w-full sm:w-1/2 py-3.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-black text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Track in My Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onGoToMenu}
            className="w-full sm:w-1/2 py-3.5 bg-stone-100 hover:bg-stone-200 text-[#292929] font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Explore Menu
          </button>
        </div>
      </div>
    </div>
  );
};
