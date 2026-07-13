import { useEffect, useMemo, useState } from 'react';
import type { TriangleEvent } from '../types/event';
import {
  EVENTS_DISCLAIMER,
  fetchServerEvents,
  getDisplayEvents,
  isUpcoming,
} from '../utils/events';
import { EventCard } from './EventCard';

export function EventsView() {
  const [serverEvents, setServerEvents] = useState<TriangleEvent[] | null>(null);
  const [storage, setStorage] = useState<string>('loading');
  const [category, setCategory] = useState<string>('All');
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchServerEvents().then((result) => {
      if (result) {
        setServerEvents(result.events);
        setStorage(result.storage);
      } else {
        setStorage('seed');
      }
    });
  }, []);

  const events = useMemo(() => getDisplayEvents(serverEvents), [serverEvents]);

  const categories = useMemo(() => {
    const set = new Set(events.map((e) => e.category));
    return ['All', ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (category !== 'All' && event.category !== category) return false;
      if (!showPast && !isUpcoming(event.date)) return false;
      return true;
    });
  }, [events, category, showPast]);

  return (
    <section className="events-panel">
      <div className="events-header">
        <div>
          <h2>Upcoming Events</h2>
          <p className="events-note">
            Triangle networking, social, and nightlife happenings near Durham 27707.
          </p>
        </div>
        <span className="badge badge-muted">via {storage}</span>
      </div>

      <p className="events-disclaimer">{EVENTS_DISCLAIMER}</p>

      <div className="chip-row" role="tablist" aria-label="Event categories">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            className={category === cat ? 'chip active' : 'chip'}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={showPast}
          onChange={(event) => setShowPast(event.target.checked)}
        />
        Show past events
      </label>

      {filtered.length ? (
        <div className="events-grid">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="empty-state">No events match your filters. Ask the AI chat to find more.</p>
      )}
    </section>
  );
}
