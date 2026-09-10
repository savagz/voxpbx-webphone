import { useCallback, useEffect, useRef, useState } from 'react';
import * as SIP from 'sip.js';
import {
  isConfigComplete,
  loadWebphoneConfig,
  saveWebphoneConfig,
  type WebphoneConfig,
} from './config';
import { playDtmfTone, startBusyTone, startRingtone, stopBusyTone, stopRingtone } from './tones';

export type WebphoneStatus = 'disconnected' | 'registering' | 'registered' | 'ringing' | 'calling' | 'connected';
export type WebphoneCallMode = 'idle' | 'incoming' | 'outgoing' | 'connected';

type Session = {
  stateChange?: { addListener: (cb: (newState: SIP.SessionState) => void) => void };
  sessionDescriptionHandler?: unknown;
  sessionDescriptionHandlerOptionsReInvite?: SIP.Web.SessionDescriptionHandlerOptions;
  accept?: (options?: SIP.InvitationAcceptOptions) => Promise<void>;
  invite?: (options?: SIP.SessionInviteOptions) => Promise<unknown>;
  refer?: (target: SIP.URI, options?: SIP.SessionReferOptions) => Promise<unknown>;
  reject?: () => void;
  bye?: () => void;
  cancel?: () => void;
  terminate?: () => void;
  request?: { getHeader?: (name: string) => string | undefined };
  remoteIdentity?: { uri?: { user?: string } };
  __bound?: boolean;
};

