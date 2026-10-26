import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Field,
  ScreenHeader,
  sharedStyles,
  StatusPill,
} from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import { Device, uuid } from '../domain/types';
import { deviceRepository, diagnosticRepository } from '../storage/database';
import { getSnmpCommunity, saveSnmpCommunity } from '../evidence/credentials';
import { runStandardSnmpDiagnostic } from '../protocol/snmp/client';
import {
  executeSshDiagnostic,
  getSshCredentials,
  probeSshHost,
  trustSshHost,
  VendorProfile,
} from '../protocol/ssh/client';

export function DeviceDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'DeviceDetail'>) {
  const [device, setDevice] = useState<Device>();
  useEffect(() => {
    deviceRepository.find(route.params.deviceId).then(setDevice);
  }, [route.params.deviceId]);
  if (!device) return null;
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
    >
      <ScreenHeader
        eyebrow={device.source}
        title={device.hostname || device.ip}
        subtitle="Información observada directamente en la red local."
      />
      <Card>
        <Info label="Dirección IP" value={device.ip} />
        <Info
          label="Dirección MAC"
          value={device.mac || 'No expuesta por Android'}
        />
        <Info
          label="Última detección"
          value={new Date(device.lastSeenAt).toLocaleString('es-AR')}
        />
      </Card>
      <Text style={sharedStyles.sectionTitle}>Diagnósticos autorizados</Text>
      <Button
        title="Consultar por SNMP"
        onPress={() => navigation.navigate('Snmp', { deviceId: device.id })}
      />
      <Button
        title="Ejecutar comandos SSH"
        variant="secondary"
        onPress={() => navigation.navigate('Ssh', { deviceId: device.id })}
      />
    </ScrollView>
  );
}
const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.label}>{label}</Text>
    <Text style={sharedStyles.value}>{value}</Text>
  </View>
);

