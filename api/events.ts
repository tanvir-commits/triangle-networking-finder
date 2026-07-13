import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './lib/cors.js';
import {
  addEvent,
  getEvents,
  removeEvent,
  validateEventPayload,
} from './lib/eventsStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const events = await getEvents();
      return res.status(200).json({ events, storage: process.env.KV_REST_API_URL ? 'kv' : 'seed' });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = String(body?.action ?? 'add');

      if (action === 'remove') {
        const eventId = String(body?.eventId ?? '').trim();
        if (!eventId) return res.status(400).json({ error: 'eventId is required.' });
        const events = await removeEvent(eventId);
        return res.status(200).json({ events });
      }

      const event = validateEventPayload(body?.event ?? body);
      if (!event) {
        return res.status(400).json({
          error: 'Invalid event. Required: id, title, date (YYYY-MM-DD), venue, city, category, description, source.',
        });
      }

      const events = await addEvent(event);
      return res.status(200).json({ events });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Events request failed.';
    return res.status(500).json({ error: message });
  }
}
