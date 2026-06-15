import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

async function getDashboardData(token: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    // Fetch user transactions (up to 100 to get a solid list for calculations)
    const txRes = await fetch(`${API_URL}/transactions?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 0 } // Always fresh for SSR
    });

    // Fetch budget status
    const budgetRes = await fetch(`${API_URL}/budgets/status`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });

    const txData = await txRes.json();
    const budgetData = await budgetRes.json();

    return {
      transactions: txData.success ? txData.data : [],
      budgetsStatus: budgetData.success ? budgetData.data : []
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      transactions: [],
      budgetsStatus: []
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if ((session?.user as any)?.role === 'Admin') {
    redirect('/admin');
  }

  const token = (session as any)?.accessToken || '';

  const { transactions, budgetsStatus } = await getDashboardData(token);

  return <DashboardClient transactions={transactions} budgetsStatus={budgetsStatus} />;
}
