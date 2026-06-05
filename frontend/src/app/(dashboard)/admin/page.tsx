'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ShieldAlert, Users, Ban, CheckCircle, FolderLock, Search, RefreshCw, Crown, User as UserIcon } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'User' | 'Admin';
  isBanned: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?._id;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'Admin') fetchUsers();
  }, [userRole, fetchUsers]);

  // Realtime: cập nhật khi có user bị ban/unban
  useRealtimeEvents({
    onTransactionChange: fetchUsers,
  });

  const handleBan = async (userId: string, name: string) => {
    if (!confirm(`Xác nhận cấm tài khoản "${name}"? Người dùng sẽ bị đăng xuất ngay lập tức.`)) return;
    setActionLoading(userId);
    try {
      const res = await axiosInstance.patch(`/admin/users/${userId}/ban`);
      if (res.data.success) {
        showToast(`Đã cấm tài khoản ${name}`, 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể cấm tài khoản', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId: string, name: string) => {
    setActionLoading(userId);
    try {
      const res = await axiosInstance.patch(`/admin/users/${userId}/unban`);
      if (res.data.success) {
        showToast(`Đã kích hoạt tài khoản ${name}`, 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể kích hoạt tài khoản', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (userRole !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
          <FolderLock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Quyền truy cập bị từ chối</h2>
        <p className="text-slate-400 text-sm max-w-md mt-2">
          Chỉ quản trị viên hệ thống mới được phép truy cập trang này.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const bannedUsers = users.filter(u => u.isBanned).length;
  const activeUsers = totalUsers - bannedUsers;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border backdrop-blur-xl animate-slide-in ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="h-8 w-8 text-indigo-500" />
            Quản lý Tài khoản
          </h1>
          <p className="text-slate-400 mt-1">Xem, cấm hoặc kích hoạt lại tài khoản người dùng trong hệ thống.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-100 text-sm transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
          <p className="text-3xl font-bold text-white">{totalUsers}</p>
          <p className="text-xs text-slate-400 mt-1">Tổng tài khoản</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
          <p className="text-3xl font-bold text-emerald-400">{activeUsers}</p>
          <p className="text-xs text-slate-400 mt-1">Đang hoạt động</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center">
          <p className="text-3xl font-bold text-red-400">{bannedUsers}</p>
          <p className="text-xs text-slate-400 mt-1">Đã bị cấm</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* User Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-slate-400 text-sm mt-3">Đang tải danh sách tài khoản...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-12 w-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Không tìm thấy tài khoản nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Người dùng</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Vai trò</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Ngày tạo</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Trạng thái</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                          user.isBanned ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            {user.name}
                            {user._id === currentUserId && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium">Bạn</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
                        user.role === 'Admin'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {user.role === 'Admin' ? <Crown className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                        {user.role === 'Admin' ? 'Quản trị viên' : 'Thành viên'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
                        user.isBanned
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isBanned ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        {user.isBanned ? 'Đã bị cấm' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role !== 'Admin' && user._id !== currentUserId ? (
                        user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user._id, user.name)}
                            disabled={actionLoading === user._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {actionLoading === user._id ? 'Đang xử lý...' : 'Kích hoạt'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user._id, user.name)}
                            disabled={actionLoading === user._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {actionLoading === user._id ? 'Đang xử lý...' : 'Cấm tài khoản'}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-600 italic">
                          {user._id === currentUserId ? '(Tài khoản của bạn)' : '(Admin)'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
