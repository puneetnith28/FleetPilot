import { Router } from 'express';
import { addClient, removeClient } from '../utils/sse';

const router = Router();

// GET /api/events - Subscribe to Server-Sent Events
router.get('/', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // Allow CORS if needed, though global middleware handles it usually
  });

  // Send an initial heartbeat/connection success event
  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Add the client to our connection manager
  addClient(res);

  // When the client disconnects, remove them from the manager
  req.on('close', () => {
    removeClient(res);
  });
});

export default router;
