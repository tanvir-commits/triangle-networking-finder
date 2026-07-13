const SETTINGS_KEY = 'triangle-networking-finder-settings';

export const PRODUCTION_API_URL = 'https://triangle-networking-finder.vercel.app/api';

export type AppSettings = {
  apiBaseUrl: string;
};

export function getDefaultApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return (envUrl || PRODUCTION_API_URL).replace(/\/$/, '');
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AppSettings;
  } catch {
    // ignore
  }
  return { apiBaseUrl: '' };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** localStorage override > VITE_API_BASE_URL env > production default (dev uses local proxy). */
export function getApiBaseUrl(): string {
  const override = loadSettings().apiBaseUrl.trim().replace(/\/$/, '');
  if (override) return override;

  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
  if (envUrl) return envUrl;

  if (import.meta.env.DEV) {
    return `${window.location.origin}${import.meta.env.BASE_URL}api`
      .replace(/\/$/, '')
      .replace(/\/api\/api$/, '/api');
  }

  return PRODUCTION_API_URL;
}
