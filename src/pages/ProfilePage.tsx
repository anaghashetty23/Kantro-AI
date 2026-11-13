import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/csrf';
import {
  User,
  GraduationCap,
  CreditCard,
  Banknote,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updatePreference, logout } = useAuth();

  const [paymentPreference, setPaymentPreference] = useState<'counter' | 'online'>(
    user?.payment_preference || 'counter'
  );
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleSavePreference = async (newPref: 'counter' | 'online') => {
    setPaymentPreference(newPref);
    setPrefSaving(true);
    setPrefSuccess('');
    const success = await updatePreference(newPref);
    setPrefSaving(false);
    if (success) {
      setPrefSuccess('Default payment preference saved in your profile.');
      setTimeout(() => setPrefSuccess(''), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    setPwdSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdMsg({ text: data.error || 'Failed to update password.', isError: true });
      } else {
        setPwdMsg({ text: 'Password successfully changed!', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPwdMsg({ text: 'Network error updating password.', isError: true });
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FFF5CC] border border-amber-300">
            <User className="w-5 h-5 text-[#292929]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#292929] tracking-tight">
            Student Profile
          </h1>
        </div>
        <p className="text-xs text-[#777777] mt-1">
          Your registered student credentials, default payment settings, and account security.
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-[#292929] uppercase tracking-wider pb-3 border-b border-stone-100 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-amber-700" />
          Academic & Personal Info
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#777777]">Full Name</span>
            <div className="font-bold text-sm text-[#292929] mt-0.5">{user?.full_name}</div>
          </div>

          <div>
            <span className="text-[#777777]">College ID / USN</span>
            <div className="font-bold text-sm text-[#292929] font-mono mt-0.5">{user?.username}</div>
          </div>

          <div>
            <span className="text-[#777777]">Department</span>
            <div className="font-semibold text-stone-800 mt-0.5">{user?.department || 'N/A'}</div>
          </div>

          <div>
            <span className="text-[#777777]">Year of Study</span>
            <div className="font-semibold text-stone-800 mt-0.5">{user?.year_of_study || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Default Payment Preference Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-xs font-bold text-[#292929] uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-700" />
              Default Payment Preference
            </h2>
            <p className="text-xs text-[#777777] mt-1">
              Automatically selects this option at checkout for faster ordering.
            </p>
          </div>
          {prefSaving && <span className="text-xs text-[#777777]">Saving...</span>}
        </div>

        {prefSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{prefSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSavePreference('counter')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              paymentPreference === 'counter'
                ? 'border-[#F4C542] bg-[#FFF5CC]/50 ring-1 ring-[#F4C542]'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#292929] mb-1">
              <Banknote className="w-4 h-4 text-amber-800" />
              <span>1. Pay at Counter</span>
            </div>
            <p className="text-xs text-[#777777]">
              Default to paying at the canteen counter with cash or UPI on food pickup.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSavePreference('online')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              paymentPreference === 'online'
                ? 'border-[#F4C542] bg-[#FFF5CC]/50 ring-1 ring-[#F4C542]'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#292929] mb-1">
              <CreditCard className="w-4 h-4 text-amber-800" />
              <span>2. Pay Online</span>
            </div>
            <p className="text-xs text-[#777777]">
              Default to simulated instant demo online checkout.
            </p>
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-[#292929] uppercase tracking-wider pb-3 border-b border-stone-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-700" />
          Change Password
        </h2>

        {pwdMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              pwdMsg.isError
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {pwdMsg.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{pwdMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#292929] mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#292929] mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#292929] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwdSaving}
            className="py-2.5 px-5 bg-stone-100 hover:bg-stone-200 text-[#292929] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {pwdSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout of KANTRO AI</span>
        </button>
      </div>
    </div>
  );
};