type WebSessionDescriptionHandler = {
  enableReceiverTracks?: (enable: boolean) => void;
  enableSenderTracks?: (enable: boolean) => void;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getCallerFromInvite(session: Session): string {
  try {
    const pai = session.request?.getHeader?.('P-Asserted-Identity');
    const match = String(pai || '').match(/sip:([^@>]+)/i);
    if (match?.[1]) return match[1];
  } catch {}
  try {
    const from = session.remoteIdentity?.uri?.user;
    if (from) return String(from);
  } catch {}
  return 'Desconocido';
}

function getPeerConnection(session: Session | null): RTCPeerConnection | null {
  const sdh = session?.sessionDescriptionHandler as { peerConnection?: unknown } | undefined;
  const pc = sdh?.peerConnection as RTCPeerConnection | undefined;
  return pc && typeof pc.getStats === 'function' ? pc : null;
}

function sendSessionDtmf(session: Session | null, tone: string): boolean {
  const sdh = session?.sessionDescriptionHandler as
    | { sendDtmf?: (tones: string, options?: { duration: number; interToneGap: number }) => boolean }
    | undefined;
  if (!sdh?.sendDtmf) return false;
  try {
    return sdh.sendDtmf(tone);
  } catch {
    return false;
  }
}

export function useWebphone() {
  const [config, setConfig] = useState<WebphoneConfig>(() => loadWebphoneConfig());
  const [status, setStatus] = useState<WebphoneStatus>('disconnected');
  const [callMode, setCallMode] = useState<WebphoneCallMode>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);

  const userAgentRef = useRef<SIP.UserAgent | null>(null);
  const registererRef = useRef<SIP.Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const incomingRef = useRef<Session | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const registeredRef = useRef(false);
  const establishedRef = useRef(false);

  if (!remoteAudioRef.current && typeof Audio !== 'undefined') {
    const audio = new Audio();
    audio.autoplay = true;
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    remoteAudioRef.current = audio;
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startedAtRef.current = null;
    setElapsed(0);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
  }, [stopTimer]);

  const applyMuteToTracks = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    const pc = getPeerConnection(sessionRef.current);
    if (pc) {
      try {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === 'audio') sender.track.enabled = !muted;
        });
      } catch {}
    }
  }, []);

  const applySpeakerToAudio = useCallback((speaker: boolean) => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.muted = !speaker;
    audio.volume = speaker ? 1 : 0;
  }, []);

  const setupRemoteAudio = useCallback((session: Session) => {
    const pc = getPeerConnection(session);
    if (!pc) return;
    const peer = pc as RTCPeerConnection & { __trackBound?: boolean };
    if (peer.__trackBound) return;
    peer.__trackBound = true;

    const attachStream = (stream: MediaStream) => {
      if (!remoteAudioRef.current) return;
      remoteStreamRef.current = stream;
      remoteAudioRef.current.srcObject = stream;
      applySpeakerToAudio(isSpeaker);
      void remoteAudioRef.current.play().catch(() => {});
    };

    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams?.[0]) attachStream(event.streams[0]);
    };

    // ontrack may have already fired before this listener was attached
    // (media can start flowing before the SIP session reaches Established).
    try {
      const existingTracks = pc
        .getReceivers()
        .map((receiver) => receiver.track)
        .filter((track): track is MediaStreamTrack => Boolean(track));
      if (existingTracks.length > 0) attachStream(new MediaStream(existingTracks));
    } catch {}
  }, [applySpeakerToAudio, isSpeaker]);

  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current?.active) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          autoGainControl: config.autoGainControl,
        },
        video: false,
      });
      localStreamRef.current = stream;
      applyMuteToTracks(isMuted);
      return stream;
    } catch {
      return null;
    }
  }, [config.echoCancellation, config.noiseSuppression, config.autoGainControl, applyMuteToTracks, isMuted]);

  const cleanupCall = useCallback(() => {
    stopTimer();
    stopRingtone();
    sessionRef.current = null;
    incomingRef.current = null;
    setCallMode('idle');
    setPhoneNumber('');
    setCallerName('');
    setIsOnHold(false);

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
      } catch {}
    }
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    setStatus(registeredRef.current ? 'registered' : 'disconnected');
  }, [stopTimer]);

  const bindSessionEvents = useCallback((session: Session, incoming: boolean) => {
    if (session.__bound) return;
    session.__bound = true;

    session.stateChange?.addListener((newState) => {
      if (newState === SIP.SessionState.Established) {
        establishedRef.current = true;
        sessionRef.current = session;
        setStatus('connected');
        setCallMode('connected');
        startTimer();
        setupRemoteAudio(session);
        applyMuteToTracks(isMuted);
      } else if (newState === SIP.SessionState.Terminated) {
        if (incoming) incomingRef.current = null;
        if (!incoming && !establishedRef.current) startBusyTone();
        cleanupCall();
      }
    });
  }, [applyMuteToTracks, cleanupCall, isMuted, setupRemoteAudio, startTimer]);

  const onInvite = useCallback((session: Session) => {
    if (sessionRef.current || incomingRef.current) {
      try {
        session.reject?.();
      } catch {}
      return;
    }
    incomingRef.current = session;
    const caller = getCallerFromInvite(session);
    setCallerName(caller);
    setPhoneNumber(caller);
    setStatus('ringing');
    setCallMode('incoming');
    startRingtone();
    bindSessionEvents(session, true);
  }, [bindSessionEvents]);

  const connect = useCallback((cfg: WebphoneConfig) => {
    if (!isConfigComplete(cfg)) {
      setStatus('disconnected');
      return;
    }
    setStatus('registering');

    const uri = SIP.UserAgent.makeURI(`sip:${cfg.username}@${cfg.domain}`);
    if (!uri) {
      setStatus('disconnected');
      return;
    }

    const userAgent = new SIP.UserAgent({
      uri,
      authorizationUsername: cfg.username,
      authorizationPassword: cfg.password,
      displayName: cfg.displayName,
      transportOptions: { server: cfg.server },
      sessionDescriptionHandlerFactoryOptions: {
        constraints: { audio: true, video: false },
      },
      delegate: {
        onInvite: (invitation) => onInvite(invitation as unknown as Session),
      },
    });
    userAgentRef.current = userAgent;

    userAgent
      .start()
      .then(() => {
        const registerer = new SIP.Registerer(userAgent);
        registererRef.current = registerer;
        registerer.stateChange.addListener((newState) => {
          if (newState === SIP.RegistererState.Registered) {
            registeredRef.current = true;
            setStatus('registered');
          } else if (newState === SIP.RegistererState.Unregistered) {
            registeredRef.current = false;
            setStatus('disconnected');
          }
        });
        registerer.register().catch(() => {
          registeredRef.current = false;
          setStatus('disconnected');
        });
      })
      .catch(() => {
        setStatus('disconnected');
      });
  }, [onInvite]);

  const disconnect = useCallback(() => {
    stopRingtone();
    stopBusyTone();
    try {
      registererRef.current?.unregister();
    } catch {}
    registererRef.current = null;
    try {
      userAgentRef.current?.stop();
    } catch {}
    userAgentRef.current = null;
    registeredRef.current = false;
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    connect(config);
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.server, config.domain, config.username, config.password]);

  const dialKey = useCallback((key: string) => {
    playDtmfTone(key);
    setPhoneNumber((prev) => (prev.length < 24 ? prev + key : prev));
  }, []);

  const backspace = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }, []);

  const clearNumber = useCallback(() => setPhoneNumber(''), []);

  const sendDtmf = useCallback((tone: string) => {
    playDtmfTone(tone);
    sendSessionDtmf(sessionRef.current, tone);
  }, []);

  const call = useCallback(() => {
    const number = phoneNumber.trim();
    if (!number || !registeredRef.current || sessionRef.current || !userAgentRef.current) return;

    const target = SIP.UserAgent.makeURI(`sip:${number}@${config.domain}`);
    if (!target) return;

    stopBusyTone();
    establishedRef.current = false;
    const inviter = new SIP.Inviter(userAgentRef.current, target) as unknown as Session;
    sessionRef.current = inviter;
    setStatus('calling');
    setCallMode('outgoing');
    setCallerName(number);
    bindSessionEvents(inviter, false);

    startLocalStream()
      .then((stream) => {
        const options: { sessionDescriptionHandlerOptions: { constraints: { audio: boolean; video: boolean }; localMediaStream?: MediaStream } } = {
          sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
        };
        if (stream) options.sessionDescriptionHandlerOptions.localMediaStream = stream;
        return inviter.invite?.(options);
      })
      .catch(() => cleanupCall());
  }, [bindSessionEvents, cleanupCall, config.domain, phoneNumber, startLocalStream]);

  const accept = useCallback(() => {
    const session = incomingRef.current;
    if (!session) return;
    incomingRef.current = null;
    stopRingtone();

    startLocalStream()
      .then((stream) => {
        const options: { sessionDescriptionHandlerOptions: { constraints: { audio: boolean; video: boolean }; localMediaStream?: MediaStream } } = {
          sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
        };
        if (stream) options.sessionDescriptionHandlerOptions.localMediaStream = stream;
        if (!session.accept) throw new Error('no accept');
        return session.accept(options);
      })
      .catch(() => cleanupCall());

    setCallMode('outgoing');
  }, [cleanupCall, startLocalStream]);

  const reject = useCallback(() => {
    const session = incomingRef.current;
    if (!session) return;
    try {
      session.reject?.();
    } catch {}
    incomingRef.current = null;
    cleanupCall();
  }, [cleanupCall]);

  const hangup = useCallback(() => {
    if (incomingRef.current) {
      reject();
      return;
    }
    const session = sessionRef.current;
    if (!session) {
      if (phoneNumber) {
        clearNumber();
        return;
      }
      cleanupCall();
      return;
    }
    try {
      if (establishedRef.current && session.bye) session.bye();
      else if (session.cancel) session.cancel();
      else if (session.bye) session.bye();
      else if (session.terminate) session.terminate();
    } catch {}
    cleanupCall();
  }, [cleanupCall, clearNumber, phoneNumber, reject]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      applyMuteToTracks(next);
      return next;
    });
  }, [applyMuteToTracks]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      applySpeakerToAudio(next);
      return next;
    });
  }, [applySpeakerToAudio]);

  const toggleHold = useCallback(() => {
    const session = sessionRef.current;
    if (!session || callMode !== 'connected' || !session.invite) return;

    const nextHold = !isOnHold;
    const applyReInviteOptions = (hold: boolean) => {
      session.sessionDescriptionHandlerOptionsReInvite = {
        ...(session.sessionDescriptionHandlerOptionsReInvite ?? {}),
        hold,
      };
    };
    applyReInviteOptions(nextHold);

    session
      .invite({
        requestDelegate: {
          onAccept: () => {
            const sdh = session.sessionDescriptionHandler as WebSessionDescriptionHandler | undefined;
            sdh?.enableReceiverTracks?.(!nextHold);
            sdh?.enableSenderTracks?.(!nextHold && !isMuted);
            setIsOnHold(nextHold);
          },
          onReject: () => {
            applyReInviteOptions(isOnHold);
          },
        },
      })
      .catch(() => {
        applyReInviteOptions(isOnHold);
      });
  }, [callMode, isMuted, isOnHold]);

  const transferCall = useCallback((target: string) => {
    const session = sessionRef.current;
    const number = target.trim();
    if (!session || callMode !== 'connected' || !session.refer || !number) {
      return Promise.reject(new Error('Transferencia no disponible'));
    }

    const referTarget = SIP.UserAgent.makeURI(`sip:${number}@${config.domain}`);
    if (!referTarget) return Promise.reject(new Error('Número inválido'));

    return session
      .refer(referTarget, {
        requestDelegate: {
          onAccept: () => hangup(),
        },
      })
      .then(() => undefined);
  }, [callMode, config.domain, hangup]);

  const updateConfig = useCallback((next: WebphoneConfig) => {
    saveWebphoneConfig(next);
    setConfig(next);
  }, []);

  return {
    status,
    callMode,
    phoneNumber,
    callerName,
    elapsedLabel: formatElapsed(elapsed),
    isMuted,
    isSpeaker,
    isOnHold,
    config,
    dialKey,
    backspace,
    sendDtmf,
    call,
    accept,
    reject,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    transferCall,
    updateConfig,
  };
}
