import { useEffect, useState } from 'react';
import {
  Delete,
  Grid3x3,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Settings,
  UserPlus,
  User,
  Volume2,
  X,
  ArrowLeftRight,
  MoreHorizontal,
} from 'lucide-react';
import styles from './Webphone.module.css';
import { useWebphone } from './useWebphone';
import { WebphoneConfigDefaults, type WebphoneConfig } from './config';
import { LANGUAGES, isLanguage, translate, type Language, type TranslationKey } from './i18n';

const DIAL_KEYS: { key: string; letters?: string }[] = [
  { key: '1' },
  { key: '2', letters: 'ABC' },
  { key: '3', letters: 'DEF' },
  { key: '4', letters: 'GHI' },
  { key: '5', letters: 'JKL' },
  { key: '6', letters: 'MNO' },
  { key: '7', letters: 'PQRS' },
  { key: '8', letters: 'TUV' },
  { key: '9', letters: 'WXYZ' },
  { key: '*' },
  { key: '0', letters: '+' },
  { key: '#' },
];

function Waveform() {
  const [bars] = useState(() =>
    Array.from({ length: 40 }, () => ({
      height: 8 + Math.round(Math.random() * 22),
      duration: (0.8 + Math.random() * 0.9).toFixed(2),
      delay: (Math.random() * 0.6).toFixed(2),
    })),
  );
  return (
    <div className={styles.waveform}>
      {bars.map((bar, i) => (
        <span
          key={i}
          className={styles.waveBar}
          style={{
            height: bar.height,
            animationDuration: `${bar.duration}s`,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SettingsModal({
  config,
  onClose,
  onSave,
}: {
  config: WebphoneConfig;
  onClose: () => void;
  onSave: (next: WebphoneConfig) => void;
}) {
  const [form, setForm] = useState(config);
  const t = (key: TranslationKey) => translate(form.language, key);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{t('settings')}</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label={t('close')}>
            <X size={14} />
          </button>
        </div>
        <div className={styles.formGroup}>
          <label>{t('server')}</label>
          <input
            value={form.server}
            onChange={(e) => setForm({ ...form, server: e.target.value })}
            placeholder={t('serverPlaceholder')}
          />
        </div>
        <div className={styles.formGroup}>
          <label>{t('domain')}</label>
          <input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder={t('domainPlaceholder')}
          />
        </div>
        <div className={styles.formGroup}>
          <label>{t('extension')}</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="100"
          />
        </div>
        <div className={styles.formGroup}>
          <label>{t('password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••"
          />
        </div>
        <div className={styles.formGroup}>
          <label>{t('language')}</label>
          <select
            value={form.language}
            onChange={(e) => {
              const language: Language = isLanguage(e.target.value) ? e.target.value : 'en';
              setForm({ ...form, language });
            }}
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button className={styles.saveBtn} type="button" onClick={() => onSave(form)}>
          {t('save')}
        </button>
      </div>
    </div>
  );
}

function TransferModal({
  language,
  onClose,
  onTransfer,
}: {
  language: Language;
  onClose: () => void;
  onTransfer: (target: string) => Promise<void>;
}) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const t = (key: TranslationKey) => translate(language, key);

  const submit = () => {
    setSending(true);
    setError('');
    onTransfer(target)
      .then(onClose)
      .catch((err: Error) => setError(err.message || t('transferFailed')))
      .finally(() => setSending(false));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{t('transferCall')}</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label={t('close')}>
            <X size={14} />
          </button>
        </div>
        <div className={styles.formGroup}>
          <label>{t('transferTarget')}</label>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="200"
            autoFocus
          />
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
        <button className={styles.saveBtn} type="button" onClick={submit} disabled={!target.trim() || sending}>
          {sending ? t('transferring') : t('transfer')}
        </button>
      </div>
    </div>
  );
}

export default function Webphone() {
  const phone = useWebphone();
  const language = phone.config.language;
  const t = (key: TranslationKey) => translate(language, key);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const inCall = phone.callMode === 'connected' || phone.callMode === 'outgoing';
  const incoming = phone.callMode === 'incoming';
  const connected = phone.callMode === 'connected';

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (!connected && showKeypad) setShowKeypad(false);
  if (!connected && showTransfer) setShowTransfer(false);

  return (
    <div className={styles.stage}>
      <div className={`${styles.blob} ${styles.blobOrange}`} />
      <div className={`${styles.blob} ${styles.blobBlue}`} />
      <div className={`${styles.blob} ${styles.blobPurple}`} />

      <div className={styles.card}>
        {inCall || incoming ? (
          <>
            <div className={styles.callHeader}>
              <span className={styles.liveDot} />
              <span>{incoming ? t('incomingCall') : phone.status === 'calling' ? t('calling') : t('callInProgress')}</span>
              {phone.callMode === 'connected' && <span className={styles.callTimer}>{phone.elapsedLabel}</span>}
            </div>

            {showKeypad ? (
              <div className={styles.dialpad}>
                {DIAL_KEYS.map(({ key, letters }) => (
                  <button
                    key={key}
                    className={styles.dialBtn}
                    type="button"
                    onClick={() => phone.sendDtmf(key)}
                  >
                    <span className={styles.dialDigit}>{key}</span>
                    {letters && <span className={styles.dialLetters}>{letters}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.avatarWrap}>
                <div className={styles.avatarRing}>
                  <div className={styles.avatarInner}>
                    <User size={48} />
                  </div>
                </div>
              </div>
            )}

            <div className={styles.callerName}>{phone.callerName || phone.phoneNumber || t('unknown')}</div>
            <div className={styles.callerNumber}>{phone.phoneNumber}</div>

            {!incoming && (
              <div className={styles.controlsGrid}>
                <button
                  className={styles.controlBtn}
                  type="button"
                  data-active={phone.isMuted}
                  onClick={phone.toggleMute}
                >
                  <span className={styles.controlIcon}>
                    <MicOff size={20} />
                  </span>
                  {t('mute')}
                </button>
                <button
                  className={styles.controlBtn}
                  type="button"
                  data-active={showKeypad}
                  disabled={!connected}
                  onClick={() => setShowKeypad((prev) => !prev)}
                >
                  <span className={styles.controlIcon}>
                    <Grid3x3 size={20} />
                  </span>
                  {t('keypad')}
                </button>
                <button
                  className={styles.controlBtn}
                  type="button"
                  data-active={phone.isSpeaker}
                  onClick={phone.toggleSpeaker}
                >
                  <span className={styles.controlIcon}>
                    <Volume2 size={20} />
                  </span>
                  {t('speaker')}
                </button>
                <button className={styles.controlBtn} type="button" disabled>
                  <span className={styles.controlIcon}>
                    <UserPlus size={20} />
                  </span>
                  {t('add')}
                </button>
                <button
                  className={styles.controlBtn}
                  type="button"
                  disabled={!connected}
                  onClick={() => setShowTransfer(true)}
                >
                  <span className={styles.controlIcon}>
                    <ArrowLeftRight size={20} />
                  </span>
                  {t('transfer')}
                </button>
                <button
                  className={styles.controlBtn}
                  type="button"
                  data-active={phone.isOnHold}
                  disabled={!connected}
                  onClick={phone.toggleHold}
                >
                  <span className={styles.controlIcon}>
                    <Pause size={20} />
                  </span>
                  {t('hold')}
                </button>
              </div>
            )}

            <div className={styles.hangupRow}>
              {incoming && (
                <button
                  className={`${styles.callBtn} ${styles.acceptBtn}`}
                  type="button"
                  onClick={phone.accept}
                  aria-label={t('answer')}
                >
                  <Phone size={24} />
                </button>
              )}
              <button
                className={`${styles.callBtn} ${styles.hangupBtn}`}
                type="button"
                onClick={incoming ? phone.reject : phone.hangup}
                aria-label={incoming ? t('reject') : t('hangUp')}
              >
                <PhoneOff size={24} />
              </button>
            </div>

            {phone.callMode === 'connected' && <Waveform />}
          </>
        ) : (
          <>
            <div className={styles.header}>
              <span className={styles.headerIcon}>
                <Phone size={20} />
              </span>
              <span className={styles.headerTitle}>{t('makeCall')}</span>
              <span className={styles.statusDot} data-status={phone.status} />
              <button
                className={styles.settingsBtn}
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label={t('settings')}
              >
                <Settings size={15} />
              </button>
            </div>

            <div className={styles.display}>
              <span className={styles.displayText} data-empty={!phone.phoneNumber}>
                {phone.phoneNumber || t('enterNumber')}
              </span>
              <button
                className={styles.backspaceBtn}
                type="button"
                onClick={phone.backspace}
                disabled={!phone.phoneNumber}
                aria-label={t('delete')}
              >
                <Delete size={16} />
              </button>
            </div>

            <div className={styles.dialpad}>
              {DIAL_KEYS.map(({ key, letters }) => (
                <button key={key} className={styles.dialBtn} type="button" onClick={() => phone.dialKey(key)}>
                  <span className={styles.dialDigit}>{key}</span>
                  {letters && <span className={styles.dialLetters}>{letters}</span>}
                </button>
              ))}
            </div>

            <div className={styles.callRow}>
              <button
                className={styles.callBtn}
                type="button"
                onClick={phone.call}
                disabled={!phone.phoneNumber || phone.status !== 'registered'}
                aria-label={t('call')}
              >
                <Phone size={24} />
              </button>
            </div>

            <div className={styles.footerRow}>
              <button
                className={styles.footerBtn}
                type="button"
                data-active={phone.isSpeaker}
                onClick={phone.toggleSpeaker}
              >
                <span className={styles.footerIcon}>
                  <Volume2 size={18} />
                </span>
                {t('speaker')}
              </button>
              <button
                className={styles.footerBtn}
                type="button"
                data-active={phone.isMuted}
                onClick={phone.toggleMute}
              >
                <span className={styles.footerIcon}>
                  <MicOff size={18} />
                </span>
                {t('mute')}
              </button>
              <button className={styles.footerBtn} type="button" onClick={() => setShowSettings(true)}>
                <span className={styles.footerIcon}>
                  <MoreHorizontal size={18} />
                </span>
                {t('more')}
              </button>
            </div>
          </>
        )}

        {showSettings && (
          <SettingsModal
            config={phone.config}
            onClose={() => setShowSettings(false)}
            onSave={(next) => {
              phone.updateConfig(next);
              setShowSettings(false);
            }}
          />
        )}

        {showTransfer && (
          <TransferModal
            language={language}
            onClose={() => setShowTransfer(false)}
            onTransfer={phone.transferCall}
          />
        )}
      </div>
    </div>
  );
}

export { WebphoneConfigDefaults };
