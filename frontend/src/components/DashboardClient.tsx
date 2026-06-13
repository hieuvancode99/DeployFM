'use strict';
'use client';

import React from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowRight,
  Utensils, 
  Car, 
  Home, 
  Film, 
  ShoppingBag, 
  Heart, 
  GraduationCap, 
  Briefcase, 
  Award,
  Tag
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';

interface DashboardClientProps {
  transactions: any[];
  budgetsStatus: any[];
}

// Icon helper map matching lucide icon names stored in Mongo
const iconMap: Record<string, React.ComponentType<any>> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  film: Film,
  'shopping-bag': ShoppingBag,
  heart: Heart,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  award: Award
};

export default function DashboardClient({ transactions, budgetsStatus }: DashboardClientProps) {
  // 1. Calculate stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // 2. Prepare Category breakdown data for PieChart
  const expenseByCategory: Record<string, { name: string; value: number; color: string }> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catName = t.categoryId ? t.categoryId.name : 'Khác';
      const catColor = t.categoryId ? t.categoryId.color : '#9CA3AF';
      if (!expenseByCategory[catName]) {
        expenseByCategory[catName] = { name: catName, value: 0, color: catColor };
      }
      expenseByCategory[catName].value += t.amount;
    });

  const pieData = Object.values(expenseByCategory);

  // 3. Prepare monthly data for BarChart (comparing income vs expense)
  // Let's group last 30 days daily transactions
  const dailyDataMap: Record<string, { date: string; income: number; expense: number }> = {};
  
  // Initialize last 7 days to ensure chart has items
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    dailyDataMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
  }

  transactions.forEach(t => {
    const dateStr = new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    // Only map if it fits into our last 7 days window (to keep chart readable)
    if (dailyDataMap[dateStr]) {
      if (t.type === 'income') {
        dailyDataMap[dateStr].income += t.amount;
      } else {
        dailyDataMap[dateStr].expense += t.amount;
      }
    }
  });

  const barData = Object.values(dailyDataMap);

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tổng quan tài chính</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Xin chào! Dưới đây là thống kê tình hình thu chi mới nhất của bạn.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 dark:opacity-10"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Số dư hiện tại</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {balance.toLocaleString('vi-VN')} <span className="text-lg font-normal text-slate-600 dark:text-slate-400">đ</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng tích lũy tài khoản của bạn
          </div>
        </div>

        {/* Income Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 dark:opacity-10"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tổng thu nhập</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +{totalIncome.toLocaleString('vi-VN')} <span className="text-lg font-normal text-slate-600 dark:text-slate-400">đ</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Từ lương, đầu tư và các khoản thu khác
          </div>
        </div>

        {/* Expense Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 dark:opacity-10"></div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tổng chi tiêu</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-600/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              -{totalExpense.toLocaleString('vi-VN')} <span className="text-lg font-normal text-slate-600 dark:text-slate-400">đ</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Bao gồm sinh hoạt phí, nhà ở, mua sắm
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Income vs Expense BarChart */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Biểu đồ thu chi tuần này</h2>
          <div className="h-80 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                  <XAxis dataKey="date" stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={12} tickLine={false} />
                  <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={12} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', border: '1px solid var(--tooltip-border, #e2e8f0)', borderRadius: '12px', color: 'var(--tooltip-text, #0f172a)' }}
                    itemStyle={{ color: 'var(--tooltip-text, #0f172a)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="income" name="Thu nhập" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Không có dữ liệu biểu đồ</div>
            )}
          </div>
        </div>

        {/* Expense Structure PieChart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Cơ cấu chi tiêu</h2>
          <div className="h-80 w-full flex flex-col justify-center items-center">
            {pieData.length > 0 ? (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${value.toLocaleString('vi-VN')} đ`}
                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', border: '1px solid var(--tooltip-border, #e2e8f0)', borderRadius: '12px', color: 'var(--tooltip-text, #0f172a)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom legends */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full max-h-24 overflow-y-auto px-4 text-xs">
                  {pieData.slice(0, 4).map((entry: any, i) => (
                     <div key={i} className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-slate-600 dark:text-slate-400 truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm">Chưa có chi tiêu nào được ghi nhận</div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Section (Recent Transactions & Budgets Warning) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Giao dịch gần đây</h2>
            <Link href="/transactions" className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Xem tất cả <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx: any) => {
                const Icon = tx.categoryId && iconMap[tx.categoryId.icon] ? iconMap[tx.categoryId.icon] : Tag;
                return (
                  <div key={tx._id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800"
                        style={{ backgroundColor: `${tx.categoryId?.color || '#334155'}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: tx.categoryId?.color || '#94A3B8' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{tx.description || tx.categoryId?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(tx.date).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>
                      {tx.type === 'income' ? '+' : '-'}
                      {tx.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">Chưa có giao dịch nào được lưu.</div>
            )}
          </div>
        </div>

        {/* Budgets Status Progress List */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tiến độ ngân sách</h2>
            <Link href="/budgets" className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Quản lý <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {budgetsStatus.length > 0 ? (
              budgetsStatus.map((budget: any) => {
                // Determine colors based on spent percentage
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-600 dark:text-emerald-400';
                if (budget.percentage >= 100) {
                  barColor = 'bg-red-500';
                  textColor = 'text-red-600 dark:text-red-400';
                } else if (budget.percentage >= 70) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-600 dark:text-amber-400';
                }
                
                return (
                  <div key={budget._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{budget.category?.name}</span>
                      <span className={`${textColor}`}>{budget.percentage}% ({budget.spent.toLocaleString('vi-VN')}đ / {budget.amountLimit.toLocaleString('vi-VN')}đ)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full ${barColor} transition-all duration-300`} 
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">Chưa thiết lập ngân sách tháng này.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
