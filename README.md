# VOXPBX Webphone

Standalone SIP softphone (React + TS + Vite) built on `sip.js`, with an interface closely modeled on `design/WEBPhone.png`, without a video button.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## SIP connection settings

When the app opens, use the gear icon (dial screen) or the "More" button to enter:

- Server (WSS), e.g. `wss://your-pbx:8089/ws`
- Domain
- Extension
- Password
- Language (English or Spanish; English by default)

Settings are stored in the browser's `localStorage` (`voxpbx_webphone_config`). There is no dedicated backend: point the WSS server directly at your Asterisk/VOXPBX.

## Structure

- `src/webphone/useWebphone.ts` — SIP logic (registration, outgoing/incoming calls, mute, speaker, connection statistics via WebRTC).
- `src/webphone/Webphone.tsx` — UI: dial screen and in-call screen.
- `src/webphone/i18n.ts` — translations (EN/ES) and the language list.
- `src/webphone/config.ts` — settings persistence in `localStorage`.
