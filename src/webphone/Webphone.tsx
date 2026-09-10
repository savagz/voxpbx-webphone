import { useState } from 'react';
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

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Configuración</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
        <div className={styles.formGroup}>
          <label>Servidor (WSS)</label>
          <input
            value={form.server}
            onChange={(e) => setForm({ ...form, server: e.target.value })}
            placeholder="wss://servidor:8089/ws"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Dominio</label>
          <input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="dominio.com"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Extensión</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="100"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Contraseña</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••"
          />
        </div>
        <button className={styles.saveBtn} type="button" onClick={() => onSave(form)}>
          Guardar
        </button>
      </div>
    </div>
  );
}

function TransferModal({
  onClose,
  onTransfer,
}: {
  onClose: () => void;
  onTransfer: (target: string) => Promise<void>;
}) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    setSending(true);
    setError('');
    onTransfer(target)
      .then(onClose)
      .catch((err: Error) => setError(err.message || 'No se pudo transferir'))
      .finally(() => setSending(false));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Transferir llamada</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
        <div className={styles.formGroup}>
          <label>Número o extensión destino</label>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="200"
            autoFocus
          />
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
        <button className={styles.saveBtn} type="button" onClick={submit} disabled={!target.trim() || sending}>
          {sending ? 'Transfiriendo…' : 'Transferir'}
        </button>
      </div>
    </div>
  );
}

export default function Webphone() {
  const phone = useWebphone();
  const [showSettings, setShowSettings] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const inCall = phone.callMode === 'connected' || phone.callMode === 'outgoing';
  const incoming = phone.callMode === 'incoming';
  const connected = phone.callMode === 'connected';

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
              <span>{incoming ? 'Llamada entrante' : phone.status === 'calling' ? 'Llamando…' : 'Llamada en curso'}</span>
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

            <div className={styles.callerName}>{phone.callerName || phone.phoneNumber || 'Desconocido'}</div>
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
                  Silencio
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
                  Teclado
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
                  Altavoz
                </button>
                <button className={styles.controlBtn} type="button" disabled>
                  <span className={styles.controlIcon}>
                    <UserPlus size={20} />
                  </span>
                  Añadir
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
                  Transferir
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
                  Retener
                </button>
              </div>
            )}

            <div className={styles.hangupRow}>
              {incoming && (
                <button
                  className={`${styles.callBtn} ${styles.acceptBtn}`}
                  type="button"
                  onClick={phone.accept}
                  aria-label="Contestar"
                >
                  <Phone size={24} />
                </button>
              )}
              <button
                className={`${styles.callBtn} ${styles.hangupBtn}`}
                type="button"
                onClick={incoming ? phone.reject : phone.hangup}
                aria-label={incoming ? 'Rechazar' : 'Colgar'}
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
              <span className={styles.headerTitle}>Realizar llamada</span>
              <span className={styles.statusDot} data-status={phone.status} />
              <button
                className={styles.settingsBtn}
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="Configuración"
              >
                <Settings size={15} />
              </button>
            </div>

            <div className={styles.display}>
              <span className={styles.displayText} data-empty={!phone.phoneNumber}>
                {phone.phoneNumber || 'Ingrese número o extensión...'}
              </span>
              <button
                className={styles.backspaceBtn}
                type="button"
                onClick={phone.backspace}
                disabled={!phone.phoneNumber}
                aria-label="Borrar"
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
                aria-label="Llamar"
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
                Altavoz
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
                Silencio
              </button>
              <button className={styles.footerBtn} type="button" onClick={() => setShowSettings(true)}>
                <span className={styles.footerIcon}>
                  <MoreHorizontal size={18} />
                </span>
                Más
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
            onClose={() => setShowTransfer(false)}
            onTransfer={phone.transferCall}
          />
        )}
      </div>
    </div>
  );
}

export { WebphoneConfigDefaults };
