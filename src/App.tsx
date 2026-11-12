import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { StudentDashboard } from './pages/StudentDashboard';
import { FullMenuPage } from './pages/FullMenuPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { ProfilePage } from './pages/ProfilePage';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/Navbar';
import { UserRole, Order } from './types';

const MainAppContent: React.FC = () => {
  const { user, role, isAuthenticated, loading, login } = useAuth();
  
  // Navigation states
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRole | null>(null);
  const [studentTab, setStudentTab] = useState<string>('dashboard');
  const [kitchenTab, setKitchenTab] = useState<string>('dashboard');
  const [adminTab, setAdminTab] = useState<string>('overview');

  // Confirmation order state
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Quick fill credentials for landing page
  const [prefillCreds, setPrefillCreds] = useState<{ user: string; pass: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-300 border-t-[#F4C542] rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-sm font-black text-[#292929]">KANTRO AI</div>
          <div className="text-xs text-[#777777] mt-0.5">Connecting to college canteen server...</div>
        </div>
      </div>
    );
  }

  // If user is not authenticated: Show Landing Page or Login / Register page
  if (!isAuthenticated || !user) {
    if (selectedRoleForLogin) {
      return (
        <AuthPages
          initialRole={selectedRoleForLogin}
          onBackToHome={() => {
            setSelectedRoleForLogin(null);
            setPrefillCreds(null);
          }}
          prefillUsername={prefillCreds?.user || ''}
          prefillPassword={prefillCreds?.pass || ''}
        />
      );
    }

    return (
      <LandingPage
        onSelectRole={r => setSelectedRoleForLogin(r)}
        onQuickDemoLogin={(username, password, r) => {
          setPrefillCreds({ user: username, pass: password });
          setSelectedRoleForLogin(r);
        }}
      />
    );
  }

  // Authenticated Views by Role
  if (role === 'employee') {
    return (
      <div className="min-h-screen bg-[#FAFAF5] text-[#292929] flex flex-col justify-between selection:bg-[#FFF5CC]">
        <div>
          <Navbar currentTab={kitchenTab} onSelectTab={t => setKitchenTab(t)} />
          <main>
            <KitchenDashboard currentTab={kitchenTab} onSelectTab={t => setKitchenTab(t)} />
          </main>
        </div>
        <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-[#777777]">
          KANTRO AI Kitchen Employee Operations • Live Preparation Priority
        </footer>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <div className="min-h-screen bg-[#FAFAF5] text-[#292929] flex flex-col justify-between selection:bg-[#FFF5CC]">
        <div>
          <Navbar currentTab={adminTab} onSelectTab={t => setAdminTab(t)} />
          <main>
            <AdminDashboard currentTab={adminTab} onSelectTab={t => setAdminTab(t)} />
          </main>
        </div>
        <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-[#777777]">
          KANTRO AI Kitchen Administrator Console • Full Canteen Management
        </footer>
      </div>
    );
  }

  // Student Views
  return (
    <div className="min-h-screen bg-[#FAFAF5] text-[#292929] flex flex-col justify-between selection:bg-[#FFF5CC]">
      <div>
        <Navbar currentTab={studentTab} onSelectTab={t => setStudentTab(t)} />
        <main>
          {studentTab === 'dashboard' && (
            <StudentDashboard onNavigateTab={t => setStudentTab(t)} />
          )}

          {studentTab === 'menu' && (
            <FullMenuPage onGoToCart={() => setStudentTab('cart')} />
          )}

          {studentTab === 'assistant' && (
            <AIAssistantPage
              onGoToCart={() => setStudentTab('cart')}
              onGoToMenu={() => setStudentTab('menu')}
            />
          )}

          {studentTab === 'cart' && (
            <CartPage
              onGoToMenu={() => setStudentTab('menu')}
              onGoToCheckout={() => setStudentTab('checkout')}
            />
          )}

          {studentTab === 'checkout' && (
            <CheckoutPage
              onBackToCart={() => setStudentTab('cart')}
              onOrderSuccess={order => {
                setConfirmedOrder(order);
                setStudentTab('confirmation');
              }}
            />
          )}

          {studentTab === 'confirmation' && confirmedOrder && (
            <OrderConfirmationPage
              order={confirmedOrder}
              onTrackInOrders={() => setStudentTab('orders')}
              onGoToMenu={() => setStudentTab('menu')}
            />
          )}

          {studentTab === 'orders' && (
            <MyOrdersPage onGoToMenu={() => setStudentTab('menu')} />
          )}

          {studentTab === 'profile' && <ProfilePage />}
        </main>
      </div>

      <footer className="border-t border-stone-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777777]">
          <div>
            <span className="font-semibold text-[#292929]">KANTRO AI</span> — Your Break, Your Food, Your Time.
          </div>
          <div>College Canteen Pre-Ordering & Break Slot Optimization</div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
