'use strict';
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '@/lib/axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  PiggyBank, 
  Plus, 
  TrendingUp, 
  AlertCircle, 
  Trash2,
  Calendar,
  DollarSign,
  Info
} from 'lucide-react';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  amountLimit: z.coerce.number().positive('Hạn mức phải là số dương lớn hơn 0'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100)
});

type BudgetFormValues = z.input<typeof budgetSchema>;

export default function BudgetsPage() {
  const [budgetsStatus, setBudgetsStatus] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [amountDisplay, setAmountDisplay] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: '',
      amountLimit: undefined,
      month: currentMonth,
      year: currentYear
    }
  });

  const fetchBudgetsStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/budgets/status?month=${selectedMonth}&year=${selectedYear}`);
      if (res.data.success) {
        setBudgetsStatus(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/categories');
      if (res.data.success) {
        // Only allow budgeting for expense categories
        setCategories(res.data.data.filter((c: any) => c.type === 'expense'));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchBudgetsStatus();
  }, [fetchBudgetsStatus]);

  const onSubmit = async (data: BudgetFormValues) => {
    setMessage(null);
    setSubmitLoading(true);
    try {
      const res = await axiosInstance.post('/budgets', data);
      if (res.data.success) {
        setMessage({ text: 'Thiết lập ngân sách thành công!', type: 'success' });
        reset({
          categoryId: '',
          amountLimit: undefined,
          month: selectedMonth,
          year: selectedYear
        });
        setAmountDisplay('');
        fetchBudgetsStatus();
      } else {
        setMessage({ text: res.data.message || 'Lỗi khi đặt ngân sách.', type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu đến máy chủ.', 
        type: 'error' 
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountDisplay('');
      setValue('amountLimit', 0 as any, { shouldValidate: true });
      return;
    }
    const numericValue = parseInt(rawValue, 10);
    setAmountDisplay(numericValue.toLocaleString('vi-VN'));
    setValue('amountLimit', numericValue, { shouldValidate: true });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Quản lý ngân sách</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Đặt hạn mức chi tiêu hàng tháng cho từng danh mục để tránh vung tay quá trán.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Setup Budget Form */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md self-start">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Thiết lập hạn mức
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {message && (
              <div className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <Info className="h-4 w-4" />
                <span>{message.text}</span>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1">
              <label htmlFor="categoryId" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Danh mục chi tiêu</label>
              <select
                id="categoryId"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                {...register('categoryId')}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-400">{errors.categoryId.message}</p>}
            </div>

            {/* Amount Limit */}
            <div className="space-y-1">
              <label htmlFor="amountLimit" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Hạn mức tối đa (VND)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="amountLimit"
                  type="text"
                  placeholder="Ví dụ: 3.000.000"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 py-3 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {errors.amountLimit && <p className="text-xs text-red-400">{errors.amountLimit.message}</p>}
            </div>

            {/* Month & Year Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="month" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Tháng</label>
                <select
                  id="month"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  {...register('month')}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="year" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Năm</label>
                <select
                  id="year"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  {...register('year')}
                >
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear + 1}>{currentYear + 1}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
              {submitLoading ? 'Đang lưu...' : 'Đặt ngân sách'}
            </button>
          </form>
        </div>

        {/* Right: Budgets Progress comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Month/Year selector header */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/30 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Thống kê ngân sách thời gian:
            </h3>
            
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>
          </div>

          {/* Progress List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">So sánh Chi tiêu & Hạn mức</h2>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                <span className="ml-2 text-slate-400 text-sm">Đang tải dữ liệu ngân sách...</span>
              </div>
            ) : budgetsStatus.length > 0 ? (
              <div className="space-y-6">
                {budgetsStatus.map((budget) => {
                  let barColor = 'bg-emerald-500';
                  let bgBadge = 'bg-emerald-500/10 text-emerald-400';
                  if (budget.percentage >= 100) {
                    barColor = 'bg-red-500';
                    bgBadge = 'bg-red-500/10 text-red-400';
                  } else if (budget.percentage >= 70) {
                    barColor = 'bg-amber-500';
                    bgBadge = 'bg-amber-500/10 text-amber-400';
                  }

                  return (
                    <div key={budget._id} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{budget.category?.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Đã tiêu: <span className="font-semibold text-slate-700 dark:text-slate-300">{budget.spent.toLocaleString('vi-VN')} đ</span> / Hạn mức: {budget.amountLimit.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                        <span className={`text-xs font-bold rounded-lg px-2 py-1 ${bgBadge}`}>
                          {budget.percentage}%
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full ${barColor} transition-all duration-300`} 
                          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                        ></div>
                      </div>

                      {/* Over budget note */}
                      {budget.percentage >= 100 && (
                        <p className="text-[10px] text-red-400 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Bạn đã tiêu vượt định mức {Math.abs(budget.remaining).toLocaleString('vi-VN')} đ!</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                Không tìm thấy ngân sách nào được cài đặt cho khoảng thời gian này.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
