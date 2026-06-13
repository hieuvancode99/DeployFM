'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Tag, Plus, Pencil, Trash2, X, Check, TrendingUp, TrendingDown,
  Utensils, Car, Home, Film, ShoppingBag, Heart, GraduationCap,
  Briefcase, Award, PlusCircle, MinusCircle, AlertCircle, Loader2
} from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

const iconMap: Record<string, React.ComponentType<any>> = {
  utensils: Utensils, car: Car, home: Home, film: Film,
  'shopping-bag': ShoppingBag, heart: Heart, 'graduation-cap': GraduationCap,
  briefcase: Briefcase, award: Award, 'plus-circle': PlusCircle,
  'minus-circle': MinusCircle, 'trending-up': TrendingUp, tag: Tag
};

const iconOptions = [
  { value: 'utensils', label: 'Ăn uống' },
  { value: 'car', label: 'Di chuyển' },
  { value: 'home', label: 'Nhà cửa' },
  { value: 'film', label: 'Giải trí' },
  { value: 'shopping-bag', label: 'Mua sắm' },
  { value: 'heart', label: 'Sức khỏe' },
  { value: 'graduation-cap', label: 'Giáo dục' },
  { value: 'briefcase', label: 'Công việc' },
  { value: 'award', label: 'Thưởng' },
  { value: 'trending-up', label: 'Đầu tư' },
  { value: 'plus-circle', label: 'Thu nhập khác' },
  { value: 'minus-circle', label: 'Chi tiêu khác' },
  { value: 'tag', label: 'Chung' },
];

const colorOptions = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1',
  '#059669', '#6EE7B7', '#34D399', '#9CA3AF'
];

interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export default function CategoriesPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?._id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('tag');
  const [editColor, setEditColor] = useState('#6B7280');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form thêm mới
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newIcon, setNewIcon] = useState('tag');
  const [newColor, setNewColor] = useState('#6B7280');
  const [addLoading, setAddLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchCategories();
  }, [session, fetchCategories]);

  useRealtimeEvents({ userId, onTransactionChange: fetchCategories });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setFormError('Vui lòng nhập tên danh mục'); return; }
    setFormError('');
    setAddLoading(true);
    try {
      const res = await axiosInstance.post('/categories', {
        name: newName.trim(), type: newType, icon: newIcon, color: newColor
      });
      if (res.data.success) {
        showToast('Đã thêm danh mục mới', 'success');
        setShowAddModal(false);
        setNewName(''); setNewType('expense'); setNewIcon('tag'); setNewColor('#6B7280');
        fetchCategories();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Lỗi khi thêm danh mục');
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await axiosInstance.put(`/categories/${id}`, {
        name: editName.trim(), icon: editIcon, color: editColor
      });
      if (res.data.success) {
        showToast('Đã cập nhật danh mục', 'success');
        setEditingId(null);
        fetchCategories();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa danh mục "${name}"? Thao tác này không thể hoàn tác.`)) return;
    setDeleteLoading(id);
    try {
      await axiosInstance.delete(`/categories/${id}`);
      showToast('Đã xóa danh mục', 'success');
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi khi xóa', 'error');
    } finally {
      setDeleteLoading(null);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border backdrop-blur-xl ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tag className="h-8 w-8 text-indigo-600 dark:text-indigo-500" />
            Danh mục của tôi
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Quản lý danh mục thu chi cá nhân của bạn.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          Thêm danh mục
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Thu nhập */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-400 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" />
              Thu nhập ({incomeCategories.length})
            </h2>
            <div className="space-y-2">
              {incomeCategories.map(cat => <CategoryCard key={cat._id} cat={cat} editingId={editingId} editName={editName} editIcon={editIcon} editColor={editColor} setEditName={setEditName} setEditIcon={setEditIcon} setEditColor={setEditColor} onEdit={startEdit} onSave={handleUpdate} onCancelEdit={() => setEditingId(null)} onDelete={handleDelete} deleteLoading={deleteLoading} iconMap={iconMap} iconOptions={iconOptions} colorOptions={colorOptions} />)}
              {incomeCategories.length === 0 && <EmptyState type="income" />}
            </div>
          </div>

          {/* Chi tiêu */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-rose-400 uppercase tracking-wider">
              <TrendingDown className="h-4 w-4" />
              Chi tiêu ({expenseCategories.length})
            </h2>
            <div className="space-y-2">
              {expenseCategories.map(cat => <CategoryCard key={cat._id} cat={cat} editingId={editingId} editName={editName} editIcon={editIcon} editColor={editColor} setEditName={setEditName} setEditIcon={setEditIcon} setEditColor={setEditColor} onEdit={startEdit} onSave={handleUpdate} onCancelEdit={() => setEditingId(null)} onDelete={handleDelete} deleteLoading={deleteLoading} iconMap={iconMap} iconOptions={iconOptions} colorOptions={colorOptions} />)}
              {expenseCategories.length === 0 && <EmptyState type="expense" />}
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm danh mục */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Thêm danh mục mới
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />{formError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Tên danh mục</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Vd: Du lịch, Làm đẹp..." className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Loại</label>
                <div className="flex gap-2">
                  {(['income', 'expense'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setNewType(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newType === t ? (t === 'income' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30') : 'border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      {t === 'income' ? '↑ Thu nhập' : '↓ Chi tiêu'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Icon</label>
                <select value={newIcon} onChange={e => setNewIcon(e.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-3 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none">
                  {iconOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">Màu sắc</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(c => (
                    <button key={c} type="button" onClick={() => setNewColor(c)} className={`h-7 w-7 rounded-lg border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Hủy</button>
                <button type="submit" disabled={addLoading} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {addLoading && <Loader2 className="h-4 w-4 animate-spin" />} Thêm danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ cat, editingId, editName, editIcon, editColor, setEditName, setEditIcon, setEditColor, onEdit, onSave, onCancelEdit, onDelete, deleteLoading, iconMap, iconOptions, colorOptions }: any) {
  const Icon = iconMap[cat.icon] || Tag;
  const isEditing = editingId === cat._id;

  return (
    <div className={`rounded-xl border p-3.5 transition-all ${isEditing ? 'border-indigo-500/40 bg-slate-50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'}`}>
      {isEditing ? (
        <div className="space-y-3">
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 py-2 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none" autoFocus />
          <div className="flex gap-2">
            <select value={editIcon} onChange={e => setEditIcon(e.target.value)} className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none">
              {iconOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {colorOptions.map((c: string) => (
              <button key={c} type="button" onClick={() => setEditColor(c)} className={`h-6 w-6 rounded border-2 ${editColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSave(cat._id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
              <Check className="h-3.5 w-3.5" /> Lưu
            </button>
            <button onClick={onCancelEdit} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800" style={{ backgroundColor: `${cat.color}18` }}>
              <Icon className="h-4.5 w-4.5" style={{ color: cat.color }} />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onEdit(cat)} className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(cat._id, cat.name)} disabled={deleteLoading === cat._id} className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ type }: { type: 'income' | 'expense' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-slate-500 text-sm">
      Chưa có danh mục {type === 'income' ? 'thu nhập' : 'chi tiêu'} nào
    </div>
  );
}
