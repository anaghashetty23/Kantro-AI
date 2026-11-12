import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Order, SlotAnalysis } from '../types';
import {
  CreditCard,
  Banknote,
  Clock,
  User,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { user } = useAuth();
  const { items, totalAmount, breakSchedule, selectedSlot, setSelectedSlot, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<'counter' | 'online'>(
    user?.payment_preference || 'counter'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoPaymentModal, setShowDemoPaymentModal] = useState(false);

  // Slot selector quick modal/dropdown state
  const [alternativeSlots, setAlternativeSlots] = useState<SlotAnalysis[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch('/api/schedule/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakStart: breakSchedule.breakStart,
          breakEnd: breakSchedule.breakEnd,
          preferredPickup: breakSchedule.preferredPickup,
          cartItems: items
        })
      });
      const data = await res.json();
      if (data.slots) {
        setAlternativeSlots(data.slots);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmOrder = async (isDemoPaid = false) => {
    setErrorMessage('');
    if (!selectedSlot) {
      setErrorMessage('Please select a pickup time slot before confirming your order.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
          breakStart: breakSchedule.breakStart,
          breakEnd: breakSchedule.breakEnd,
          pickupTime: selectedSlot,
          paymentMethod: isDemoPaid ? 'online' : paymentMethod
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to place order.');
        // If slot capacity failed, trigger reload of slots
        fetchSlots();
      } else {
        // Clear cart only after success
        clearCart();
        setShowDemoPaymentModal(false);
        onOrderSuccess(data.order);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred while connecting to kitchen server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPayment = () => {
    if (paymentMethod === 'online') {
      setShowDemoPaymentModal(true);
    } else {
      handleConfirmOrder(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button & Heading */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToCart}
          className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-[#292929] transition-colors"
          aria-label="Back to Cart"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
            Order Checkout
          </h1>
          <p className="text-xs text-[#777777]">
            Review your break schedule, pickup slot, and payment choice.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Order Verification Note: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Slot & Payment */}
        <div className="md:col-span-2 space-y-6">
          {/* Student Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <User className="w-4 h-4 text-[#292929]" />
              <h2 className="text-sm font-bold text-[#292929] uppercase tracking-wider">
                Student Details
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#777777]">Student Name</span>
                <div className="font-bold text-sm text-[#292929] mt-0.5">{user?.full_name}</div>
              </div>
              <div>
                <span className="text-[#777777]">College ID / USN</span>
                <div className="font-bold text-sm text-[#292929] font-mono mt-0.5">{user?.username}</div>
              </div>
              <div>
                <span className="text-[#777777]">Department</span>
                <div className="font-semibold text-stone-800 mt-0.5">{user?.department}</div>
              </div>
              <div>
                <span className="text-[#777777]">Year of Study</span>
                <div className="font-semibold text-stone-800 mt-0.5">{user?.year_of_study}</div>
              </div>
            </div>
          </div>

          {/* Break & Pickup Slot Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#292929]" />
                <h2 className="text-sm font-bold text-[#292929] uppercase tracking-wider">
                  Pickup Slot & Break Window
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchSlots}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                Change Pickup Slot
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[#777777]">Break Starts</span>
                <div className="font-bold text-sm text-[#292929] mt-0.5">{breakSchedule.breakStart}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[#777777]">Break Ends</span>
                <div className="font-bold text-sm text-[#292929] mt-0.5">{breakSchedule.breakEnd}</div>
              </div>
              <div className="p-3 bg-[#FFF5CC] rounded-xl border border-amber-300">
                <span className="text-amber-900 font-bold">Selected Pickup</span>
                <div className="font-black text-base text-[#292929] mt-0.5">
                  {selectedSlot || 'Not Chosen'}
                </div>
              </div>
            </div>

            {/* Quick alternative slot picker if opened */}
            {alternativeSlots.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="text-xs font-bold text-[#292929] mb-2">Available Slots:</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {alternativeSlots.map(s => (
                    <button
                      key={s.slotTime}
                      disabled={!s.isAvailable}
                      onClick={() => setSelectedSlot(s.slotTime)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                        !s.isAvailable
                          ? 'bg-stone-100 border-stone-200 opacity-50 cursor-not-allowed'
                          : selectedSlot === s.slotTime
                          ? 'bg-[#F4C542] border-amber-400 text-[#292929]'
                          : 'bg-white border-stone-200 text-[#292929] hover:bg-stone-50'
                      }`}
                    >
                      {s.slotTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <CreditCard className="w-4 h-4 text-[#292929]" />
              <h2 className="text-sm font-bold text-[#292929] uppercase tracking-wider">
                Select Payment Method
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Pay at Counter */}
              <label
                className={`relative p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'counter'
                    ? 'border-[#F4C542] bg-[#FFF5CC]/40 ring-1 ring-[#F4C542]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="counter"
                  checked={paymentMethod === 'counter'}
                  onChange={() => setPaymentMethod('counter')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#292929]">
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <span>Pay at Counter</span>
                  </div>
                  <p className="text-xs text-[#777777] mt-1 leading-relaxed">
                    Pay with cash or UPI at the canteen counter upon food collection.
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-[#292929]">
                    Status: Pending / Counter
                  </span>
                </div>
              </label>

              {/* Option 2: Pay Online (Demo) */}
              <label
                className={`relative p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'border-[#F4C542] bg-[#FFF5CC]/40 ring-1 ring-[#F4C542]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#292929]">
                    <CreditCard className="w-4 h-4 text-amber-700" />
                    <span>Pay Online (Simulated)</span>
                  </div>
                  <p className="text-xs text-[#777777] mt-1 leading-relaxed">
                    Instant demo checkout with 1-click test confirmation.
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    Hackathon Demo Payment
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Col: Order Summary & Confirm Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#292929] uppercase tracking-wider pb-3 border-b border-stone-100">
              Order Items Summary
            </h2>

            <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#292929]">{item.name}</div>
                    <div className="text-[#777777]">
                      {item.quantity} × ₹{item.price}
                    </div>
                  </div>
                  <div className="font-bold text-[#292929]">
                    ₹{item.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between text-[#777777]">
                <span>Total Items</span>
                <span>{items.reduce((a, b) => a + b.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-[#777777]">
                <span>Pickup Slot</span>
                <span className="font-bold text-[#292929]">{selectedSlot || 'None'}</span>
              </div>
              <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-sm font-black text-[#292929]">
                <span>Total Amount</span>
                <span className="text-xl">₹{totalAmount}</span>
              </div>
            </div>

            <button
              onClick={handleStartPayment}
              disabled={isSubmitting || items.length === 0}
              className="w-full py-3.5 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-black text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Reserving Kitchen Slot...</span>
              ) : paymentMethod === 'online' ? (
                <>
                  <span>Proceed to Demo Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Confirm Order (Pay at Counter)</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-[11px] text-[#777777] text-center leading-tight">
              Pre-ordering locks in your kitchen preparation slot atomically.
            </div>
          </div>
        </div>
      </div>

      {/* Demo Online Payment Modal */}
      {showDemoPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                DEMO PAYMENT GATEWAY
              </div>
              <h3 className="text-2xl font-black text-[#292929]">KANTRO Pay Demo</h3>
              <p className="text-xs text-[#777777] mt-1">
                College Hackathon Demonstration Sandbox
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 mb-6 text-xs">
              <div className="flex justify-between">
                <span className="text-[#777777]">Payable Amount</span>
                <span className="font-black text-base text-[#292929]">₹{totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Student ID</span>
                <span className="font-mono font-bold text-[#292929]">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777]">Pickup Slot</span>
                <span className="font-bold text-[#292929]">{selectedSlot}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed mb-6">
              <strong>Notice:</strong> This is a simulated payment flow for evaluation. No real bank accounts, UPI PINs, or financial transactions are processed.
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleConfirmOrder(true)}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing Demo Payment...</span>
                ) : (
                  <>
                    <span>Simulate Successful Payment (₹{totalAmount})</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => setShowDemoPaymentModal(false)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-[#292929] font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel Demo Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
