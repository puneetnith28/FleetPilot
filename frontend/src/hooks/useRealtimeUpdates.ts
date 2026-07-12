import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toaster';

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Determine API URL based on Vite config (same as api.ts)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const eventSourceUrl = `${API_URL}/events`;

    const eventSource = new EventSource(eventSourceUrl, {
      withCredentials: true, // Send cookies/cors headers if auth requires it
    });

    eventSource.onmessage = (event) => {
      // By default, SSE unnamed events come through here, but we are sending named events
      // so this might just be the connection heartbeat if we didn't name it.
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'connected') {
          console.log('[SSE] Connected to real-time updates');
        }
      } catch (e) {
        // Ignore JSON parse errors for basic text messages
      }
    };

    // Listen to our specific 'invalidate' events
    eventSource.addEventListener('invalidate', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.keys && Array.isArray(data.keys)) {
          console.log('[SSE] Received invalidation for keys:', data.keys);
          
          data.keys.forEach((key: string) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      } catch (err) {
        console.error('[SSE] Error parsing invalidation event:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      // EventSource automatically attempts to reconnect, so we don't need to manually recreate it
    };

    return () => {
      console.log('[SSE] Closing connection');
      eventSource.close();
    };
  }, [queryClient]);
}
