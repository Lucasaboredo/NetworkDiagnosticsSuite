# Matriz de cumplimiento RF-01 a RF-08

Fecha de verificación automatizada: 25/10/2026. La columna física queda deliberadamente pendiente cuando requiere teléfono, cámara, GPS o equipamiento LAN; no se atribuyen ensayos que no fueron ejecutados.

| Requisito | Implementación | Evidencia automatizada | Validación física |
|---|---|---|---|
| RF-01 Descubrimiento LAN | mDNS y sondeo TCP por lotes dentro de la subred Wi-Fi `/24`; persistencia por IP | TypeScript y APK release pasan | Pendiente: escaneo en Wi-Fi autorizada |
| RF-02 SNMP | SNMP v2c real por UDP; BER/ASN.1 propio; sysName, sysUpTime y tráfico | 3 pruebas Jest: request, response y BER truncado | Pendiente: agente SNMP real o laboratorio Docker |
| RF-03 SSH | Puente Android JSch; huella SHA-256, `known_hosts`, comandos predefinidos y credenciales en Keystore | Kotlin release compila y APK pasa | Pendiente: host SSH autorizado |
| RF-04 QR/barcode | VisionCamera con QR, EAN, Code 39 y Code 128; asociación local | Codegen nativo y APK release pasan | Pendiente: cámara y código físico |
| RF-05 Evidencia | Fotos persistentes, GPS con precisión, notas y asociación de equipo | TypeScript y APK release pasan | Pendiente: permisos, GPS y dos fotografías |
| RF-06 Reportes PDF | HTML/PDF local con equipo, fecha, GPS, observaciones, diagnósticos y fotos; Share Sheet | TypeScript y APK release pasan | Pendiente: inspección del PDF generado por la app |
| RF-07 Sincronización | Outbox persistente, NetInfo, reintentos, idempotencia y conflicto `server-wins` | 2 pruebas Supertest: health e idempotencia | Pendiente: transición offline → online en dispositivo |
| RF-08 Historial offline | NitroSQLite con WAL, índices, FKs y repositorios para dispositivos, diagnósticos e instalaciones | TypeScript y APK release pasan | Pendiente: cierre forzado y reapertura |

## Controles transversales ejecutados

- `npm run typecheck`.
- `npm run lint`.
- `npm test -- --runInBand`: 3/3.
- `npm run test:backend`: 2/2.
- `gradlew assembleRelease`: exitoso.
- Dependencias npm auditadas sin vulnerabilidades conocidas al momento del build.

APK de entrega: `Network_Diagnostics_Suite-v1.0.apk` (115.883.102 bytes). SHA-256: `CA338B770F83AAAB77C152A114B52F009D7A774793C73379447EFBB1232AAE67`.

El procedimiento paso a paso y la planilla de evidencias a conservar están en `VALIDACION_FISICA.md`.
