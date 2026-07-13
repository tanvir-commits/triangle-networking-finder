import type { TriangleEvent } from '../types/event';
import seedEvents from './events-seed.json';

export const EVENTS_DISCLAIMER =
  'Dates are illustrative examples seeded for demo. Always verify event details on the source website before attending.';

export const seedTriangleEvents: TriangleEvent[] = seedEvents.map((event) => ({
  ...event,
  addedBy: 'seed' as const,
}));
