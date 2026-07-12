import { Response } from 'express';

// Store all active client connections
let clients: Response[] = [];

/**
 * Add a new client to the SSE connections list
 */
export const addClient = (res: Response) => {
  clients.push(res);
};

/**
 * Remove a client from the SSE connections list
 */
export const removeClient = (res: Response) => {
  clients = clients.filter(client => client !== res);
};

/**
 * Broadcast an event to all connected clients
 * @param event The event type (e.g., 'invalidate')
 * @param data The payload data (e.g., { keys: ['trips'] })
 */
export const broadcast = (event: string, data: any) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    // Write directly to the stream without ending it
    client.write(payload);
  });
};
