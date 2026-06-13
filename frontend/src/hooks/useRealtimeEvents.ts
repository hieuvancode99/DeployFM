import { useEffect } from 'react';
import socket from '@/lib/socket';

interface RealtimeCallbacks {
  userId?: string;
  onTransactionChange?: () => void;
  onBudgetChange?: () => void;
  onForcedLogout?: () => void;
}

export function useRealtimeEvents({ userId, onTransactionChange, onBudgetChange, onForcedLogout }: RealtimeCallbacks) {
  useEffect(() => {
    const handleTransactionNew = (data: { userId: string }) => {
      if (!userId || data.userId === userId) {
        onTransactionChange?.();
      }
    };

    const handleTransactionUpdated = (data: { userId: string }) => {
      if (!userId || data.userId === userId) {
        onTransactionChange?.();
      }
    };

    const handleTransactionDeleted = (data: { userId: string }) => {
      if (!userId || data.userId === userId) {
        onTransactionChange?.();
      }
    };

    const handleBudgetUpdated = (data: { userId: string }) => {
      if (!userId || data.userId === userId) {
        onBudgetChange?.();
      }
    };

    const handleUserBanned = (data: { userId: string }) => {
      if (userId && data.userId === userId) {
        onForcedLogout?.();
      }
    };

    socket.on('transaction:new', handleTransactionNew);
    socket.on('transaction:updated', handleTransactionUpdated);
    socket.on('transaction:deleted', handleTransactionDeleted);
    socket.on('budget:updated', handleBudgetUpdated);
    socket.on('user:banned', handleUserBanned);

    return () => {
      socket.off('transaction:new', handleTransactionNew);
      socket.off('transaction:updated', handleTransactionUpdated);
      socket.off('transaction:deleted', handleTransactionDeleted);
      socket.off('budget:updated', handleBudgetUpdated);
      socket.off('user:banned', handleUserBanned);
    };
  }, [userId, onTransactionChange, onBudgetChange, onForcedLogout]);
}
