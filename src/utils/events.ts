import type { TriangleEvent, ProposedEventAction } from '../types/event';
import { seedTriangleEvents, EVENTS_DISCLAIMER } from '../data/events';
import { getApiBaseUrl } from './settings';

const LOCAL_EVENTS_KEY = 'triangle-networking-finder-local-events';
const REMOVED_IDS_KEY = 'triangle-networking-finder-removed-event-ids';

export { EVENTS_DISCLAIMER };

export function loadLocalEvents(): TriangleEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as TriangleEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEvents(events: TriangleEvent[]): void {
  localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
}

export function loadRemovedEventIds(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRemovedEventIds(ids: string[]): void {
  localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify(ids));
}

export function mergeEvents(
  serverEvents: TriangleEvent[],
  localEvents: TriangleEvent[],
  removedIds: string[],
): TriangleEvent[] {
  const map = new Map<string, TriangleEvent>();

  for (const event of serverEvents) {
    if (!removedIds.includes(event.id)) map.set(event.id, event);
  }
  for (const event of localEvents) {
    if (!removedIds.includes(event.id)) {
      map.set(event.id, { ...event, addedBy: event.addedBy || 'local' });
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getDisplayEvents(serverEvents: TriangleEvent[] | null): TriangleEvent[] {
  const base = serverEvents?.length ? serverEvents : seedTriangleEvents;
  return mergeEvents(base, loadLocalEvents(), loadRemovedEventIds());
}

export async function fetchServerEvents(): Promise<{
  events: TriangleEvent[];
  storage: string;
} | null> {
  const base = getApiBaseUrl();
  if (base) {
    try {
      const response = await fetch(`${base}/events`);
      if (response.ok) {
        const data = (await response.json()) as { events: TriangleEvent[]; storage: string };
        return { events: data.events, storage: data.storage };
      }
    } catch {
      // fall through to static
    }
  }

  try {
    const staticUrl = `${import.meta.env.BASE_URL}events.json`;
    const response = await fetch(staticUrl);
    if (response.ok) {
      const data = (await response.json()) as { events: TriangleEvent[] };
      return { events: data.events, storage: 'static' };
    }
  } catch {
    // ignore
  }

  return null;
}

export function applyProposedEvent(proposal: ProposedEventAction): void {
  const local = loadLocalEvents();
  const removed = loadRemovedEventIds();

  if (proposal.action === 'remove' && proposal.id) {
    saveRemovedEventIds([...new Set([...removed, proposal.id])]);
    saveLocalEvents(local.filter((e) => e.id !== proposal.id));
    return;
  }

  if (proposal.action === 'add') {
    const id =
      proposal.id ||
      `${proposal.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)}-${proposal.date}`;

    const event: TriangleEvent = {
      id,
      title: proposal.title,
      date: proposal.date,
      time: proposal.time,
      venue: proposal.venue,
      city: proposal.city,
      category: proposal.category,
      url: proposal.url,
      source: proposal.source || 'AI suggestion',
      description: proposal.description,
      addedBy: 'local',
      createdAt: new Date().toISOString(),
    };

    saveRemovedEventIds(removed.filter((rid) => rid !== id));
    saveLocalEvents([...local.filter((e) => e.id !== id), event]);
  }
}

export async function persistEventToServer(proposal: ProposedEventAction): Promise<boolean> {
  const base = getApiBaseUrl();
  if (!base) return false;

  try {
    const body =
      proposal.action === 'remove'
        ? { action: 'remove', eventId: proposal.id }
        : {
            action: 'add',
            event: {
              id: proposal.id,
              title: proposal.title,
              date: proposal.date,
              time: proposal.time,
              venue: proposal.venue,
              city: proposal.city || 'Triangle',
              category: proposal.category,
              description: proposal.description || 'Added via AI chat.',
              url: proposal.url,
              source: proposal.source || 'AI chat',
            },
          };

    const response = await fetch(`${base}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function formatEventDate(date: string, time?: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const formatted = parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return time ? `${formatted} · ${time}` : formatted;
}

export function isUpcoming(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${date}T12:00:00`);
  return eventDate >= today;
}
