'use strict';
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTransactionStore } from '@/store/transactionStore';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '@/lib/axios';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Filter, 
  X, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar,
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

const transactionSchema = z.object({
  amount: z.coerce.number().positive('Số tiền phải là số dương'),
  type: z.enum(['income', 'expense'], { message: 'Loại giao dịch bắt buộc' }),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  date: z.string().min(1, 'Vui lòng chọn ngày'),
  description: z.string().optional()
});

type TransactionFormValues = z.input<typeof transactionSchema>;

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

export default function TransactionsPage() {
  const { 
    transactions, 
    loading, 
    pagination, 
    filters, 
    setFilters, 
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useTransactionStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  
  // Custom Toast States
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const triggerToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: undefined,
      type: 'expense',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    }
  });

  const selectedType = watch('type');
  const amountValue = watch('amount');
  const [amountDisplay, setAmountDisplay] = useState('');

  useEffect(() => {
    if (amountValue) {
      setAmountDisplay(Number(amountValue).toLocaleString('vi-VN'));
    } else {
      setAmountDisplay('');
    }
  }, [amountValue]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setValue('amount', 0 as any, { shouldValidate: true });
      return;
    }
    const numericValue = parseInt(rawValue, 10);
    setValue('amount', numericValue, { shouldValidate: true });
  };

  // Load categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await axiosInstance.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  // Fetch transactions on filter change
  useEffect(() => {
    fetchTransactions();
  }, [filters, fetchTransactions]);

  // Realtime: tự động cập nhật khi có giao dịch mới từ tab khác
  const { data: session } = useSession();
  const userId = (session?.user as any)?._id;
  const handleRealtimeChange = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  useRealtimeEvents({ userId, onTransactionChange: handleRealtimeChange });

  const filteredCategories = categories.filter(cat => cat.type === selectedType);

  const openAddModal = () => {
    setEditingTx(null);
    reset({
      amount: undefined,
      type: 'expense',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (tx: any) => {
    setEditingTx(tx);
    reset({
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId?._id || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      description: tx.description || ''
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: TransactionFormValues) => {
    let res;
    if (editingTx) {
      res = await updateTransaction(editingTx._id, data);
    } else {
      res = await addTransaction(data);
    }

    if (res.success) {
      setModalOpen(false);
      if (res.budgetWarning && res.warningMessage) {
        triggerToast(res.warningMessage, 'warning');
      } else {
        triggerToast(editingTx ? 'Cập nhật giao dịch thành công!' : 'Thêm giao dịch thành công!', 'success');
      }
    } else {
      triggerToast(res.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      const ok = await deleteTransaction(id);
      if (ok) {
        triggerToast('Xóa giao dịch thành công!', 'success');
      } else {
        triggerToast('Lỗi khi xóa giao dịch.', 'error');
      }
    }
  };

  const handleExport = (format: 'xlsx' | 'pdf') => {
    const token = (window as any).nextAuthSessionToken || ''; // NextAuth session or from API
    // Construct query parameters
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.type) params.append('type', filters.type);
    
    // Open in new tab or trigger direct download
    // NextAuth tokens are in headers, so for downloads it's easier to fetch or use a temp download mechanism.
    // Let's create an authorized fetch download helper:
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    downloadFile(`${API_URL}/reports/export?${params.toString()}`, `bao-cao-tai-chinh-${Date.now()}.${format}`);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      // Get auth header from Axios client interceptor setup
      const res = await axiosInstance.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
      triggerToast('Lỗi tải báo cáo từ máy chủ.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-xl animate-slide-in ${
          toast.type === 'warning' 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
            : toast.type === 'error' 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />}
          <div>
            <p className="text-sm font-semibold">{toast.type === 'warning' ? 'Cảnh báo Ngân Sách!' : 'Thông báo'}</p>
            <p className="text-xs mt-0.5 opacity-90">{toast.message}</p>
          </div>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-auto text-slate-400 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Quản lý giao dịch</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Xem, thêm mới hoặc lọc toàn bộ lịch sử thu nhập và chi tiêu của bạn.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          Thêm giao dịch
        </button>
      </div>

      {/* Filter and Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md transition-colors duration-300">
        {/* Search */}
        <div className="space-y-1.5 xl:col-span-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Từ khóa tìm kiếm</label>
          <input
            type="text"
            placeholder="Tìm theo mô tả..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Type & Category */}
        <div className="space-y-1.5 xl:col-span-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Loại & Danh mục</label>
          <div className="flex gap-2">
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ type: e.target.value, categoryId: '', page: 1 })}
              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">Tất cả loại</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
            </select>
            
            <select
              value={filters.categoryId || ''}
              onChange={(e) => setFilters({ categoryId: e.target.value, page: 1 })}
              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">Tất cả danh mục</option>
              {categories
                .filter(c => !filters.type || c.type === filters.type)
                .map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Date Filter */}
        <div className="space-y-1.5 xl:col-span-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Lọc theo ngày</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ startDate: e.target.value, page: 1 })}
              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ endDate: e.target.value, page: 1 })}
              className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Export Reports */}
        <div className="space-y-1.5 xl:col-span-2 flex flex-col justify-end">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-400 mb-0.5">Xuất báo cáo</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-400 transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Mô tả</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="ml-2 text-slate-400">Đang tải giao dịch...</span>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const Icon = tx.categoryId && iconMap[tx.categoryId.icon] ? iconMap[tx.categoryId.icon] : Tag;
                  return (
                    <tr key={tx._id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
                            style={{ backgroundColor: `${tx.categoryId?.color || '#334155'}15` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: tx.categoryId?.color || '#94A3B8' }} />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{tx.categoryId?.name || 'Khác'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          tx.type === 'income' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tx.type === 'income' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {tx.description || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${
                        tx.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}
                        {tx.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx._id)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy giao dịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/30">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Trang {pagination.page} / {pagination.pages} (Tổng {pagination.total} giao dịch)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters({ page: pagination.page - 1 })}
                className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-950/40"
              >
                <ChevronLeft className="h-4 w-4" /> Trước
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters({ page: pagination.page + 1 })}
                className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-950/40"
              >
                Sau <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {editingTx ? 'Sửa thông tin giao dịch' : 'Thêm giao dịch mới'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Type Switcher */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Loại giao dịch</label>
                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'expense');
                      setValue('categoryId', '');
                    }}
                    className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                      selectedType === 'expense' 
                        ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'income');
                      setValue('categoryId', '');
                    }}
                    className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                      selectedType === 'income' 
                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label htmlFor="amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Số tiền (VND)</label>
                <input
                  id="amount"
                  type="text"
                  placeholder="Ví dụ: 50.000"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                
                {/* Quick Amount Suggestion Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[20000, 50000, 100000, 500000, 1000000, 2000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        const current = Number(watch('amount')) || 0;
                        setValue('amount', current + amt, { shouldValidate: true });
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      +{amt >= 1000000 ? `${amt/1000000}M` : `${amt/1000}K`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setValue('amount', 0 as any)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
                {errors.amount && <p className="text-xs text-red-500 dark:text-red-400">{errors.amount.message as string}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="categoryId" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Danh mục</label>
                <select
                  id="categoryId"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  {...register('categoryId')}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {filteredCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 dark:text-red-400">{errors.categoryId.message as string}</p>}
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label htmlFor="date" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Ngày giao dịch</label>
                <div className="relative">
                  <input
                    id="date"
                    type="date"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                    {...register('date')}
                  />
                </div>
                {errors.date && <p className="text-xs text-red-500 dark:text-red-400">{errors.date.message as string}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="block text-xs font-semibold text-slate-700 dark:text-slate-400">Mô tả chi tiết</label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Ví dụ: Ăn tối cùng bạn bè..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  {...register('description')}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/10"
                >
                  {editingTx ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
