# VOXPBX Webphone

Softphone SIP standalone (React + TS + Vite) basado en `sip.js`, con interfaz calcada de `design/WEBPhone.png` — sin botón de video.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Configuración de conexión SIP

Al abrir la app, usa el icono de engranaje (pantalla de marcado) o el botón "Más" para introducir:

- Servidor (WSS), p. ej. `wss://tu-pbx:8089/ws`
- Dominio
- Extensión
- Contraseña

La configuración se guarda en `localStorage` del navegador (`voxpbx_webphone_config`). No hay backend propio: apunta el servidor WSS directamente a tu Asterisk/VOXPBX.

## Estructura

- `src/webphone/useWebphone.ts` — lógica SIP (registro, llamada saliente/entrante, mute, altavoz, estadísticas de conexión vía WebRTC).
- `src/webphone/Webphone.tsx` — UI: pantalla de marcado y pantalla de llamada en curso.
- `src/webphone/config.ts` — persistencia de configuración en `localStorage`.
