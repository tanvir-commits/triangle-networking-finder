const SETTINGS_KEY = 'triangle-networking-finder-settings';
const DEFAULT_API_URL = import.meta.env.VITE_API_BASE_URL || '';

export type AppSettings = {
  apiBaseUrl: string;
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AppSettings;
  } catch {
    // ignore
  }
  return { apiBaseUrl: DEFAULT_API_URL };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getApiBaseUrl(): string {
  const url = loadSettings().apiBaseUrl.trim().replace(/\/$/, '');
  if (url) return url;

  if (import.meta.env.DEV) {
    return `${window.location.origin}${import.meta.env.BASE_URL}api`.replace(/\/$/, '').replace(/\/api\/api$/, '/api');
  }

  return '';
}
