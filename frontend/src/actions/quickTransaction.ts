'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function createQuickTransaction(formData: {
  amount: number;
  categoryId: string;
  type: 'expense' | 'income';
  description: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !(session as any).accessToken) {
    return { success: false, message: 'Chưa xác thực người dùng.' };
  }

  const token = (session as any).accessToken;

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...formData,
        date: new Date()
      })
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Quick transaction Server Action error:', error);
    return { success: false, message: 'Không thể kết nối đến máy chủ.' };
  }
}
