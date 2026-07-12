import { get, set } from 'idb-keyval';
import { fuelApi, maintenanceApi, tripsApi } from './api';

export type OfflineActionType = 'LOG_FUEL' | 'LOG_MAINTENANCE' | 'TRIP_COMPLETE';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = 'fleetpilot_offline_queue';

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  const queue = await get(QUEUE_KEY);
  return queue || [];
}

export async function queueAction(type: OfflineActionType, payload: any) {
  const queue = await getOfflineQueue();
  queue.push({
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

export async function clearQueue() {
  await set(QUEUE_KEY, []);
}

export async function removeAction(id: string) {
  const queue = await getOfflineQueue();
  await set(QUEUE_KEY, queue.filter((item) => item.id !== id));
}

export async function processOfflineQueue(onProcessed?: () => void) {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} offline actions...`);
  let processedCount = 0;

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'LOG_FUEL':
          await fuelApi.create(action.payload);
          break;
        case 'LOG_MAINTENANCE':
          await maintenanceApi.create(action.payload);
          break;
        case 'TRIP_COMPLETE':
          const { id, ...data } = action.payload;
          await tripsApi.complete(id, data);
          break;
      }
      // If successful, remove it from the queue
      await removeAction(action.id);
      processedCount++;
    } catch (error) {
      console.error(`Failed to process offline action ${action.id}:`, error);
      // Leave it in the queue for the next retry if it's a network error.
      // Ideally, we'd distinguish between 4xx (bad request) and 5xx/network errors,
      // but for simplicity, we retry later.
    }
  }
  
  if (processedCount > 0 && onProcessed) {
    onProcessed();
  }
}
