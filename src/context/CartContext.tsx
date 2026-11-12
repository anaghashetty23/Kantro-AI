import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem } from '../types';

interface BreakSchedule {
  breakStart: string;
  breakEnd: string;
  preferredPickup: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem | CartItem, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItemsCount: number;
  breakSchedule: BreakSchedule;
  setBreakSchedule: React.Dispatch<React.SetStateAction<BreakSchedule>>;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kantro_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [breakSchedule, setBreakSchedule] = useState<BreakSchedule>(() => {
    try {
      const saved = localStorage.getItem('kantro_break_schedule');
      return saved ? JSON.parse(saved) : { breakStart: '12:45', breakEnd: '13:15', preferredPickup: '13:00' };
    } catch {
      return { breakStart: '12:45', breakEnd: '13:15', preferredPickup: '13:00' };
    }
  });

  const [selectedSlot, setSelectedSlot] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kantro_selected_slot') || '01:00 PM';
    } catch {
      return '01:00 PM';
    }
  });

  useEffect(() => {
    localStorage.setItem('kantro_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('kantro_break_schedule', JSON.stringify(breakSchedule));
  }, [breakSchedule]);

  useEffect(() => {
    if (selectedSlot) {
      localStorage.setItem('kantro_selected_slot', selectedSlot);
    } else {
      localStorage.removeItem('kantro_selected_slot');
    }
  }, [selectedSlot]);

  const addItem = (item: MenuItem | CartItem, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          prep_time_minutes: item.prep_time_minutes,
          station_id: item.station_id,
          image_url: 'image_url' in item ? item.image_url : undefined,
          quantity
        }
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => {
      return prev
        .map(i => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalAmount,
        totalItemsCount,
        breakSchedule,
        setBreakSchedule,
        selectedSlot,
        setSelectedSlot
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
