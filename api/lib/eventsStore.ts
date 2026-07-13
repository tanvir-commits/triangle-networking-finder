import { createRequire } from 'node:module';

export type StoredEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  city: string;
  category: string;
  description: string;
  url?: string;
  source: string;
  disclaimer?: string;
};

const require = createRequire(import.meta.url);
const seedEvents = require('../data/events-seed.json') as StoredEvent[];

const EVENTS_KEY = 'tnf:events';

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getEvents(): Promise<StoredEvent[]> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      const stored = await kv.get<StoredEvent[]>(EVENTS_KEY);
      if (stored && stored.length > 0) return stored;
      await kv.set(EVENTS_KEY, seedEvents);
      return seedEvents as StoredEvent[];
    } catch {
      return seedEvents as StoredEvent[];
    }
  }
  return seedEvents as StoredEvent[];
}

export async function saveEvents(events: StoredEvent[]): Promise<void> {
  if (!hasKv()) {
    throw new Error(
      'Server-side event storage requires Vercel KV. Connect a KV store and set KV_REST_API_URL / KV_REST_API_TOKEN.',
    );
  }
  const { kv } = await import('@vercel/kv');
  await kv.set(EVENTS_KEY, events);
}

export function validateEventPayload(raw: unknown): StoredEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const id = String(e.id ?? '').trim();
  const title = String(e.title ?? '').trim();
  const date = String(e.date ?? '').trim();
  const venue = String(e.venue ?? '').trim();
  const city = String(e.city ?? '').trim();
  const category = String(e.category ?? '').trim();
  const description = String(e.description ?? '').trim();
  const source = String(e.source ?? '').trim();

  if (!id || !title || !date || !venue || !city || !category || !description || !source) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    id,
    title: title.slice(0, 200),
    date,
    time: e.time ? String(e.time).slice(0, 40) : undefined,
    venue: venue.slice(0, 200),
    city: city.slice(0, 100),
    category: category.slice(0, 50),
    description: description.slice(0, 1000),
    url: e.url ? String(e.url).slice(0, 500) : undefined,
    source: source.slice(0, 100),
    disclaimer: e.disclaimer ? String(e.disclaimer).slice(0, 300) : undefined,
  };
}

export async function addEvent(event: StoredEvent): Promise<StoredEvent[]> {
  const events = await getEvents();
  const filtered = events.filter((item) => item.id !== event.id);
  const next = [...filtered, event].sort((a, b) => a.date.localeCompare(b.date));
  await saveEvents(next);
  return next;
}

export async function removeEvent(eventId: string): Promise<StoredEvent[]> {
  const events = await getEvents();
  const next = events.filter((item) => item.id !== eventId);
  await saveEvents(next);
  return next;
}
