import React from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, UtensilsCrossed, Clock } from 'lucide-react';

interface CartPageProps {
  onGoToMenu: () => void;
  onGoToCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onGoToMenu, onGoToCheckout }) => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItemsCount, selectedSlot } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white rounded-3xl p-12 border border-stone-200 shadow-2xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF5CC] border border-amber-300 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-[#292929]" />
          </div>
          <h2 className="text-xl font-black text-[#292929] mb-2">Your Cart is Empty</h2>
          <p className="text-xs text-[#777777] mb-6">
            You haven't added any food items yet. Explore our fresh menu or ask the AI assistant for break-friendly recommendations!
          </p>
          <button
            onClick={onGoToMenu}
            className="px-6 py-3 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Explore Full Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
              <ShoppingBag className="w-5 h-5 text-[#292929]" />
            </div>
            <h1 className="text-2xl font-black text-[#292929] tracking-tight">
              My Food Cart ({totalItemsCount} items)
            </h1>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Review your order before choosing your pickup slot and confirming.
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
        >
          Clear Cart
        </button>
      </div>

      {/* Cart Items List */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs divide-y divide-stone-100">
        {items.map(item => (
          <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-14 h-14 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-6 h-6 text-amber-700" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-sm text-[#292929]">{item.name}</h3>
                <div className="flex items-center gap-2 text-xs text-[#777777] mt-0.5">
                  <span className="font-bold text-[#292929]">₹{item.price} each</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    {item.prep_time_minutes}m prep
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-1.5 rounded-lg hover:bg-white text-[#292929] transition-colors"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-[#292929]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="p-1.5 rounded-lg hover:bg-white text-[#292929] transition-colors"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Total Item Price */}
              <div className="w-16 text-right font-black text-sm text-[#292929]">
                ₹{item.price * item.quantity}
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                title="Remove Item"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Summary & Slot Notice */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#777777]">Subtotal</span>
          <span className="font-bold text-[#292929]">₹{totalAmount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#777777]">Canteen Packaging & Pickup Fee</span>
          <span className="font-bold text-emerald-600">FREE</span>
        </div>
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-base">
          <span className="font-bold text-[#292929]">Total Payable Amount</span>
          <span className="font-black text-xl text-[#292929]">₹{totalAmount}</span>
        </div>

        {selectedSlot && (
          <div className="p-3 rounded-xl bg-[#FFF5CC] border border-amber-300 text-xs text-[#292929] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-800" />
              <span>
                Target Pickup Time: <strong>{selectedSlot}</strong>
              </span>
            </div>
            <span className="text-[11px] text-amber-900 font-semibold">Configured at Checkout</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onGoToMenu}
            className="w-full sm:w-1/2 py-3 bg-stone-100 hover:bg-stone-200 text-[#292929] font-bold text-sm rounded-xl transition-colors cursor-pointer text-center"
          >
            ← Continue Browsing Menu
          </button>
          <button
            onClick={onGoToCheckout}
            className="w-full sm:w-1/2 py-3 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
