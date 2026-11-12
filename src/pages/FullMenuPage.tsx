import React, { useState, useEffect } from 'react';
import { MenuItem, Category } from '../types';
import { useCart } from '../context/CartContext';
import {
  Search,
  Clock,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Filter,
  UtensilsCrossed
} from 'lucide-react';

interface FullMenuPageProps {
  onGoToCart: () => void;
}

export const FullMenuPage: React.FC<FullMenuPageProps> = ({ onGoToCart }) => {
  const { items: cartItems, addItem, updateQuantity, totalItemsCount } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Local draft quantities for items before adding
  const [quantities, setQuantities] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(data.categories);
        if (data.items) setMenuItems(data.items);
      })
      .catch(err => console.error('Failed to load menu:', err))
      .finally(() => setLoading(false));
  }, []);

  const getDraftQuantity = (itemId: string) => {
    return quantities[itemId] || 1;
  };

  const setDraftQuantity = (itemId: string, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(10, qty))
    }));
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with Title and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
              <UtensilsCrossed className="w-5 h-5 text-[#292929]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
              Full Canteen Menu
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#777777] mt-1">
            Freshly prepared dishes with clear preparation times to match your class timetable.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dosas, rice, snacks, tea..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-[#292929] placeholder-stone-400 focus:outline-hidden focus:border-amber-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#292929] text-white shadow-2xs'
              : 'bg-white border border-stone-200 text-[#292929] hover:bg-stone-50'
          }`}
        >
          All Items ({menuItems.length})
        </button>
        {categories.map(cat => {
          const count = menuItems.filter(i => i.category_id === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#F4C542] text-[#292929] border border-amber-300 shadow-2xs'
                  : 'bg-white border border-stone-200 text-[#292929] hover:bg-stone-50'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[#777777]">
          Loading fresh menu items...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-200">
          <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#292929]">No food items match your filter</h3>
          <p className="text-xs text-[#777777] mt-1">Try searching for something else or reset your category.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-4 px-4 py-2 bg-[#F4C542] text-[#292929] font-bold text-xs rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => {
            const inCart = cartItems.find(i => i.id === item.id);
            const isSoldOut = item.is_available !== 1;
            const draftQty = getDraftQuantity(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${
                  isSoldOut
                    ? 'border-stone-200 opacity-60'
                    : 'border-stone-200 hover:border-amber-300 hover:shadow-xs'
                }`}
              >
                {/* Food Image & Badge */}
                <div className="relative h-44 bg-stone-100 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-[#292929] border border-stone-200 shadow-2xs">
                    {item.category_name}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute top-3 right-3 bg-[#F4C542] text-[#292929] px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs border border-amber-300">
                    ₹{item.price}
                  </div>

                  {/* Preparation Time Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-[#F4C542]" />
                    <span>{item.prep_time_minutes} min prep</span>
                  </div>

                  {/* Availability Badge */}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Currently Unavailable
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#292929] mb-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#777777] leading-relaxed line-clamp-2 mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-stone-100">
                    {/* Quantity Selector & Add to Cart */}
                    {!isSoldOut ? (
                      <div className="flex items-center gap-2">
                        {/* Quantity Counter */}
                        <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
                          <button
                            onClick={() => setDraftQuantity(item.id, draftQty - 1)}
                            className="p-1 rounded-lg hover:bg-white text-[#292929] transition-colors"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-[#292929]">
                            {draftQty}
                          </span>
                          <button
                            onClick={() => setDraftQuantity(item.id, draftQty + 1)}
                            className="p-1 rounded-lg hover:bg-white text-[#292929] transition-colors"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={() => {
                            addItem(item, draftQty);
                            setDraftQuantity(item.id, 1);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{inCart ? `Add More (+${draftQty})` : `Add (₹${item.price * draftQty})`}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs font-semibold text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                        Out of Stock
                      </div>
                    )}

                    {inCart && (
                      <div className="text-[11px] text-center text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{inCart.quantity} in your cart</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating View Cart Pill if cart has items */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={onGoToCart}
            className="flex items-center gap-3 bg-[#292929] hover:bg-stone-800 text-white font-bold px-5 py-3 rounded-2xl shadow-xl border border-stone-700 transition-transform hover:scale-105 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-[#F4C542] text-[#292929] flex items-center justify-center font-bold text-xs">
              {totalItemsCount}
            </div>
            <span className="text-sm">Proceed to Cart</span>
          </button>
        </div>
      )}
    </div>
  );
};
