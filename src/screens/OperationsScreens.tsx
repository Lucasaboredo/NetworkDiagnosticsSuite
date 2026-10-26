import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Keychain from 'react-native-keychain';
import {
  Button,
  Card,
  Field,
  ScreenHeader,
  sharedStyles,
  StatusPill,
} from '../components/ui';
import { colors } from '../theme/tokens';
import { Installation, OutboxItem } from '../domain/types';
import {
  deviceRepository,
  diagnosticRepository,
  installationRepository,
  outboxRepository,
} from '../storage/database';
import { generateInstallationPdf, sharePdf } from '../reporting/pdfService';
import {
  checkBackend,
  configureBackend,
  getBackendUrl,
  syncPending,
} from '../sync/syncService';

export function ReportsScreen() {
  const [items, setItems] = useState<Installation[]>([]);
  const [busy, setBusy] = useState<string>();
  const load = useCallback(() => {
    installationRepository.all().then(setItems);
  }, []);
  useFocusEffect(load);
  async function generate(item: Installation) {
    setBusy(item.id);
    try {
      const device = item.deviceId
        ? await deviceRepository.find(item.deviceId)
        : undefined;
      const diagnostics = (await diagnosticRepository.all()).filter(d =>
        item.diagnosticIds.includes(d.id),
      );
      const path =
        item.reportPath ||
        (await generateInstallationPdf(item, device, diagnostics));
      if (!item.reportPath) {
        await installationRepository.save({
          ...item,
          reportPath: path,
          updatedAt: new Date().toISOString(),
        });
        load();
      }
      await sharePdf(path);
    } catch (error) {
      Alert.alert(
        'No se pudo abrir el reporte',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <FlatList
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
      data={items}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <ScreenHeader
          eyebrow="RF-06"
          title="Reportes PDF"
          subtitle="Generación local, visualización y uso del panel de compartir de Android."
        />
      }
      ListEmptyComponent={
        <Card>
          <Text style={sharedStyles.value}>No hay instalaciones</Text>
          <Text style={sharedStyles.body}>
            Creá una instalación para generar el primer reporte.
          </Text>
        </Card>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={sharedStyles.between}>
            <Text style={sharedStyles.value}>{item.site}</Text>
            <StatusPill
              label={item.reportPath ? 'GENERADO' : 'PENDIENTE'}
              tone={item.reportPath ? 'good' : 'warning'}
            />
          </View>
          <Text style={sharedStyles.body}>
            {item.equipment} ·{' '}
            {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </Text>
          <Button
            title={item.reportPath ? 'Abrir o compartir' : 'Generar PDF'}
            variant="secondary"
            loading={busy === item.id}
            onPress={() => generate(item)}
          />
        </Card>
      )}
    />
  );
}

export function SyncScreen() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    outboxRepository.all().then(setItems);
  }, []);
  useFocusEffect(load);
  async function sync() {
    setBusy(true);
    try {
      const result = await syncPending();
      Alert.alert(
        'Sincronización finalizada',
        `${result.sent} enviados · ${result.failed} con error`,
      );
      load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <FlatList
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
      data={items}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          <ScreenHeader
            eyebrow="RF-07 · Outbox"
            title="Sincronización"
            subtitle="Reintentos exponenciales, idempotencia y resolución server-wins cuando el servidor posee una versión más reciente."
          />
          <Button title="Sincronizar ahora" loading={busy} onPress={sync} />
        </>
      }
      ListEmptyComponent={
        <Card>
          <Text style={sharedStyles.value}>Cola vacía</Text>
          <Text style={sharedStyles.body}>
            Las nuevas acciones aparecerán aquí.
          </Text>
        </Card>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={sharedStyles.between}>
            <StatusPill label={item.entityType.toUpperCase()} tone="neutral" />
            <StatusPill
              label={item.status.toUpperCase()}
              tone={
                item.status === 'synced'
                  ? 'good'
                  : item.status === 'error'
                  ? 'bad'
                  : 'warning'
              }
            />
          </View>
          <Text style={styles.mono}>{item.entityId}</Text>
          <Text style={sharedStyles.body}>
            Intentos: {item.attempts} · próximo:{' '}
            {new Date(item.nextAttemptAt).toLocaleString('es-AR')}
          </Text>
          {item.lastError ? (
            <Text style={styles.error}>{item.lastError}</Text>
          ) : null}
          {item.status === 'error' ? (
            <Button
              title="Reintentar"
              variant="secondary"
              onPress={async () => {
                await outboxRepository.retry(item.id);
                load();
              }}
            />
          ) : null}
        </Card>
      )}
    />
  );
}

const backendService = 'network-diagnostics:backend';
export function SettingsScreen() {
  const [url, setUrl] = useState(getBackendUrl());
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    Keychain.getGenericPassword({ service: backendService }).then(value => {
      if (value !== false) {
        setUrl(value.password);
        configureBackend(value.password);
      }
    });
  }, []);
  async function save() {
    if (!/^https?:\/\//.test(url))
      return Alert.alert(
        'URL inválida',
        'Usá una URL que comience con http:// o https://.',
      );
    configureBackend(url);
    await Keychain.setGenericPassword('backend', url, {
      service: backendService,
    });
    Alert.alert(
      'Configuración guardada',
      'La URL se conservó en el almacenamiento seguro del dispositivo.',
    );
  }
  async function test() {
    setChecking(true);
    try {
      await checkBackend();
      Alert.alert('Conexión correcta', 'El backend respondió correctamente.');
    } catch (error) {
      Alert.alert(
        'Backend no disponible',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setChecking(false);
    }
  }
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
    >
      <ScreenHeader
        eyebrow="Entorno"
        title="Configuración"
        subtitle="El emulador usa 10.0.2.2. En un teléfono físico ejecutá adb reverse tcp:3001 tcp:3001 y usá localhost."
      />
      <Field
        label="URL del backend"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Button title="Guardar configuración" onPress={save} />
      <Button
        title="Probar conexión"
        variant="secondary"
        loading={checking}
        onPress={test}
      />
      <Card>
        <Text style={sharedStyles.sectionTitle}>
          Separación de conectividad
        </Text>
        <Text style={sharedStyles.body}>
          La aplicación distingue la Wi‑Fi local necesaria para SNMP/SSH del
          acceso a Internet requerido por la sincronización. Estar offline no
          impide diagnosticar equipos presentes en la LAN.
        </Text>
      </Card>
      <Card>
        <Text style={sharedStyles.sectionTitle}>Seguridad</Text>
        <Text style={sharedStyles.body}>
          Comunidades SNMP, contraseñas SSH, claves de host y URL de backend se
          guardan mediante Android Keystore. Los reportes y la base local nunca
          almacenan contraseñas.
        </Text>
      </Card>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  mono: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
  error: { color: colors.danger, fontSize: 12 },
});
