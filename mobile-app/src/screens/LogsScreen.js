// src/screens/LogsScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { logService } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const EVENT_COLORS = {
  EXIT:   { bg: '#e3fcef', text: '#057a55', label: 'Salida' },
  ENTRY:  { bg: '#e8f0fe', text: '#1a56db', label: 'Entrada' },
  DENIED: { bg: '#fde8e8', text: '#c81e1e', label: 'Denegado' },
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function LogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await logService.getToday();
      setLogs(res.data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          <Text style={styles.sectionTitle}>Actividad de hoy — {logs.length} registros</Text>

          {logs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>▤</Text>
              <Text style={styles.emptyText}>Sin registros por ahora</Text>
            </View>
          ) : (
            logs.map((log) => {
              const ev = log.authorized ? (EVENT_COLORS[log.eventType] || EVENT_COLORS.EXIT) : EVENT_COLORS.DENIED;
              return (
                <View key={log.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.time}>{formatTime(log.createdAt)}</Text>
                      <Text style={styles.date}>{formatDateShort(log.createdAt)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.plate}>{log.plate}</Text>
                      <Text style={styles.owner}>
                        {log.vehicle?.ownerName || 'Sin propietario'}
                        {log.vehicle?.color ? ` · ${log.vehicle.color}` : ''}
                      </Text>
                      {log.students?.length > 0 && (
                        <Text style={styles.students}>
                          {log.students.map(s => s.name).join(', ')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.badge, { backgroundColor: ev.bg }]}>
                      <Text style={[styles.badgeText, { color: ev.text }]}>{ev.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: '#d1d5db' },
  emptyText: { fontSize: 15, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timeBlock: { alignItems: 'center', minWidth: 44 },
  time: { fontSize: 14, fontWeight: '700', color: '#111827' },
  date: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  plate: { fontFamily: 'monospace', fontSize: 16, fontWeight: '800', color: '#1a56db', letterSpacing: 2 },
  owner: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  students: { fontSize: 12, color: '#374151', marginTop: 4, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
