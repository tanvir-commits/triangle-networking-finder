import { useMemo, useState } from 'react';
import { places } from './data/places';
import type { Place, PlaceCategory, SortOption, UserData } from './types/place';
import { calculateNetworkingScore, parseCostValue } from './utils/scoring';
import {
  exportUserData,
  importUserData,
  loadUserData,
  resetUserData,
  saveUserData,
} from './utils/storage';
import { Header } from './components/Header';
import { PlaceCard } from './components/PlaceCard';
import { EventsView } from './components/EventsView';
import { ChatPanel } from './components/ChatPanel';
import { QrCodeSection } from './components/QrCodeSection';
import { SettingsModal } from './components/SettingsModal';
import type { AppView } from './types/view';
import './styles.css';

function filterPlaces(
  items: Place[],
  search: string,
  category: PlaceCategory | 'All',
  maxDriveTime: number,
): Place[] {
  const query = search.trim().toLowerCase();

  return items.filter((place) => {
    if (place.driveTimeMinutes > maxDriveTime) return false;
    if (category !== 'All' && place.category !== category) return false;
    if (!query) return true;

    const haystack = [
      place.name,
      place.city,
      place.category,
      place.audience,
      place.whyItFits,
      place.bestFor.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function sortPlaces(items: Place[], sort: SortOption): Place[] {
  const sorted = [...items];

  switch (sort) {
    case 'closest':
      return sorted.sort((a, b) => a.driveTimeMinutes - b.driveTimeMinutes);
    case 'lowest-cost':
      return sorted.sort(
        (a, b) => parseCostValue(a.estimatedCost) - parseCostValue(b.estimatedCost),
      );
    case 'couples':
      return sorted.sort((a, b) => {
        const scoreA = (a.couplesFriendly ? 2 : 0) + (a.wifeFriendly ? 1 : 0);
        const scoreB = (b.couplesFriendly ? 2 : 0) + (b.wifeFriendly ? 1 : 0);
        return scoreB - scoreA || calculateNetworkingScore(b) - calculateNetworkingScore(a);
      });
    case 'networking':
    default:
      return sorted.sort(
        (a, b) => calculateNetworkingScore(b) - calculateNetworkingScore(a),
      );
  }
}

function groupByCategory(items: Place[]): Record<string, Place[]> {
  return items.reduce<Record<string, Place[]>>((groups, place) => {
    const key = place.category;
    groups[key] = groups[key] ? [...groups[key], place] : [place];
    return groups;
  }, {});
}

export default function App() {
  const [search, setSearch] = useState('');
  const [maxDriveTime, setMaxDriveTime] = useState(35);
  const [sort, setSort] = useState<SortOption>('networking');
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | 'All'>('All');
  const [view, setView] = useState<AppView>('places');
  const [userData, setUserData] = useState<UserData>(() => loadUserData());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventsVersion, setEventsVersion] = useState(0);

  const filteredPlaces = useMemo(
    () => sortPlaces(filterPlaces(places, search, activeCategory, maxDriveTime), sort),
    [search, activeCategory, maxDriveTime, sort],
  );

  const shortlist = useMemo(
    () => filteredPlaces.filter((place) => userData[place.id]?.favorite),
    [filteredPlaces, userData],
  );

  const groupedPlaces = useMemo(() => groupByCategory(filteredPlaces), [filteredPlaces]);
  const categories = Object.keys(groupedPlaces).sort();

  const updateUserData = (placeId: string, patch: Partial<UserData[string]>) => {
    setUserData((current) => {
      const next = {
        ...current,
        [placeId]: {
          favorite: current[placeId]?.favorite ?? false,
          visited: current[placeId]?.visited ?? false,
          rating: current[placeId]?.rating,
          notes: current[placeId]?.notes,
          ...patch,
        },
      };
      saveUserData(next);
      return next;
    });
  };

  const shortlistCount = Object.values(userData).filter((entry) => entry.favorite).length;

  const renderCards = (items: Place[]) => (
    <div className="cards-grid">
      {items.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          userData={userData[place.id]}
          expanded={expandedId === place.id}
          onToggleExpand={() =>
            setExpandedId((current) => (current === place.id ? null : place.id))
          }
          onToggleFavorite={() =>
            updateUserData(place.id, {
              favorite: !(userData[place.id]?.favorite ?? false),
            })
          }
          onToggleVisited={() =>
            updateUserData(place.id, {
              visited: !(userData[place.id]?.visited ?? false),
            })
          }
          onRatingChange={(rating) => updateUserData(place.id, { rating: rating || undefined })}
          onNotesChange={(notes) => updateUserData(place.id, { notes })}
        />
      ))}
    </div>
  );

  return (
    <div className="app-shell">
      <Header
        search={search}
        maxDriveTime={maxDriveTime}
        sort={sort}
        activeCategory={activeCategory}
        view={view}
        shortlistCount={shortlistCount}
        onSearchChange={setSearch}
        onMaxDriveTimeChange={setMaxDriveTime}
        onSortChange={setSort}
        onCategoryChange={setActiveCategory}
        onViewChange={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={() => exportUserData(userData)}
        onImport={async (file) => {
          try {
            const imported = await importUserData(file);
            setUserData(imported);
            saveUserData(imported);
          } catch {
            window.alert('Could not import that file. Please choose a valid JSON export.');
          }
        }}
        onReset={() => {
          if (window.confirm('Reset all favorites, notes, and visited status?')) {
            setUserData(resetUserData());
          }
        }}
      />

      <main className={view === 'ai' ? 'app-main app-main-chat' : 'app-main'}>
        {view === 'ai' ? (
          <ChatPanel
            places={filteredPlaces}
            maxDriveTime={maxDriveTime}
            activeCategory={activeCategory}
            userData={userData}
            expandedId={expandedId}
            onToggleExpand={(placeId) =>
              setExpandedId((current) => (current === placeId ? null : placeId))
            }
            onToggleFavorite={(placeId) =>
              updateUserData(placeId, {
                favorite: !(userData[placeId]?.favorite ?? false),
              })
            }
            onToggleVisited={(placeId) =>
              updateUserData(placeId, {
                visited: !(userData[placeId]?.visited ?? false),
              })
            }
            onRatingChange={(placeId, rating) =>
              updateUserData(placeId, { rating: rating || undefined })
            }
            onNotesChange={(placeId, notes) => updateUserData(placeId, { notes })}
            onEventsChanged={() => setEventsVersion((v) => v + 1)}
          />
        ) : view === 'events' ? (
          <EventsView key={eventsVersion} />
        ) : view === 'shortlist' ? (
          shortlist.length ? (
            renderCards(shortlist)
          ) : (
            <p className="empty-state">No favorites yet. Tap ☆ Shortlist on any place card.</p>
          )
        ) : filteredPlaces.length ? (
          categories.map((category) => (
            <section key={category} className="category-section">
              <h2>{category}</h2>
              {renderCards(groupedPlaces[category])}
            </section>
          ))
        ) : (
          <p className="empty-state">No places match your filters. Try widening drive time or clearing search.</p>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <footer className="app-footer">
        <QrCodeSection />
        <p>{places.length} curated places · Drive times are approximate from Durham 27707</p>
      </footer>
    </div>
  );
}
