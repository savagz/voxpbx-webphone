import { isLanguage, type Language } from './i18n';

export type WebphoneConfig = {
  server: string;
  domain: string;
  username: string;
  password: string;
  displayName: string;
  language: Language;
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
  language: 'en',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

function hostDefaults(): Pick<WebphoneConfig, 'server' | 'domain'> {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (!host) return { server: WebphoneConfigDefaults.server, domain: WebphoneConfigDefaults.domain };
  const hostname = host.includes(':') ? `[${host}]` : host;
  return { server: `wss://${hostname}:8089/ws`, domain: host };
}

export function loadWebphoneConfig(): WebphoneConfig {
  const base = { ...WebphoneConfigDefaults, ...hostDefaults() };
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<WebphoneConfig>;
    const merged = { ...base, ...parsed };
    if (!parsed.server) merged.server = base.server;
    if (!parsed.domain) merged.domain = base.domain;
    if (!isLanguage(merged.language)) merged.language = base.language;
    return merged;
  } catch {
    return base;
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
