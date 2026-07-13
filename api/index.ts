import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({
    ok: true,
    endpoints: ['/api/events', '/api/chat'],
    message:
      'Triangle Networking Finder API. Use /api/events for events and /api/chat for AI chat. In the app Settings, set API base URL to this host ending in /api (not a single endpoint path).',
  });
}
