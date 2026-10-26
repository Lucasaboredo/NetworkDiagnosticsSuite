import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Router } from 'lucide-react-native';
import {
  Button,
  Card,
  ScreenHeader,
  sharedStyles,
  StatusPill,
} from '../components/ui';
import { colors } from '../theme/tokens';
import { Device } from '../domain/types';
import { deviceRepository } from '../storage/database';
import {
  scanLocalNetwork,
  startMdnsDiscovery,
} from '../discovery/discoveryService';

export function NetworkScannerScreen() {
  const navigation = useNavigation<any>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const signal = useRef({ cancelled: false });
  useEffect(() => {
    deviceRepository.all().then(setDevices);
    let stop: () => void = () => undefined;
    requestLanPermission().then(granted => {
      if (granted) stop = startMdnsDiscovery(saveDevice);
    });
    return () => {
      signal.current.cancelled = true;
      stop();
    };
  }, []);
  async function requestLanPermission() {
    if (Platform.OS !== 'android') return true;
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
        : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    return (
      (await PermissionsAndroid.request(permission)) ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  }
  async function saveDevice(device: Device) {
    const saved = await deviceRepository.upsert(device, true);
    setDevices(current => {
      const index = current.findIndex(d => d.ip === saved.ip);
      return index < 0
        ? [saved, ...current]
        : current.map((d, i) =>
            i === index ? { ...d, ...saved, id: d.id } : d,
          );
    });
  }
  async function scan() {
    if (!(await requestLanPermission())) {
      Alert.alert('Permiso requerido', 'Android necesita acceso a dispositivos Wi-Fi cercanos para descubrir la LAN.');
      return;
    }
    signal.current = { cancelled: false };
    setScanning(true);
    setProgress(0);
    try {
      await scanLocalNetwork(
        (done, total) => setProgress(done / total),
        saveDevice,
        signal.current,
      );
    } catch (error) {
      Alert.alert(
        'No se pudo escanear',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setScanning(false);
    }
  }
  return (
    <FlatList
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
      data={devices}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          <ScreenHeader
            eyebrow="RF-01"
            title="Escáner de red"
            subtitle="Descubrimiento mDNS y sondeo TCP limitado a la subred Wi‑Fi local."
          />
          <Card>
            <View style={sharedStyles.between}>
              <StatusPill
                label={scanning ? `${Math.round(progress * 100)}%` : 'LISTO'}
                tone={scanning ? 'warning' : 'good'}
              />
              <Text style={sharedStyles.body}>
                {devices.length} encontrados
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Button
              title={scanning ? 'Detener escaneo' : 'Actualizar dispositivos'}
              onPress={() =>
                scanning ? (signal.current.cancelled = true) : scan()
              }
              variant={scanning ? 'danger' : 'primary'}
            />
          </Card>
          <Text style={sharedStyles.sectionTitle}>Dispositivos</Text>
        </>
      }
      ListEmptyComponent={
        <Card>
          <Text style={sharedStyles.value}>Todavía no hay dispositivos</Text>
          <Text style={sharedStyles.body}>
            Iniciá un escaneo conectado a la Wi‑Fi del sitio.
          </Text>
        </Card>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate('DeviceDetail', { deviceId: item.id })
          }
        >
          <Card style={styles.device}>
            <Router color={colors.cyan} />
            <View style={styles.flex}>
              <Text style={sharedStyles.value}>
                {item.hostname || 'Equipo sin hostname'}
              </Text>
              <Text style={styles.ip}>{item.ip}</Text>
              <Text style={sharedStyles.body}>
                {item.mac || 'MAC no disponible por restricciones de Android'} ·{' '}
                {item.source}
              </Text>
            </View>
            <ChevronRight color={colors.muted} />
          </Card>
        </Pressable>
      )}
    />
  );
}
const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.accent },
  device: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  ip: {
    color: colors.accent,
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '700',
  },
});
