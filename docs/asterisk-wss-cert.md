# Certificado TLS para WSS en Asterisk

Guía para habilitar `wss://` en el Asterisk que atiende al webphone (PJSIP + `res_http_websocket`).

Host: `192.168.78.222` (LXC host `omarchy`, Asterisk corre directo, no dentro de contenedor)

## Por qué

`transport-wss` en `pjsip.conf` no levanta su propio socket TLS: reutiliza el servidor HTTP interno de Asterisk (`http.conf`). Sin TLS habilitado ahí, `wss://` no tiene nada que atender.

## 1. Generar certificado self-signed

```bash
sudo mkdir -p /etc/asterisk/keys

sudo openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /tmp/asterisk.key -out /tmp/asterisk.crt -days 825 \
  -subj "/CN=192.168.78.222" \
  -addext "subjectAltName=IP:192.168.78.222"

sudo mv /tmp/asterisk.key /tmp/asterisk.crt /etc/asterisk/keys/
sudo chown asterisk:asterisk /etc/asterisk/keys/asterisk.key /etc/asterisk/keys/asterisk.crt
sudo chmod 640 /etc/asterisk/keys/asterisk.key /etc/asterisk/keys/asterisk.crt
```

`subjectAltName=IP:192.168.78.222` es obligatorio — sin SAN, navegadores modernos rechazan el cert aunque el CN coincida.

Si la IP del host cambia, regenerar con la IP nueva en `-subj` y `-addext`.

## 2. Habilitar TLS en `http.conf`

Editar `/etc/asterisk/http.conf`, sección `[general]`:

```ini
[general]
servername=Asterisk
enabled=yes
bindaddr=0.0.0.0
bindport=8088
enable_static=yes
enable_status=yes

tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.crt
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

## 3. Confirmar transporte en `pjsip.conf`

Ya debe existir (no tocar si ya está):

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0
```

Y el endpoint del webphone con:

```ini
webrtc=yes
transport=transport-wss
```

## 4. Aplicar y verificar

```bash
sudo asterisk -rx "http reload"
sudo asterisk -rx "pjsip reload"

# puerto escuchando
ss -tlnp | grep 8089

# handshake TLS responde (404 es normal, no hay página raíz)
curl -sk -o /dev/null -w "%{http_code}\n" https://127.0.0.1:8089/

# transporte activo
sudo asterisk -rx "pjsip show transports"
```

## 5. Confiar el certificado en el navegador

Self-signed en `wss://` **no muestra prompt** de "avanzado / continuar" como una página `https://` normal — si el navegador no confía el cert, el WebSocket falla en silencio (solo se ve en consola).

Paso obligatorio antes de usar el webphone:

1. Abrir `https://192.168.78.222:8089/` directo en el navegador.
2. Aceptar el warning ("Avanzado" → "Continuar de todos modos"). El 404 que devuelve es normal.
3. Recién ahí `wss://192.168.78.222:8089/ws` desde el webphone hereda esa excepción de confianza (mismo host, mismo puerto, mismo cert).

Repetir este paso en cada máquina/navegador que use el webphone.

## 6. Configurar sip.js en el webphone

```js
transportOptions: {
  server: "wss://192.168.78.222:8089/ws"
}
```

`/ws` es el path default que expone `res_http_websocket`.

## Renovación

Cert dura 825 días (`-days 825`). Repetir paso 1 antes de expirar; no hace falta tocar `http.conf` si el path del archivo no cambia — solo `http reload`.
