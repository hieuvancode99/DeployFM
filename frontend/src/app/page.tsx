import React from 'react';
import Link from 'next/link';
import { Wallet, Sparkles, TrendingUp, ShieldCheck, FileSpreadsheet, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>

      {/* Navigation */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">Smart Finance</span>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors hidden sm:block"
          >
            Đăng nhập
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/10"
          >
            Đăng ký miễn phí
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 relative flex-1">
        {/* Left: Text & CTA */}
        <div className="space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tích hợp Trí tuệ Nhân tạo Gemini AI</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
            Kiểm soát tài chính <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 dark:from-indigo-400 dark:via-purple-400 dark:to-emerald-400 bg-clip-text text-transparent">thông minh</span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            Ứng dụng tối ưu giúp bạn ghi chép thu chi hàng ngày, thiết lập ngân sách tiết kiệm hiệu quả và nhận lời khuyên tài chính cá nhân sâu sắc từ Cố vấn AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link 
              href="/register" 
              className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-4 text-base font-semibold text-white transition-all shadow-lg shadow-indigo-600/20"
            >
              Bắt đầu ngay hôm nay
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/login" 
              className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 px-6 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
            >
              Trải nghiệm Demo
            </Link>
          </div>
        </div>

        {/* Right: Feature Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Quản lý thu chi</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">Ghi chép giao dịch nhanh chóng, phân loại danh mục khoa học, trực quan hóa bằng biểu đồ Recharts sinh động.</p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cố vấn AI</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">Nhận lời khuyên tiết kiệm, đầu tư và cơ cấu ngân sách cá nhân hóa dựa trên dữ liệu giao dịch thực tế.</p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cảnh báo ngân sách</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">Thiết lập hạn mức ngân sách tháng cho từng nhóm chi tiêu và nhận cảnh báo tức thời khi vượt mức chi.</p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-600/10 text-amber-600 dark:text-amber-400 mb-4">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Xuất báo cáo đa dạng</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">Tải xuống báo cáo tài chính định dạng Excel (.xlsx) hoặc file PDF được định dạng chỉnh chu, rõ ràng.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-500 z-10 relative">
        <p>&copy; {new Date().getFullYear()} Smart Finance App. Bảo lưu mọi quyền.</p>
      </footer>
    </div>
  );
}
