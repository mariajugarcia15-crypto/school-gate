// src/pages/GatePage.js
import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { ocrService, vehicleService, logService } from '../services/api';
import { format } from 'date-fns';

const EMPTY_RESULT = { found: false, vehicle: null, tempPermits: [], plate: '' };

export default function GatePage() {
  const webcamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const inFlight = useRef(false);
  const generation = useRef(0);
  const previousReading = useRef(null);
  const [cropCenter, setCropCenter] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [confirming, setConfirming] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(null);

  useEffect(() => () => { generation.current += 1; }, []);

  const searchPlate = useCallback(async (plate) => {
    const normalized = plate.trim().toUpperCase().replace(/\s/g, '');
    if (!normalized) return null;
    generation.current += 1;
    previousReading.current = null;
    setCameraActive(false);
    setSearching(true);
    setResult(EMPTY_RESULT);
    try {
      const res = await vehicleService.getByPlate(normalized);
      const newResult = { ...res.data, plate: normalized };
      setResult(newResult);
      return newResult;
    } catch (err) {
      if (err.response?.status === 404) {
        const newResult = { ...EMPTY_RESULT, plate: normalized };
        setResult(newResult);
        return newResult;
      }
      toast.error('Error consultando la placa');
      return null;
    } finally {
      setSearching(false);
    }
  }, []);

  const captureAndRecognize = useCallback(async (automatic = false) => {
    if (inFlight.current || searching || confirming) return;
    let imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    if (cropCenter) {
      const video = webcamRef.current?.video;
      if (!video?.videoWidth || !video?.videoHeight) return;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * 0.8);
      canvas.height = Math.round(video.videoHeight * 0.4);
      canvas.getContext('2d').drawImage(video,
        video.videoWidth * 0.1, video.videoHeight * 0.3,
        canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      imageSrc = canvas.toDataURL('image/jpeg', 0.95);
    }
    const currentGeneration = generation.current;
    inFlight.current = true;
    setSearching(true);
    setResult(EMPTY_RESULT);
    try {
      const formData = new FormData();
      formData.append('imageBase64', imageSrc);
      const { data } = await ocrService.recognize(formData);
      if (currentGeneration !== generation.current) return;
      setOcrConfidence({ text: data.confidence, value: data.ocrConfidence });
      if (data.status !== 'recognized' || !data.plate) {
        previousReading.current = null;
        if (data.status === 'ambiguous') {
          setCameraActive(false);
          setOcrMessage('Hay varias placas posibles. Enfoca un solo vehículo o escribe la placa.');
          setManualPlate('');
        } else if (data.candidates?.length === 1) {
          setCameraActive(false);
          setManualPlate(data.candidates[0].plate);
          setOcrMessage('Lectura dudosa. Revisa y corrige la placa antes de pulsar Buscar.');
        } else {
          setManualPlate('');
          setOcrMessage('No se pudo leer la placa. Acerca la cámara, mejora la luz o ingrésala manualmente.');
        }
        return;
      }
      // setManualPlate(data.plate);
      // const previous = previousReading.current;
      // previousReading.current = { plate: data.plate, time: Date.now() };
      // if (automatic && (!previous || previous.plate !== data.plate || Date.now() - previous.time > 15000)) {
      //   setOcrMessage(`Lectura: ${data.plate}. Esperando otra captura coincidente…`);
      //   return;
      // }
      // setOcrMessage(`Placa leída: ${data.plate}. Verifica el vehículo y confirma la acción.`);
      // // OCR identifies a candidate; the operator confirms or denies the exit.
      // await searchPlate(data.plate);
    } catch (err) {
      if (currentGeneration !== generation.current) return;
      previousReading.current = null;
      setOcrConfidence(null);
      setOcrMessage(err.response?.data?.error || 'No se pudo conectar con el lector local.');
      if (err.response?.status !== 429) setCameraActive(false);
    } finally {
      inFlight.current = false;
      setSearching(false);
    }
  }, [searching, confirming, cropCenter, searchPlate]);

  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => captureAndRecognize(true), 2000);
    return () => clearInterval(interval);
  }, [cameraActive, captureAndRecognize]);

  const toggleCamera = () => {
    generation.current += 1;
    previousReading.current = null;
    setOcrMessage('');
    setOcrConfidence(null);
    setResult(EMPTY_RESULT);
    setCameraActive(active => !active);
  };

  const confirmExit = async (authorized, currentResult = result) => {
    if (!currentResult.plate) return;
    setConfirming(true);
    try {
      const allStudents = [
        ...(currentResult.vehicle?.students?.map(vs => vs.student) || []),
        ...(currentResult.tempPermits?.map(p => p.student) || []),
      ];
      const uniqueStudents = [
        ...new Map(allStudents.map(s => [s.id, s])).values()
      ];
      const formData = new FormData();
      formData.append('plate', currentResult.plate);
      if (currentResult.vehicle?.id) {
        formData.append('vehicleId', currentResult.vehicle.id);
      }
      formData.append('eventType', 'EXIT');
      formData.append('authorized', String(authorized));
      uniqueStudents.forEach(s => {
        formData.append('studentIds', s.id);
      });
      await logService.create(formData);
      toast.success(
        authorized
          ? `Salida registrada: ${currentResult.plate}`
          : `Acceso denegado: ${currentResult.plate}`
      );
      setResult(EMPTY_RESULT);
      setManualPlate('');
      setOcrConfidence(null);
      setOcrMessage('');
    } catch (err) {
      console.error('Error al registrar el evento:', err);
      toast.error('Error al registrar el evento');
    } finally {
      setConfirming(false);
    }
  };
  const allStudents = [
    ...(result.vehicle?.students?.map(vs => ({ ...vs.student, isTemp: false })) || []),
    ...(result.tempPermits?.map(p => ({ ...p.student, isTemp: true, reason: p.reason })) || []),
  ];
  const uniqueStudents = [...new Map(allStudents.map(s => [s.id, s])).values()];

  return (
    <div>
      <div className="page-header">
        <h1>Portería — Control de entrada</h1>
        <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{format(new Date(), 'HH:mm')} hrs</span>
      </div>

      <div className="grid-2">
        {/* Left: Camera / Input */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Capturar placa</h3>

          <div style={{ marginBottom: 16 }}>
            <button className={`btn ${cameraActive ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleCamera} disabled={confirming}>
              {cameraActive ? 'Apagar cámara' : 'Activar cámara'}
            </button>
          </div>

          {cameraActive && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <input type="checkbox" checked={cropCenter} disabled={searching} onChange={e => {
                  generation.current += 1;
                  previousReading.current = null;
                  setCropCenter(e.target.checked);
                }} /> Leer solo la zona central
              </label>
              <div style={{ position: 'relative' }}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.95}
                  forceScreenshotSourceSize
                  videoConstraints={{ width: { ideal: 1280 }, height: { ideal: 720 } }}
                  style={{ display: 'block', width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                />
                {cropCenter && <div style={{ position: 'absolute', left: '10%', top: '30%', width: '80%', height: '40%', border: '2px dashed #22c55e', pointerEvents: 'none' }} />}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                onClick={() => captureAndRecognize(false)}
                disabled={searching}
              >
                {searching ? <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Procesando...</> : 'Capturar y leer placa'}
              </button>

            </div>
          )}

          {ocrMessage && <p role="status" style={{ fontSize: 13, marginBottom: 12 }}>{ocrMessage}</p>}
          {ocrConfidence && <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            Puntuación del lector: {ocrConfidence.value}/100 — {ocrConfidence.text === 'high' ? 'Alta' : ocrConfidence.text === 'medium' ? 'Media' : 'Baja'}
          </p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Ingresar placa manualmente</label>
              <input
                className="form-input"
                placeholder="ABC123"
                value={manualPlate}
                onChange={(e) => {
                  generation.current += 1;
                  previousReading.current = null;
                  setCameraActive(false);
                  setManualPlate(e.target.value.toUpperCase());
                }}
                onKeyDown={(e) => e.key === 'Enter' && !searching && !confirming && searchPlate(manualPlate)}
                maxLength={7}
                style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 3, fontWeight: 700 }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => searchPlate(manualPlate)}
              disabled={searching || confirming || !manualPlate}
              style={{ marginBottom: 1 }}
            >
              {searching ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Resultado de verificación</h3>

          {!result.plate ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-500)' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>⬡</p>
              <p>Captura o ingresa una placa para verificar</p>
            </div>
          ) : !result.found ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <span className="plate-display" style={{ marginBottom: 16, display: 'block' }}>{result.plate}</span>
              <span className="badge badge-danger" style={{ fontSize: 14, padding: '6px 16px' }}>Vehículo NO registrado</span>
              <p style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 12 }}>Este vehículo no tiene autorización en el sistema.</p>
              <button className="btn btn-danger" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => confirmExit(false)} disabled={confirming}>
                Registrar acceso denegado
              </button>
            </div>
          ) : (
            <div>
              {/* Plate + vehicle info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                <div style={{ flex: 1 }}>
                  <span className="plate-display">{result.vehicle.plate}</span>
                  <p style={{ marginTop: 6, fontSize: 14, fontWeight: 500 }}>{result.vehicle.brand} {result.vehicle.model} — {result.vehicle.color}</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Propietario: {result.vehicle.ownerName}</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 13, padding: '5px 14px' }}>Registrado</span>
              </div>

              {/* Students */}
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--gray-700)' }}>
                Estudiantes autorizados ({uniqueStudents.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {uniqueStudents.map((student) => (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: student.isTemp ? 'var(--warning-light)' : 'var(--success-light)', borderRadius: 'var(--radius)' }}>
                    <div className="avatar" style={{ background: student.isTemp ? '#fde68a' : 'var(--success-light)', color: student.isTemp ? 'var(--warning)' : 'var(--success)' }}>
                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{student.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>Grado {student.grade}{student.section}</p>
                      {student.isTemp && <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500, marginTop: 2 }}>Permiso temporal de hoy</p>}
                    </div>
                    <span className={`badge ${student.isTemp ? 'badge-warning' : 'badge-success'}`}>
                      {student.isTemp ? 'Temporal' : 'Regular'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn btn-success"
                  style={{ justifyContent: 'center', padding: '12px' }}
                  onClick={() => confirmExit(true)}
                  disabled={confirming}
                >
                  {confirming ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Confirmar salida'}
                </button>
                <button
                  className="btn btn-danger"
                  style={{ justifyContent: 'center', padding: '12px' }}
                  onClick={() => confirmExit(false)}
                  disabled={confirming}
                >
                  Denegar paso
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
