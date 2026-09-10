export type WebphoneConfig = {
  server: string;
  domain: string;
  username: string;
  password: string;
  displayName: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
};

const STORAGE_KEY = 'voxpbx_webphone_config';

export const WebphoneConfigDefaults: WebphoneConfig = {
  server: 'wss://localhost:8089/ws',
  domain: 'localhost',
  username: '',
  password: '',
  displayName: 'Webphone',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function loadWebphoneConfig(): WebphoneConfig {
  if (typeof window === 'undefined') return { ...WebphoneConfigDefaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...WebphoneConfigDefaults };
    const parsed = JSON.parse(raw) as Partial<WebphoneConfig>;
    return { ...WebphoneConfigDefaults, ...parsed };
  } catch {
    return { ...WebphoneConfigDefaults };
  }
}

export function saveWebphoneConfig(next: WebphoneConfig) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function isConfigComplete(config: WebphoneConfig): boolean {
  return Boolean(config.server && config.domain && config.username);
}
