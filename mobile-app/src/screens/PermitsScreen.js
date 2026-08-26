// src/screens/PermitsScreen.js
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { permitService } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = { warning: '#92400e', warningBg: '#fef3c7', gray: '#6b7280', grayBg: '#f3f4f6', primary: '#1a56db', danger: '#c81e1e', dangerBg: '#fde8e8' };

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PermitsScreen() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = filter === 'today' ? await permitService.getToday() : await permitService.getAll();
      setPermits(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los permisos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [filter]));
  useEffect(() => { load(); }, [filter]);

  const handleDelete = (id) => {
    Alert.alert('Eliminar permiso', '¿Estás seguro de eliminar este permiso?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await permitService.delete(id);
            setPermits(prev => prev.filter(p => p.id !== id));
          } catch { Alert.alert('Error', 'No se pudo eliminar el permiso'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'today' && styles.tabActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.tabText, filter === 'today' && styles.tabTextActive]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>Todos</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {permits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◇</Text>
              <Text style={styles.emptyText}>
                {filter === 'today' ? 'No hay permisos temporales para hoy' : 'No hay permisos registrados'}
              </Text>
            </View>
          ) : (
            permits.map((p) => (
              <View
                key={p.id}
                style={[styles.card, { borderColor: p.used ? '#e5e7eb' : '#fde68a', opacity: p.used ? 0.7 : 1 }]}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.plate}>{p.vehicle?.plate}</Text>
                    <Text style={styles.owner}>{p.vehicle?.ownerName}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: p.used ? COLORS.grayBg : COLORS.warningBg }]}>
                    <Text style={[styles.badgeText, { color: p.used ? COLORS.gray : COLORS.warning }]}>
                      {p.used ? 'Usado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.info}>
                  Recoge a: <Text style={styles.strong}>{p.student?.name}</Text>
                </Text>
                <Text style={styles.info}>
                  Grado {p.student?.grade}{p.student?.section}
                </Text>
                {p.reason ? <Text style={styles.reason}>Motivo: {p.reason}</Text> : null}
                <Text style={styles.date}>Fecha: {formatDate(p.validDate)}</Text>

                {!p.used && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.id)}>
                    <Text style={styles.deleteBtnText}>Eliminar permiso</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1a56db' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#1a56db' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: '#d1d5db' },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  plate: { fontFamily: 'monospace', fontSize: 20, fontWeight: '800', color: '#1a56db', letterSpacing: 3 },
  owner: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 },
  info: { fontSize: 14, color: '#374151', marginBottom: 3 },
  strong: { fontWeight: '600' },
  reason: { fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  deleteBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#c81e1e', alignItems: 'center' },
  deleteBtnText: { color: '#c81e1e', fontSize: 13, fontWeight: '500' },
});
