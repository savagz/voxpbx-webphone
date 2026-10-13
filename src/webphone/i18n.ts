export type Language = 'en' | 'es';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const en = {
  settings: 'Settings',
  close: 'Close',
  language: 'Language',
  server: 'Server (WSS)',
  serverPlaceholder: 'wss://server:8089/ws',
  domain: 'Domain',
  domainPlaceholder: 'domain.com',
  extension: 'Extension',
  password: 'Password',
  save: 'Save',
  transferCall: 'Transfer call',
  transferTarget: 'Destination number or extension',
  transfer: 'Transfer',
  transferring: 'Transferring…',
  transferFailed: 'Could not transfer',
  transferUnavailable: 'Transfer not available',
  invalidNumber: 'Invalid number',
  incomingCall: 'Incoming call',
  calling: 'Calling…',
  callInProgress: 'Call in progress',
  unknown: 'Unknown',
  mute: 'Mute',
  keypad: 'Keypad',
  speaker: 'Speaker',
  add: 'Add',
  hold: 'Hold',
  answer: 'Answer',
  reject: 'Reject',
  hangUp: 'Hang up',
  makeCall: 'Make a call',
  enterNumber: 'Enter number or extension...',
  delete: 'Delete',
  call: 'Call',
  more: 'More',
};

export type TranslationKey = keyof typeof en;

const es: Record<TranslationKey, string> = {
  settings: 'Configuración',
  close: 'Cerrar',
  language: 'Idioma',
  server: 'Servidor (WSS)',
  serverPlaceholder: 'wss://servidor:8089/ws',
  domain: 'Dominio',
  domainPlaceholder: 'dominio.com',
  extension: 'Extensión',
  password: 'Contraseña',
  save: 'Guardar',
  transferCall: 'Transferir llamada',
  transferTarget: 'Número o extensión destino',
  transfer: 'Transferir',
  transferring: 'Transfiriendo…',
  transferFailed: 'No se pudo transferir',
  transferUnavailable: 'Transferencia no disponible',
  invalidNumber: 'Número inválido',
  incomingCall: 'Llamada entrante',
  calling: 'Llamando…',
  callInProgress: 'Llamada en curso',
  unknown: 'Desconocido',
  mute: 'Silencio',
  keypad: 'Teclado',
  speaker: 'Altavoz',
  add: 'Añadir',
  hold: 'Retener',
  answer: 'Contestar',
  reject: 'Rechazar',
  hangUp: 'Colgar',
  makeCall: 'Realizar llamada',
  enterNumber: 'Ingrese número o extensión...',
  delete: 'Borrar',
  call: 'Llamar',
  more: 'Más',
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, es };

export function translate(language: Language, key: TranslationKey): string {
  return (dictionaries[language] ?? en)[key];
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'es';
}
