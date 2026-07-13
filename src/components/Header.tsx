import type { PlaceCategory, SortOption } from '../types/place';
import { CATEGORY_FILTERS } from '../types/place';
import type { AppView } from '../types/view';

type HeaderProps = {
  search: string;
  maxDriveTime: number;
  sort: SortOption;
  activeCategory: PlaceCategory | 'All';
  view: AppView;
  shortlistCount: number;
  onSearchChange: (value: string) => void;
  onMaxDriveTimeChange: (value: number) => void;
  onSortChange: (value: SortOption) => void;
  onCategoryChange: (value: PlaceCategory | 'All') => void;
  onViewChange: (view: AppView) => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
};

export function Header({
  search,
  maxDriveTime,
  sort,
  activeCategory,
  view,
  shortlistCount,
  onSearchChange,
  onMaxDriveTimeChange,
  onSortChange,
  onCategoryChange,
  onViewChange,
  onOpenSettings,
  onExport,
  onImport,
  onReset,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div>
          <h1>Triangle Networking Finder</h1>
          <p className="subtitle">Places to meet successful professionals near Durham</p>
        </div>
        <div className="header-actions">
          <div className="view-tabs">
            <button
              type="button"
              className={view === 'places' ? 'tab active' : 'tab'}
              onClick={() => onViewChange('places')}
            >
              Recommended
            </button>
            <button
              type="button"
              className={view === 'shortlist' ? 'tab active' : 'tab'}
              onClick={() => onViewChange('shortlist')}
            >
              Shortlist ({shortlistCount})
            </button>
            <button
              type="button"
              className={view === 'events' ? 'tab active' : 'tab'}
              onClick={() => onViewChange('events')}
            >
              Events
            </button>
            <button
              type="button"
              className={view === 'ai' ? 'tab active' : 'tab'}
              onClick={() => onViewChange('ai')}
            >
              AI
            </button>
          </div>
          <button type="button" className="btn btn-ghost settings-btn" onClick={onOpenSettings} aria-label="Settings">
            ⚙
          </button>
        </div>
      </div>

      {view !== 'events' && view !== 'ai' && (
        <div className="controls sticky-controls">
          <input
            type="search"
            placeholder="Search places, cities, audiences..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search places"
          />

          <div className="control-row">
            <label>
              Max drive
              <select
                value={maxDriveTime}
                onChange={(event) => onMaxDriveTimeChange(Number(event.target.value))}
              >
                {[10, 20, 30, 35].map((value) => (
                  <option key={value} value={value}>
                    {value} min
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sort
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as SortOption)}
              >
                <option value="networking">Best networking</option>
                <option value="closest">Closest</option>
                <option value="lowest-cost">Lowest cost</option>
                <option value="couples">Best for couples</option>
              </select>
            </label>
          </div>

          <div className="chip-row" role="tablist" aria-label="Category filters">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                role="tab"
                aria-selected={activeCategory === filter.value}
                className={activeCategory === filter.value ? 'chip active' : 'chip'}
                onClick={() => onCategoryChange(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="data-actions">
        <button type="button" className="btn btn-ghost" onClick={onExport}>
          Export data
        </button>
        <label className="btn btn-ghost file-btn">
          Import data
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <button type="button" className="btn btn-ghost danger" onClick={onReset}>
          Reset local data
        </button>
      </div>
    </header>
  );
}
