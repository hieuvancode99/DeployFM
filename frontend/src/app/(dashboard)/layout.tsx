'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { createQuickTransaction } from '@/actions/quickTransaction';
import axiosInstance from '@/lib/axios';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  PiggyBank, 
  BrainCircuit, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Wallet,
  User,
  PlusCircle,
  AlertTriangle,
  Loader2,
  Tag
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarLink = ({ href, icon: Icon, label, active, onClick }: SidebarLinkProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
      <span>{label}</span>
    </Link>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Quick Add Modal
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAmountDisplay, setQuickAmountDisplay] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickType, setQuickType] = useState<'expense' | 'income'>('expense');
  const [submitting, setSubmitting] = useState(false);

  // Toast alert
  const [quickToast, setQuickToast] = useState<{ show: boolean; msg: string; type: 'success' | 'warning' | 'error' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  useEffect(() => {
    if (session) {
      axiosInstance.get('/categories').then(res => {
        if (res.data.success) {
          setCategories(res.data.data);
        }
      }).catch(console.error);
    }
  }, [session]);

  // Xử lý forced logout khi tài khoản bị Admin cấm (phải gọi trước mọi conditional return)
  useRealtimeEvents({
    userId: (session?.user as any)?._id,
    onForcedLogout: () => {
      signOut({ callbackUrl: '/login' });
    }
  });

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const userRole = (session?.user as any)?.role || 'User';
  const userName = session?.user?.name || 'Người dùng';

  let links: { href: string; icon: React.ComponentType<any>; label: string }[] = [];

  if (userRole === 'Admin') {
    links = [
      { href: '/admin', icon: ShieldAlert, label: 'Quản lý tài khoản' }
    ];
  } else {
    links = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
      { href: '/transactions', icon: ArrowRightLeft, label: 'Lịch sử giao dịch' },
      { href: '/budgets', icon: PiggyBank, label: 'Ngân sách thiết lập' },
      { href: '/categories', icon: Tag, label: 'Danh mục của tôi' },
      { href: '/ai-advisor', icon: BrainCircuit, label: 'Cố vấn tài chính AI' },
    ];
  }


  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAmount || !quickCategory) {
      setQuickToast({ show: true, msg: 'Vui lòng điền đủ tiền và danh mục', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      // Invoke Next.js Server Action
      const res = await createQuickTransaction({
        amount: Number(quickAmount),
        categoryId: quickCategory,
        type: quickType,
        description: quickDesc || 'Giao dịch nhanh từ Sidebar'
      });

      setSubmitting(false);
      setQuickModalOpen(false);

      if (res.success) {
        if (res.budgetWarning && res.warningMessage) {
          setQuickToast({ show: true, msg: res.warningMessage, type: 'warning' });
        } else {
          setQuickToast({ show: true, msg: 'Đã thêm giao dịch nhanh thành công!', type: 'success' });
        }
        
        // Reset fields
        setQuickAmount('');
        setQuickAmountDisplay('');
        setQuickCategory('');
        setQuickDesc('');
        
        // Refresh server-rendered page data
        router.refresh();
        // Trigger page reloading if we are in dashboard page
        if (pathname === '/dashboard') {
          window.location.reload();
        }
      } else {
        setQuickToast({ show: true, msg: res.message || 'Lỗi thêm nhanh.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setQuickToast({ show: true, msg: 'Không kết nối được máy chủ.', type: 'error' });
    }
  };

  const handleQuickAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setQuickAmount('');
      setQuickAmountDisplay('');
      return;
    }
    const numericValue = parseInt(rawValue, 10);
    setQuickAmount(String(numericValue));
    setQuickAmountDisplay(numericValue.toLocaleString('vi-VN'));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      {/* Toast Alert */}
      {quickToast.show && (
        <div className={`fixed bottom-5 right-5 z-[60] flex max-w-md items-center gap-3 rounded-2xl p-4 shadow-2xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-in ${
          quickToast.type === 'warning' 
            ? 'border-amber-500/30 text-amber-500 dark:text-amber-400' 
            : quickToast.type === 'error' 
              ? 'border-red-500/30 text-red-500 dark:text-red-400' 
              : 'border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
        }`}>
          {quickToast.type === 'warning' && <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />}
          <div>
            <p className="text-sm font-semibold">{quickToast.type === 'warning' ? 'Cảnh báo Ngân Sách!' : 'Thông báo'}</p>
            <p className="text-xs mt-0.5 opacity-90">{quickToast.msg}</p>
          </div>
          <button onClick={() => setQuickToast(prev => ({ ...prev, show: false }))} className="ml-auto text-slate-400 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex-shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">Smart Finance</span>
        </div>

        {/* Quick Add Button */}
        {userRole !== 'Admin' && (
          <button
            onClick={() => setQuickModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 mb-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 transition-all duration-200"
          >
            <PlusCircle className="h-5 w-5 text-white" />
            Thêm nhanh
          </button>
        )}

        <nav className="flex-1 space-y-1">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={pathname === link.href}
            />
          ))}
        </nav>

        {/* User Card */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium capitalize">{userRole === 'Admin' ? 'Quản trị viên' : 'Thành viên'}</p>
            </div>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/80 backdrop-blur-sm">
          <div className="relative flex w-full max-w-xs flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 animate-slide-in">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-5 right-5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Smart Finance</span>
            </div>

            {/* Quick Add Mobile */}
            {userRole !== 'Admin' && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setQuickModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 mb-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-bold text-white shadow-lg"
              >
                <PlusCircle className="h-5 w-5 text-white" />
                Thêm nhanh
              </button>
            )}

            <nav className="flex-1 space-y-1">
              {links.map((link) => (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  active={pathname === link.href}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
              <div className="flex items-center gap-3 px-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium capitalize">{userRole === 'Admin' ? 'Quản trị viên' : 'Thành viên'}</p>
                </div>
              </div>
              
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Smart Finance</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Desktop Header (Optional) - Just placing ThemeToggle in corner of the main content area for Desktop */}
        <div className="hidden md:flex absolute top-6 right-8 z-10">
          <ThemeToggle />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-8 transition-colors duration-300">
          {children}
        </main>
      </div>

      {/* Quick Add Server Action Modal */}
      {quickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setQuickModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <PlusCircle className="text-indigo-600 dark:text-indigo-400 h-5 w-5" />
              Thêm Giao Dịch Nhanh
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Thao tác được xử lý an toàn bằng Next.js Server Action phía máy chủ.</p>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickType('expense')}
                  className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                    quickType === 'expense' 
                      ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('income')}
                  className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                    quickType === 'income' 
                      ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Thu nhập
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Số tiền (VND)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 50.000"
                  value={quickAmountDisplay}
                  onChange={handleQuickAmountChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  required
                />
                
                {/* Quick Amount Suggestion Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[20000, 50000, 100000, 500000, 1000000, 2000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        const current = Number(quickAmount) || 0;
                        const nextVal = current + amt;
                        setQuickAmount(String(nextVal));
                        setQuickAmountDisplay(nextVal.toLocaleString('vi-VN'));
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      +{amt >= 1000000 ? `${amt/1000000}M` : `${amt/1000}K`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAmount('');
                      setQuickAmountDisplay('');
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Danh mục</label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.filter(c => c.type === quickType).map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Short description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Ghi chú ngắn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua sắm vặt..."
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setQuickModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Thêm giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
