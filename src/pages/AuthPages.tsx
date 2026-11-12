import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  GraduationCap,
  ChefHat,
  ShieldCheck,
  ArrowLeft,
  Lock,
  User as UserIcon,
  BookOpen,
  Building,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

interface AuthPagesProps {
  initialRole: UserRole;
  initialMode?: 'login' | 'register';
  onBackToHome: () => void;
  prefillUsername?: string;
  prefillPassword?: string;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialRole,
  initialMode = 'login',
  onBackToHome,
  prefillUsername = '',
  prefillPassword = ''
}) => {
  const { login, register } = useAuth();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login form state
  const [username, setUsername] = useState(prefillUsername);
  const [password, setPassword] = useState(prefillPassword);
  
  // Student registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regCollegeId, setRegCollegeId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engg');
  const [regYear, setRegYear] = useState('3rd Year');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const result = await login(username, password, role);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Login failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      fullName: regFullName,
      collegeId: regCollegeId,
      department: regDepartment,
      yearOfStudy: regYear,
      password: regPassword,
      confirmPassword: regConfirmPassword
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Registration failed.');
    } else {
      setSuccessMsg('Account registered successfully! Logging you in...');
    }
  };

  const fillDemoCredentials = () => {
    if (role === 'student') {
      setUsername('DEMO2026');
      setPassword('Student@123');
    } else if (role === 'employee') {
      setUsername('KITCHEN01');
      setPassword('Kitchen@123');
    } else if (role === 'admin') {
      setUsername('ADMIN01');
      setPassword('Admin@123');
    }
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col justify-between selection:bg-[#FFF5CC]">
      {/* Top Bar with Back to Home */}
      <header className="border-b border-stone-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-sm font-semibold text-[#777777] hover:text-[#292929] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <Logo size="sm" showTagline={false} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
          {/* Role Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 shadow-xs border">
              {role === 'student' && (
                <div className="w-full h-full rounded-2xl bg-[#FFF5CC] border-amber-300 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#292929]" />
                </div>
              )}
              {role === 'employee' && (
                <div className="w-full h-full rounded-2xl bg-emerald-50 border-emerald-300 flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-emerald-700" />
                </div>
              )}
              {role === 'admin' && (
                <div className="w-full h-full rounded-2xl bg-purple-50 border-purple-300 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-purple-700" />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black text-[#292929] tracking-tight">
              {role === 'student' && (mode === 'login' ? 'Student Login' : 'Student Registration')}
              {role === 'employee' && 'Kitchen Employee Login'}
              {role === 'admin' && 'Kitchen Administrator Login'}
            </h1>
            <p className="text-xs text-[#777777] mt-1">
              KANTRO AI — Your Break, Your Food, Your Time.
            </p>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1.5">
                  {role === 'student' ? 'College ID / USN' : role === 'employee' ? 'Employee ID' : 'Administrator ID'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={
                      role === 'student' ? 'e.g. DEMO2026 or 4MT24CI003' : role === 'employee' ? 'e.g. KITCHEN01' : 'e.g. ADMIN01'
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] placeholder-stone-400 focus:outline-hidden focus:border-amber-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider">
                    Password
                  </label>
                  {role === 'student' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] placeholder-stone-400 focus:outline-hidden focus:border-amber-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer mt-2 ${
                  role === 'student'
                    ? 'bg-[#F4C542] hover:bg-[#e6b733] text-[#292929]'
                    : role === 'employee'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#292929] hover:bg-stone-800 text-white'
                }`}
              >
                {isSubmitting ? 'Authenticating...' : `Login to ${role === 'student' ? 'Student Portal' : role === 'employee' ? 'Kitchen Portal' : 'Admin Console'}`}
              </button>

              {/* Quick Demo Fill Helper button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-xs text-stone-600 hover:text-[#292929] underline decoration-stone-300 transition-colors"
                >
                  Click to auto-fill demo credentials ({role === 'student' ? 'DEMO2026' : role === 'employee' ? 'KITCHEN01' : 'ADMIN01'})
                </button>
              </div>

              {/* Student Registration Toggle */}
              {role === 'student' && (
                <div className="pt-4 border-t border-stone-100 text-center">
                  <p className="text-xs text-[#777777]">
                    First-time student?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg('');
                      }}
                      className="font-bold text-[#292929] hover:text-amber-600 underline"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              )}
            </form>
          ) : (
            /* Student Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-1.5 mb-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Demo Registration: Register your student account using your unique College ID/USN.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Ananya Rao"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                  College ID / USN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regCollegeId}
                    onChange={e => setRegCollegeId(e.target.value)}
                    placeholder="e.g. 4MT24CS102"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={regDepartment}
                    onChange={e => setRegDepartment(e.target.value)}
                    className="w-full py-2 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  >
                    <option value="Computer Science & Engg">Computer Science</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Information Science">Information Science</option>
                    <option value="Electronics & Comm">Electronics & Comm</option>
                    <option value="Mechanical Engg">Mechanical Engg</option>
                    <option value="Civil Engg">Civil Engg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                    Year of Study
                  </label>
                  <select
                    value={regYear}
                    onChange={e => setRegYear(e.target.value)}
                    className="w-full py-2 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#292929] focus:outline-hidden focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-bold text-sm bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] shadow-xs transition-colors cursor-pointer mt-3"
              >
                {isSubmitting ? 'Registering Account...' : 'Complete Registration'}
              </button>

              <div className="pt-3 border-t border-stone-100 text-center">
                <p className="text-xs text-[#777777]">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="font-bold text-[#292929] hover:text-amber-600 underline"
                  >
                    Back to Student Login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Forgot password dialog */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
              <h3 className="text-lg font-bold text-[#292929] mb-2">Reset Password</h3>
              <p className="text-xs text-[#777777] mb-4">
                In this hackathon demonstration environment, you can use the default demo student account (<span className="font-mono font-semibold text-[#292929]">DEMO2026 / Student@123</span>) or contact the canteen administrator.
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full py-2.5 rounded-xl bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-4 text-center text-xs text-[#777777]">
        KANTRO AI — College Canteen Pre-Ordering System
      </footer>
    </div>
  );
};
