import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import RNFS from 'react-native-fs';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {
  Button,
  Card,
  Field,
  ScreenHeader,
  sharedStyles,
  StatusPill,
} from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { Installation, uuid } from '../domain/types';
import { deviceRepository, diagnosticRepository, installationRepository } from '../storage/database';
import { generateInstallationPdf } from '../reporting/pdfService';

type Location = { latitude: number; longitude: number; accuracy?: number };
export function InstallationScreen() {
  const [site, setSite] = useState('');
  const [equipment, setEquipment] = useState('');
  const [deviceIp, setDeviceIp] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<Location>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const camera = useRef<Camera>(null);
  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  async function locate() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED)
        return Alert.alert(
          'Permiso requerido',
          'La ubicación es necesaria para georreferenciar la instalación.',
        );
    }
    Geolocation.getCurrentPosition(
      position =>
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      error => Alert.alert('No se pudo obtener el GPS', error.message),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        forceRequestLocation: true,
      },
    );
  }
  async function openCamera() {
    if (!hasPermission && !(await requestPermission())) return;
    setCameraOpen(true);
  }
  async function takePhoto() {
    try {
      const result = await camera.current?.takePhoto({ flash: 'off' });
      if (result) {
        const directory = `${RNFS.DocumentDirectoryPath}/evidence`;
        await RNFS.mkdir(directory);
        const destination = `${directory}/${uuid()}.jpg`;
        await RNFS.copyFile(result.path.replace('file://', ''), destination);
        setPhotos(current => [...current, `file://${destination}`]);
        setCameraOpen(false);
      }
    } catch (error) {
      Alert.alert(
        'No se pudo tomar la foto',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }
  async function save() {
    if (!site.trim() || !equipment.trim() || !location)
      return Alert.alert(
        'Faltan datos',
        'Completá sitio, equipo y ubicación GPS.',
      );
    setBusy(true);
    try {
      const device = (await deviceRepository.all()).find(
        d => d.ip === deviceIp.trim(),
      );
      const diagnostics = device
        ? (await diagnosticRepository.all()).filter(d => d.deviceId === device.id)
        : [];
      const now = new Date().toISOString();
      let installation: Installation = {
        id: uuid(),
        deviceId: device?.id,
        site: site.trim(),
        equipment: equipment.trim(),
        createdAt: now,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes: notes.trim(),
        photos,
        diagnosticIds: diagnostics.map(d => d.id),
        syncStatus: 'pending',
        updatedAt: now,
      };
      const reportPath = await generateInstallationPdf(
        installation,
        device,
        diagnostics,
      );
      installation = { ...installation, reportPath };
      await installationRepository.save(installation);
      Alert.alert(
        'Instalación guardada',
        'Los datos y el PDF quedaron disponibles offline.',
      );
      setSite('');
      setEquipment('');
      setDeviceIp('');
      setNotes('');
      setLocation(undefined);
      setPhotos([]);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setBusy(false);
    }
  }
  if (cameraOpen)
    return (
      <View style={styles.cameraScreen}>
        {cameraDevice ? (
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={cameraDevice}
            isActive
            photo
          />
        ) : null}
        <View style={styles.cameraControls}>
          <Button
            title="Cancelar"
            variant="secondary"
            onPress={() => setCameraOpen(false)}
          />
          <Button title="Tomar fotografía" onPress={takePhoto} />
        </View>
      </View>
    );
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        eyebrow="RF-05"
        title="Nueva instalación"
        subtitle="La ficha, las fotos, el GPS y el reporte se guardan en el teléfono antes de sincronizar."
      />
      <Field
        label="Sitio de instalación *"
        value={site}
        onChangeText={setSite}
        placeholder="Central, gabinete, domicilio…"
      />
      <Field
        label="Equipo *"
        value={equipment}
        onChangeText={setEquipment}
        placeholder="Marca, modelo o descripción…"
      />
      <Field
        label="IP del dispositivo (opcional)"
        value={deviceIp}
        onChangeText={setDeviceIp}
        keyboardType="numeric"
        placeholder="192.168.1.1"
      />
      <Field
        label="Observaciones técnicas"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        style={styles.notes}
      />
      <Card>
        <View style={sharedStyles.between}>
          <Text style={sharedStyles.value}>Ubicación GPS</Text>
          <StatusPill
            label={location ? 'CAPTURADA' : 'REQUERIDA'}
            tone={location ? 'good' : 'warning'}
          />
        </View>
        {location ? (
          <Text style={styles.mono}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} · ±
            {Math.round(location.accuracy || 0)} m
          </Text>
        ) : (
          <Text style={sharedStyles.body}>
            Se solicitará una lectura real de alta precisión.
          </Text>
        )}
        <Button
          title="Obtener ubicación"
          variant="secondary"
          onPress={locate}
        />
      </Card>
      <Card>
        <Text style={sharedStyles.value}>Evidencia fotográfica</Text>
        <View style={styles.photos}>
          {photos.map(path => (
            <Image key={path} source={{ uri: path }} style={styles.photo} />
          ))}
        </View>
        <Button
          title={`Tomar fotografía${
            photos.length ? ` (${photos.length})` : ''
          }`}
          variant="secondary"
          onPress={openCamera}
        />
      </Card>
      <Button title="Guardar y generar PDF" loading={busy} onPress={save} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  notes: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  mono: { color: colors.accent, fontFamily: 'monospace', fontSize: 13 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  cameraControls: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    gap: 10,
  },
});
