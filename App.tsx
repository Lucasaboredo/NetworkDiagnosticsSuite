import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/tokens';
import { getDatabase } from './src/storage/database';
import { startAutomaticSync } from './src/sync/syncService';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let stop: undefined | (() => void);
    getDatabase()
      .then(() => {
        stop = startAutomaticSync();
        setReady(true);
      })
      .catch(reason =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'No se pudo abrir la base local',
        ),
      );
    return () => stop?.();
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {error ? (
        <View style={styles.center}>
          <Text style={styles.title}>Error de almacenamiento</Text>
          <Text style={styles.body}>{error}</Text>
        </View>
      ) : ready ? (
        <AppNavigator />
      ) : (
        <View style={styles.center}>
          <Text style={styles.brand}>NETWORK DIAGNOSTICS</Text>
          <Text style={styles.body}>Preparando base local…</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    backgroundColor: colors.background,
  },
  brand: { color: colors.accent, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  body: { color: colors.muted, textAlign: 'center' },
});
