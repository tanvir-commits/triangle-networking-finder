import type { TriangleEvent } from '../types/event';
import { formatEventDate } from '../utils/events';

type EventCardProps = {
  event: TriangleEvent;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="event-card">
      <div className="event-card-header">
        <div>
          <h3>{event.title}</h3>
          <p className="event-meta">
            {formatEventDate(event.date, event.time)}
            {event.city ? ` · ${event.city}` : ''}
          </p>
        </div>
        <span className="badge">{event.category}</span>
      </div>

      <p className="event-venue">{event.venue}</p>
      {event.description && <p className="event-description">{event.description}</p>}

      <div className="event-footer">
        {event.source && <span className="event-source">Source: {event.source}</span>}
        {event.url && (
          <a className="btn btn-secondary" href={event.url} target="_blank" rel="noreferrer">
            Details
          </a>
        )}
      </div>

      {event.disclaimer && <p className="event-disclaimer">{event.disclaimer}</p>}
    </article>
  );
}
