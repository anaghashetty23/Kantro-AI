import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  Clock,
  User,
  LogOut,
  Menu as MenuIcon,
  X,
  Bell,
  ChefHat,
  ShieldCheck,
  Package,
  Layers,
  Users,
  FileBarChart
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, unreadCount = 0 }) => {
  const { user, role, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = () => {
    switch (role) {
      case 'student':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF5CC] text-[#292929] border border-amber-300">
            Student Portal
          </span>
        );
      case 'employee':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <ChefHat className="w-3 h-3 text-emerald-600" /> Kitchen Portal
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-300">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> Admin Console
          </span>
        );
      default:
        return null;
    }
  };

  const getStudentNavItems = (): NavItem[] => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Full Menu', icon: UtensilsCrossed },
    { id: 'assistant', label: 'AI Food Assistant', icon: Sparkles, badge: 'Smart' },
    { id: 'cart', label: 'My Cart', icon: ShoppingBag, count: totalItemsCount },
    { id: 'orders', label: 'My Orders', icon: Clock },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const getEmployeeNavItems = (): NavItem[] => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incoming', label: 'Incoming Orders', icon: Clock },
    { id: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
    { id: 'ready', label: 'Ready for Pickup', icon: ShoppingBag },
    { id: 'slots', label: 'Kitchen Slots', icon: Layers }
  ];

  const getAdminNavItems = (): NavItem[] => [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'all_orders', label: 'All Orders', icon: Clock },
    { id: 'menu_mgmt', label: 'Menu Management', icon: UtensilsCrossed },
    { id: 'capacity_mgmt', label: 'Kitchen Capacity', icon: Layers },
    { id: 'inventory_mgmt', label: 'Inventory', icon: Package },
    { id: 'accounts_mgmt', label: 'Accounts', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart }
  ];

  const navItems: NavItem[] = role === 'student'
    ? getStudentNavItems()
    : role === 'employee'
    ? getEmployeeNavItems()
    : role === 'admin'
    ? getAdminNavItems()
    : [];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab(role === 'admin' ? 'overview' : 'dashboard')}
              className="text-left cursor-pointer focus:outline-hidden"
              aria-label="KANTRO AI Home"
            >
              <Logo size="sm" showTagline={false} />
            </button>
            <div className="hidden sm:block">
              {getRoleBadge()}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FFF5CC] text-[#292929] font-bold border border-amber-300 shadow-2xs'
                      : 'text-[#292929] hover:bg-stone-100 hover:text-[#292929]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#292929]' : 'text-[#777777]'}`} />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-[#F4C542] text-[#292929]">
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-200 text-amber-900 uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: User info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <div className="text-right">
                <div className="text-xs font-semibold text-[#292929]">{user.full_name}</div>
                <div className="text-[11px] text-[#777777] font-mono">{user.username}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {getRoleBadge()}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#292929] hover:bg-stone-100 focus:outline-hidden"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-[#FFF5CC] text-[#292929] font-bold border border-amber-300'
                    : 'text-[#292929] hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#777777]" />
                  <span>{item.label}</span>
                </div>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F4C542] text-[#292929]">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            {user && (
              <div>
                <div className="text-xs font-semibold text-[#292929]">{user.full_name}</div>
                <div className="text-[11px] text-[#777777]">{user.username}</div>
              </div>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
