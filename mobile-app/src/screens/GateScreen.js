// src/screens/GateScreen.js
import { useState, useRef, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ocrService, vehicleService, logService } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const COLORS = { primary: '#1a56db', success: '#057a55', danger: '#c81e1e', warning: '#92400e', gray: '#6b7280', lightBg: '#f9fafb', successBg: '#e3fcef', warningBg: '#fef3c7', dangerBg: '#fde8e8' };

export default function GateScreen() {
  const { user } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const cameraRef = useRef(null);

  const searchPlate = async (plate) => {
    if (!plate?.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const res = await vehicleService.getByPlate(plate.trim().toUpperCase());
      setResult({ ...res.data, plate: plate.toUpperCase() });
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ found: false, plate: plate.toUpperCase(), vehicle: null, tempPermits: [] });
      } else {
        Alert.alert('Error', 'No se pudo consultar la placa');
      }
    } finally {
      setSearching(false);
    }
  };

  const capturePhoto = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara');
    }
    setCameraOpen(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setSearching(true);
    setCameraOpen(false);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'plate.jpg',
      });
      const ocrRes = await ocrService.recognize(formData);
      const { plate } = ocrRes.data;
      Alert.alert('Placa detectada', `Se detectó: ${plate}\n¿Es correcto?`, [
        { text: 'No, corregir', style: 'cancel', onPress: () => { setManualPlate(plate); setSearching(false); } },
        { text: 'Sí, buscar', onPress: () => searchPlate(plate) },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo procesar la imagen');
      setSearching(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
    const img = await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.8 });
    if (img.canceled) return;
    setSearching(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: img.assets[0].uri, type: 'image/jpeg', name: 'plate.jpg' });
      const ocrRes = await ocrService.recognize(formData);
      Alert.alert('Placa detectada', `${ocrRes.data.plate}`, [
        { text: 'Buscar', onPress: () => searchPlate(ocrRes.data.plate) },
      ]);
    } catch { Alert.alert('Error', 'No se pudo leer la imagen'); }
    finally { setSearching(false); }
  };

  const confirmExit = async (authorized) => {
    if (!result?.plate) return;
    setConfirming(true);
    try {
      const allStudents = [
        ...(result.vehicle?.students?.map(vs => vs.student) || []),
        ...(result.tempPermits?.map(p => p.student) || []),
      ];
      const unique = [...new Map(allStudents.map(s => [s.id, s])).values()];

      const formData = new FormData();
      formData.append('plate', result.plate);
      if (result.vehicle?.id) formData.append('vehicleId', result.vehicle.id);
      formData.append('eventType', 'EXIT');
      formData.append('authorized', String(authorized));
      unique.forEach(s => formData.append('studentIds', s.id));

      await logService.create(formData);
      Alert.alert(authorized ? 'Salida confirmada' : 'Acceso denegado', authorized ? 'El registro fue guardado exitosamente.' : 'El acceso denegado fue registrado.');
      setResult(null);
      setManualPlate('');
    } catch { Alert.alert('Error', 'No se pudo registrar el evento'); }
    finally { setConfirming(false); }
  };

  const allStudents = [
    ...(result?.vehicle?.students?.map(vs => ({ ...vs.student, isTemp: false })) || []),
    ...(result?.tempPermits?.map(p => ({ ...p.student, isTemp: true })) || []),
  ];
  const uniqueStudents = [...new Map(allStudents.map(s => [s.id, s])).values()];

  if (cameraOpen) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.plateGuide} />
            <Text style={styles.cameraHint}>Apunta al frente del vehículo</Text>
            <View style={styles.cameraButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCameraOpen(false); setSearching(false); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <View style={{ width: 80 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.heading}>Control de entrada</Text>
      <Text style={styles.subheading}>Hola, {user?.name}</Text>

      {/* Camera buttons */}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.cameraCard, { flex: 1, marginRight: 8 }]} onPress={capturePhoto} disabled={searching}>
          <Text style={styles.cameraCardIcon}>⬡</Text>
          <Text style={styles.cameraCardLabel}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cameraCard, { flex: 1, marginLeft: 8 }]} onPress={pickFromGallery} disabled={searching}>
          <Text style={styles.cameraCardIcon}>◻</Text>
          <Text style={styles.cameraCardLabel}>Galería</Text>
        </TouchableOpacity>
      </View>

      {/* Manual input */}
      <View style={styles.card}>
        <Text style={styles.label}>Ingresar placa manualmente</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.plateInput, { flex: 1, marginRight: 10 }]}
            value={manualPlate}
            onChangeText={t => setManualPlate(t.toUpperCase())}
            placeholder="ABC123"
            maxLength={7}
            autoCapitalize="characters"
            onSubmitEditing={() => searchPlate(manualPlate)}
          />
          <TouchableOpacity
            style={[styles.btn, { paddingHorizontal: 20 }]}
            onPress={() => searchPlate(manualPlate)}
            disabled={searching || !manualPlate}
          >
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Buscar</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Result */}
      {result && (
        <View style={styles.card}>
          {!result.found ? (
            <View style={{ alignItems: 'center', padding: 12 }}>
              <Text style={[styles.plateDisplay, { marginBottom: 12 }]}>{result.plate}</Text>
              <View style={[styles.badge, { backgroundColor: COLORS.dangerBg }]}>
                <Text style={[styles.badgeText, { color: COLORS.danger }]}>Vehículo NO registrado</Text>
              </View>
              <Text style={styles.hint}>Este vehículo no tiene autorización en el sistema.</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger, marginTop: 16 }]} onPress={() => confirmExit(false)} disabled={confirming}>
                <Text style={styles.actionBtnText}>Registrar acceso denegado</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Vehicle info */}
              <View style={styles.vehicleInfo}>
                <Text style={styles.plateDisplay}>{result.vehicle.plate}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.vehicleName}>{result.vehicle.brand} {result.vehicle.model} — {result.vehicle.color}</Text>
                  <Text style={styles.vehicleOwner}>{result.vehicle.ownerName}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: COLORS.successBg }]}>
                  <Text style={[styles.badgeText, { color: COLORS.success }]}>OK</Text>
                </View>
              </View>

              {/* Students */}
              <Text style={[styles.label, { marginTop: 14, marginBottom: 8 }]}>
                Estudiantes autorizados ({uniqueStudents.length})
              </Text>
              {uniqueStudents.map((student) => (
                <View key={student.id} style={[styles.studentRow, { backgroundColor: student.isTemp ? COLORS.warningBg : COLORS.successBg }]}>
                  <View style={[styles.avatar, { backgroundColor: student.isTemp ? '#fde68a' : '#9fe1cb' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: student.isTemp ? COLORS.warning : COLORS.success }}>
                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentGrade}>Grado {student.grade}{student.section}</Text>
                    {student.isTemp && <Text style={{ fontSize: 11, color: COLORS.warning, fontWeight: '600', marginTop: 2 }}>Permiso temporal de hoy</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: student.isTemp ? '#fde68a' : COLORS.successBg }]}>
                    <Text style={[styles.badgeText, { color: student.isTemp ? COLORS.warning : COLORS.success }]}>
                      {student.isTemp ? 'Temporal' : 'Regular'}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Actions */}
              <View style={[styles.row, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 1, marginRight: 8 }]}
                  onPress={() => confirmExit(true)}
                  disabled={confirming}
                >
                  {confirming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Confirmar salida</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.danger, flex: 1, marginLeft: 8 }]}
                  onPress={() => confirmExit(false)}
                  disabled={confirming}
                >
                  <Text style={styles.actionBtnText}>Denegar paso</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subheading: { fontSize: 14, color: '#6b7280', marginTop: 2, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  plateInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 22, fontWeight: '800', letterSpacing: 4, textAlign: 'center', color: '#1a56db', backgroundColor: '#eff6ff' },
  btn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  plateDisplay: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 26, fontWeight: '800', letterSpacing: 5, color: '#1a56db', backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, textAlign: 'center' },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 4 },
  vehicleName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  vehicleOwner: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  studentGrade: { fontSize: 12, color: '#6b7280' },
  actionBtn: { padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cameraCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 14 },
  cameraCardIcon: { fontSize: 32, marginBottom: 6 },
  cameraCardLabel: { fontSize: 14, fontWeight: '600', color: '#1a56db' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  plateGuide: { alignSelf: 'center', width: 280, height: 80, borderWidth: 2, borderColor: '#fff', borderRadius: 8, borderStyle: 'dashed' },
  cameraHint: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '500' },
  cameraButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1a56db' },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, width: 80, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
