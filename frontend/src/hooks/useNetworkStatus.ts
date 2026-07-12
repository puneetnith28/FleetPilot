import { useState, useEffect, useCallback } from 'react';
import { processOfflineQueue, getOfflineQueue } from '@/lib/offlineQueue';
import { useQueryClient } from '@tanstack/react-query';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingQueueLength, setPendingQueueLength] = useState(0);
  const queryClient = useQueryClient();

  const updateQueueStatus = useCallback(async () => {
    const queue = await getOfflineQueue();
    setPendingQueueLength(queue.length);
  }, []);

  useEffect(() => {
    updateQueueStatus();

    const handleOnline = async () => {
      setIsOnline(true);
      await processOfflineQueue(() => {
        // Invalidate queries when processed to update UI
        queryClient.invalidateQueries();
      });
      updateQueueStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Also check queue length periodically in case of additions
    const interval = setInterval(updateQueueStatus, 5000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [queryClient, updateQueueStatus]);

  return { isOnline, pendingQueueLength, updateQueueStatus };
}
