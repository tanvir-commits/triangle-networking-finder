import type { Place, UserPlaceData } from '../types/place';
import { calculateNetworkingScore } from '../utils/scoring';

type PlaceCardProps = {
  place: Place;
  userData?: UserPlaceData;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleFavorite: () => void;
  onToggleVisited: () => void;
  onRatingChange: (rating: number) => void;
  onNotesChange: (notes: string) => void;
};

export function PlaceCard({
  place,
  userData,
  expanded,
  onToggleExpand,
  onToggleFavorite,
  onToggleVisited,
  onRatingChange,
  onNotesChange,
}: PlaceCardProps) {
  const score = calculateNetworkingScore(place);

  return (
    <article className="place-card">
      <div className="place-card-header">
        <div>
          <h3>{place.name}</h3>
          <p className="place-meta">
            {place.category} · {place.city} · ~{place.driveTimeMinutes} min
          </p>
        </div>
        <div className="score-badge" aria-label={`Networking score ${score}`}>
          {score}
        </div>
      </div>

      <p className="place-audience">{place.audience}</p>
      <p className="place-why">{place.whyItFits}</p>

      <div className="place-quick">
        <span>{place.estimatedCost}</span>
        <span>{place.bestTimeToGo}</span>
      </div>

      <div className="badge-row">
        {place.couplesFriendly && <span className="badge">Couples-friendly</span>}
        {place.wifeFriendly && <span className="badge">Great for your wife</span>}
        {place.membershipRequired && <span className="badge badge-muted">Membership</span>}
        <span className={`badge badge-${place.networkingPotential.toLowerCase()}`}>
          {place.networkingPotential} networking
        </span>
      </div>

      <div className="card-actions">
        <a href={place.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
          Website
        </a>
        <a href={place.googleMapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
          Navigate
        </a>
        <button type="button" className="btn btn-ghost" onClick={onToggleExpand}>
          {expanded ? 'Less' : 'Details'}
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${userData?.favorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={userData?.favorite ?? false}
        >
          {userData?.favorite ? '★ Shortlisted' : '☆ Shortlist'}
        </button>
      </div>

      {expanded && (
        <div className="place-details">
          <p><strong>Social opportunities:</strong> {place.socialOpportunities}</p>
          <p><strong>Best for:</strong> {place.bestFor.join(', ')}</p>
          <p><strong>Address:</strong> {place.address}</p>
          {place.sourceNotes && <p><strong>Notes:</strong> {place.sourceNotes}</p>}

          <label className="field-label">
            Visited
            <input
              type="checkbox"
              checked={userData?.visited ?? false}
              onChange={onToggleVisited}
            />
          </label>

          <label className="field-label">
            Personal rating
            <select
              value={userData?.rating ?? 0}
              onChange={(event) => onRatingChange(Number(event.target.value))}
            >
              <option value={0}>Not rated</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Personal notes
            <textarea
              value={userData?.notes ?? ''}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Add your own notes..."
            />
          </label>
        </div>
      )}
    </article>
  );
}
