# Network Diagnostics Suite

Aplicación Android offline-first para técnicos de telecomunicaciones. Implementa descubrimiento LAN, SNMP v2c sobre UDP con BER propio, diagnósticos SSH con verificación de host, lectura QR/barcode, evidencia fotográfica y GPS, reportes PDF y sincronización mediante Outbox.

## Requisitos

- Node.js 22.11 o superior
- JDK 17 (se puede usar el JBR incluido con Android Studio)
- Android Studio, Android SDK 37 y plataforma Android 36 (target SDK 36)
- Teléfono Android o emulador

## Instalación y ejecución

```powershell
npm install
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
npm run android
```

En otra terminal, iniciar el backend:

```powershell
npm run backend
```

El emulador usa `http://10.0.2.2:3001`. Para un teléfono físico conectado por USB, ejecutar `adb reverse tcp:3001 tcp:3001` y configurar `http://localhost:3001`. La política Android bloquea HTTP claro hacia cualquier otro host; un servidor remoto debe usar HTTPS.

## Pruebas y build

```powershell
npm run typecheck
npm test -- --runInBand
npm run test:backend
npm run android:apk
```

El script prepara primero las dependencias nativas de VisionCamera, genera la APK release y la copia a `output/apk/Network_Diagnostics_Suite-v1.0.apk`, mostrando su SHA-256. También queda el artefacto original en `android/app/build/outputs/apk/release/app-release.apk`. Está firmada con la clave de depuración solo para entrega académica; una publicación real requiere una clave release privada fuera del repositorio.

## Estructura

- `src/discovery`: mDNS y sondeo TCP de la subred local.
- `src/protocol`: SNMP BER/ASN.1 y puente SSH Android.
- `src/evidence`: credenciales seguras, cámara y GPS.
- `src/storage`: NitroSQLite y repositorios offline.
- `src/sync`: outbox, reintentos e idempotencia.
- `src/reporting`: PDF local y compartir en Android.
- `backend`: API mínima de sincronización.
- `docs`: documento técnico, plan de validación y guion del video.
- `lab`: agente SNMP y servidor SSH reproducibles mediante Docker.

## Límites reales

- Android moderno no garantiza acceso a `/proc/net/arp`; la MAC se muestra solo cuando una fuente permitida la entrega. La detección combina mDNS con conexiones TCP a puertos frecuentes.
- SNMP v1/v2c no cifra la comunidad ni los datos. Debe usarse únicamente en una LAN autorizada.
- Los ensayos con cámara, GPS, equipos LAN y servidores SSH/SNMP requieren un dispositivo físico y se registran como pendientes hasta ejecutarlos. No se incluyen resultados inventados.
- El backend académico conserva datos en memoria mientras el proceso está activo. Su objetivo es validar el flujo completo de la outbox; puede reemplazarse por una base persistente sin cambiar el contrato `/api/sync`.

Más información: [documento técnico](docs/DOCUMENTO_TECNICO.md), [matriz de cumplimiento](docs/CUMPLIMIENTO.md), [validación física](docs/VALIDACION_FISICA.md) y [guion de video](docs/GUION_VIDEO.md).
