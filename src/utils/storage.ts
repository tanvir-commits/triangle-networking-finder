import type { UserData } from '../types/place';

const STORAGE_KEY = 'triangle-networking-finder-user-data';

export function loadUserData(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserData) : {};
  } catch {
    return {};
  }
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportUserData(data: UserData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'triangle-networking-finder-data.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function importUserData(file: File): Promise<UserData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as UserData);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export function resetUserData(): UserData {
  localStorage.removeItem(STORAGE_KEY);
  return {};
}
