import React from 'react';
import { Logo } from '../components/Logo';
import { GraduationCap, ChefHat, ShieldCheck, ArrowRight, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onQuickDemoLogin?: (username: string, password: string, role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole, onQuickDemoLogin }) => {
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col justify-between selection:bg-[#FFF5CC]">
      {/* Top Banner */}
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Logo size="md" showTagline={true} />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#777777] bg-stone-100 px-3 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live College Canteen Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero & Role Selection */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col items-center justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#FFF5CC] border border-amber-300 text-[#292929] px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            AI-Powered Break Scheduling & Pre-Ordering
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#292929] tracking-tight mb-4">
            KANTRO <span className="text-amber-500">AI</span>
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-[#292929] mb-4">
            Your Break, Your Food, Your Time.
          </p>
          <p className="text-base sm:text-lg text-[#777777] leading-relaxed max-w-2xl mx-auto">
            Your college canteen, made smarter. Plan your break, pre-order your food, and skip the queue.
          </p>

          {/* Quick value badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs font-medium text-[#292929]">
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> 0 min Queue Waiting
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Real Kitchen Workload Slots
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Food Recommendations
            </span>
          </div>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12">
          {/* 1. Student Login */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-amber-300">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#FFF5CC] border border-amber-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7 text-[#292929]" />
              </div>
              <h2 className="text-xl font-bold text-[#292929] mb-2">Student Login</h2>
              <p className="text-sm text-[#777777] leading-relaxed mb-6">
                Check the live menu, align pickup with your lecture break timetable, pre-order food, and collect with your instant pickup code.
              </p>
            </div>
            <div>
              <button
                onClick={() => onSelectRole('student')}
                className="w-full flex items-center justify-center gap-2 bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Login as Student</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="mt-2 text-center text-xs text-[#777777]">
                First time? Register with College ID
              </div>
            </div>
          </div>

          {/* 2. Kitchen Employee Login */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-emerald-300">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <ChefHat className="w-7 h-7 text-emerald-700" />
              </div>
              <h2 className="text-xl font-bold text-[#292929] mb-2">Kitchen Employee Login</h2>
              <p className="text-sm text-[#777777] leading-relaxed mb-6">
                Receive prioritized student orders, track preparation deadlines, update cooking milestones, and manage station slot capacity.
              </p>
            </div>
            <div>
              <button
                onClick={() => onSelectRole('employee')}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Kitchen Staff Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="mt-2 text-center text-xs text-[#777777]">
                Kitchen station preparation access
              </div>
            </div>
          </div>

          {/* 3. Kitchen Administrator Login */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-purple-300">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7 text-purple-700" />
              </div>
              <h2 className="text-xl font-bold text-[#292929] mb-2">Kitchen Administrator Login</h2>
              <p className="text-sm text-[#777777] leading-relaxed mb-6">
                Monitor complete canteen operations, flag delay recoveries, manage menu items, set station capacities, and view sales reports.
              </p>
            </div>
            <div>
              <button
                onClick={() => onSelectRole('admin')}
                className="w-full flex items-center justify-center gap-2 bg-[#292929] hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Administrator Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="mt-2 text-center text-xs text-[#777777]">
                Executive canteen operations
              </div>
            </div>
          </div>
        </div>

        {/* Demo Credentials Helper Box */}
        <div className="w-full max-w-5xl bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFF5CC] text-amber-900 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                Hackathon Demo Quick Login
              </span>
              <span className="text-xs text-[#777777]">
                Pre-configured accounts ready for evaluation
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#292929]">Student</div>
                <div className="text-[11px] font-mono text-[#777777]">ID: DEMO2026</div>
                <div className="text-[11px] font-mono text-[#777777]">Pass: Student@123</div>
              </div>
              {onQuickDemoLogin && (
                <button
                  onClick={() => onQuickDemoLogin('DEMO2026', 'Student@123', 'student')}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#F4C542] hover:bg-[#e6b733] text-[#292929] rounded-lg transition-colors"
                >
                  Quick Fill
                </button>
              )}
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#292929]">Kitchen Staff</div>
                <div className="text-[11px] font-mono text-[#777777]">ID: KITCHEN01</div>
                <div className="text-[11px] font-mono text-[#777777]">Pass: Kitchen@123</div>
              </div>
              {onQuickDemoLogin && (
                <button
                  onClick={() => onQuickDemoLogin('KITCHEN01', 'Kitchen@123', 'employee')}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Quick Fill
                </button>
              )}
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#292929]">Administrator</div>
                <div className="text-[11px] font-mono text-[#777777]">ID: ADMIN01</div>
                <div className="text-[11px] font-mono text-[#777777]">Pass: Admin@123</div>
              </div>
              {onQuickDemoLogin && (
                <button
                  onClick={() => onQuickDemoLogin('ADMIN01', 'Admin@123', 'admin')}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#292929] hover:bg-stone-800 text-white rounded-lg transition-colors"
                >
                  Quick Fill
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777777]">
          <div>
            <span className="font-semibold text-[#292929]">KANTRO AI</span> — Your Break, Your Food, Your Time.
          </div>
          <div>
            College Canteen Smart Pre-Ordering & Break Slot Engine
          </div>
        </div>
      </footer>
    </div>
  );
};
