import { useEffect, useState } from 'react';
import { getDefaultApiBaseUrl, loadSettings, saveSettings } from '../utils/settings';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const defaultApiUrl = getDefaultApiBaseUrl();

  useEffect(() => {
    if (open) setApiBaseUrl(loadSettings().apiBaseUrl);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="settings-note">
          AI is powered by OpenAI and only runs when you send a chat message. API keys stay on
          Vercel — never in this GitHub Pages app.
        </p>

        <label className="field-label">
          API base URL (optional override)
          <input
            type="url"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder={defaultApiUrl}
          />
        </label>
        <p className="settings-hint">
          Leave blank to use the built-in default (<code>{defaultApiUrl}</code>). Override only if
          you deploy your own Vercel API. Local dev uses the proxied <code>npm run dev:api</code>{' '}
          server automatically.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              saveSettings({ apiBaseUrl: apiBaseUrl.trim() });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
