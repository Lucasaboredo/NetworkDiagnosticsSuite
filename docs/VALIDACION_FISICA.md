# Plan de validación física

Registrar fecha, modelo de teléfono, versión Android, SSID de laboratorio y capturas. No probar redes sin autorización.

## Laboratorio reproducible

Con Docker instalado:

```powershell
docker compose -f lab/docker-compose.yml up --build
```

El laboratorio expone SNMP en UDP 1161 y SSH en TCP 2222. Comunidad: `labpublic`. Usuario SSH: `technician`; contraseña: `lab-only-password`. Son credenciales deliberadamente locales para pruebas, no secretos de producción.

Desde un teléfono físico usar la IP LAN de la PC. Desde el emulador usar `10.0.2.2`.

## Casos

1. Descubrimiento: conectar el teléfono a la misma Wi-Fi, iniciar escaneo y registrar al menos un host real. Verificar que no se salga de la subred.
2. SNMP: seleccionar el host de laboratorio, puerto 1161, comunidad `labpublic`, interfaz 1. Confirmar sysName, uptime y contadores.
3. SSH: usar puerto 2222. Comparar la huella mostrada con `ssh-keygen -lf` sobre la clave del contenedor, aceptarla y ejecutar el perfil Linux.
4. QR: escanear un código preparado y comprobar su ficha local.
5. Evidencia: tomar dos fotos, capturar GPS y verificar precisión/permiso denegado.
6. PDF: guardar la instalación, abrir el documento, revisar imágenes, coordenadas y compartirlo.
7. Persistencia: forzar cierre, reabrir y comprobar historial.
8. Offline: detener Internet manteniendo la Wi-Fi local, crear una instalación y comprobar estado pendiente.
9. Recuperación: iniciar backend, restaurar Internet y verificar transición pending → syncing → synced.
10. Errores: comunidad incorrecta, timeout SNMP, contraseña SSH incorrecta, cambio de huella, GPS deshabilitado y backend inaccesible.

## Evidencia a conservar

- captura de cada pantalla;
- salida del backend sin datos sensibles;
- PDF generado;
- versión/hash de la APK;
- tabla con esperado, observado y resultado;
- problemas del hardware o red de laboratorio.