export function SnmpScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Snmp'>) {
  const [device, setDevice] = useState<Device>();
  const [community, setCommunity] = useState('');
  const [index, setIndex] = useState('1');
  const [port, setPort] = useState('161');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown>>();
  useEffect(() => {
    deviceRepository.find(route.params.deviceId).then(async d => {
      setDevice(d);
      if (d) setCommunity((await getSnmpCommunity(d.ip)) || '');
    });
  }, [route.params.deviceId]);
  async function run() {
    if (!device || !community)
      return Alert.alert('Datos incompletos', 'Ingresá la comunidad SNMP.');
    setBusy(true);
    setResult(undefined);
    const createdAt = new Date().toISOString();
    try {
      await saveSnmpCommunity(device.ip, community);
      const response = await runStandardSnmpDiagnostic(
        device.ip,
        community,
        Math.max(1, Number(index) || 1),
        Math.max(1, Number(port) || 161),
      );
      const payload = { requestId: response.requestId, ...response.values };
      setResult(payload);
      await diagnosticRepository.save({
        id: uuid(),
        deviceId: device.id,
        type: 'snmp',
        createdAt,
        status: 'success',
        payload,
        syncStatus: 'pending',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      await diagnosticRepository.save({
        id: uuid(),
        deviceId: device.id,
        type: 'snmp',
        createdAt,
        status: 'error',
        payload: {},
        error: message,
        syncStatus: 'pending',
      });
      Alert.alert('Falló la consulta SNMP', message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
    >
      <ScreenHeader
        eyebrow="RF-02 · SNMP UDP"
        title={device?.ip || 'SNMP'}
        subtitle="GetRequest v2c con codificación BER propia. La comunidad se guarda en Android Keystore."
      />
      <Field
        label="Puerto UDP"
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <Field
        label="Community string"
        value={community}
        onChangeText={setCommunity}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="Índice de interfaz"
        value={index}
        onChangeText={setIndex}
        keyboardType="number-pad"
      />
      <Button title="Ejecutar diagnóstico" loading={busy} onPress={run} />
      {result ? (
        <Card>
          <StatusPill label="RESPUESTA VÁLIDA" tone="good" />
          {Object.entries(result).map(([key, value]) => (
            <Info key={key} label={key} value={String(value)} />
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

export function SshScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Ssh'>) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<VendorProfile>('linux');
  const [fingerprint, setFingerprint] = useState('');
  const [trusted, setTrusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  useEffect(() => {
    if (route.params?.deviceId)
      deviceRepository.find(route.params.deviceId).then(async d => {
        if (!d) return;
        setHost(d.ip);
        const saved = await getSshCredentials(d.ip, 22);
        if (saved) {
          setUsername(saved.username);
          setPassword(saved.password);
        }
      });
  }, [route.params?.deviceId]);
  async function verify() {
    if (!host) return;
    setBusy(true);
    try {
      const key = await probeSshHost(host, Number(port));
      setFingerprint(`${key.algorithm} ${key.fingerprint}`);
      Alert.alert(
        'Verificar identidad SSH',
        `Compará esta huella con la informada por el administrador:\n\n${key.fingerprint}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confiar',
            onPress: async () => {
              await trustSshHost(host, Number(port), key.knownHost);
              setTrusted(true);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'No se pudo obtener la huella',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setBusy(false);
    }
  }
  async function execute() {
    if (!host || !username || !password)
      return Alert.alert(
        'Datos incompletos',
        'Completá host, usuario y contraseña.',
      );
    setBusy(true);
    try {
      const output = await executeSshDiagnostic({
        host,
        port: Number(port),
        username,
        password,
        profile,
      });
      setResults(output);
      const device = (await deviceRepository.all()).find(d => d.ip === host);
      if (device)
        await diagnosticRepository.save({
          id: uuid(),
          deviceId: device.id,
          type: 'ssh',
          createdAt: new Date().toISOString(),
          status: 'success',
          payload: { profile, results: output },
          syncStatus: 'pending',
        });
    } catch (error) {
      Alert.alert(
        'Falló la conexión SSH',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
    >
      <ScreenHeader
        eyebrow="RF-03 · SSH"
        title="Diagnóstico remoto"
        subtitle="Solo ejecuta comandos predefinidos y exige verificación de la huella del servidor."
      />
      <Field
        label="Host"
        value={host}
        onChangeText={setHost}
        keyboardType="numeric"
      />
      <Field
        label="Puerto"
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <Field
        label="Usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Text style={styles.label}>Perfil del equipo</Text>
      <View style={styles.profiles}>
        {(['linux', 'cisco-ios', 'mikrotik'] as VendorProfile[]).map(item => (
          <Button
            key={item}
            title={item}
            variant={profile === item ? 'primary' : 'secondary'}
            onPress={() => setProfile(item)}
          />
        ))}
      </View>
      <Card>
        <View style={sharedStyles.between}>
          <StatusPill
            label={trusted ? 'HUELLA CONFIABLE' : 'SIN VERIFICAR'}
            tone={trusted ? 'good' : 'warning'}
          />
          <Text style={styles.fingerprint}>{fingerprint || '—'}</Text>
        </View>
        <Button
          title="Obtener y verificar huella"
          variant="secondary"
          onPress={verify}
          loading={busy}
        />
      </Card>
      <Button
        title="Ejecutar comandos"
        onPress={execute}
        loading={busy}
        disabled={!trusted}
      />
      {results.map(item => (
        <Card key={item.command}>
          <Text style={sharedStyles.sectionTitle}>{item.label}</Text>
          <Text selectable style={styles.terminal}>
            {item.stdout || item.stderr || '(sin salida)'}
          </Text>
          <StatusPill
            label={`EXIT ${item.exitCode}`}
            tone={item.exitCode === 0 ? 'good' : 'bad'}
          />
        </Card>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  info: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  profiles: { gap: spacing.sm },
  fingerprint: {
    color: colors.muted,
    fontFamily: 'monospace',
    fontSize: 10,
    flex: 1,
    textAlign: 'right',
  },
  terminal: {
    backgroundColor: '#04090D',
    color: '#B7F7D8',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    padding: spacing.md,
    borderRadius: 8,
  },
});
