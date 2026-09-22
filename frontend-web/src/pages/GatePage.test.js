import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import GatePage from './GatePage';
import { ocrService, vehicleService, logService } from '../services/api';

jest.mock('../services/api', () => ({
  ocrService: { recognize: jest.fn() },
  vehicleService: { getByPlate: jest.fn() },
  logService: {
    create: jest.fn(),
    getRecentByPlate: jest.fn(() => Promise.resolve({ data: { exists: false } })),
  },
}));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('react-webcam', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ getScreenshot: () => 'data:image/jpeg;base64,aW1hZ2U=' }));
    return <div data-testid="camera" />;
  });
});

let container;
let root;
const click = async label => {
  const button = [...container.querySelectorAll('button')].find(item => item.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button.click());
};
const frame = async () => { await act(async () => { jest.advanceTimersByTime(2000); }); };

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.clearAllMocks();
  logService.getRecentByPlate.mockResolvedValue({ data: { exists: false } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<GatePage />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});

test('camera is active by default and keeps scanning even without a valid plate', async () => {
  ocrService.recognize.mockResolvedValueOnce({ data: { plate: null, status: 'no_plate', confidence: 'low', ocrConfidence: 0, candidates: [] } });
  await frame();
  expect(container.textContent).toContain('Cámara activa');
  expect(container.textContent).toContain('No se pudo leer la placa');
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
  expect(logService.create).not.toHaveBeenCalled();

  ocrService.recognize.mockResolvedValueOnce({ data: { plate: null, status: 'review_required', confidence: 'medium', ocrConfidence: 80, candidates: [{ plate: 'ABC123' }] } });
  await frame();
  expect(vehicleService.getByPlate).toHaveBeenCalledWith('ABC123');
  expect(container.textContent).toContain('ABC123');
});

test('recognized plates are looked up and registered automatically', async () => {
  const reading = plate => ({ data: { plate, status: 'recognized', confidence: 'high', ocrConfidence: 98, candidates: [] } });
  ocrService.recognize.mockResolvedValueOnce(reading('XYZ789'));
  vehicleService.getByPlate.mockResolvedValue({ data: { found: true, vehicle: { id: 'v1', plate: 'XYZ789', students: [] }, tempPermits: [] } });
  logService.create.mockResolvedValue({});

  await frame();
  expect(vehicleService.getByPlate).toHaveBeenCalledTimes(1);
  expect(vehicleService.getByPlate).toHaveBeenCalledWith('XYZ789');
  expect(logService.create).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('XYZ789');
});

test('unregistered plates are recorded as denied access without stopping OCR', async () => {
  const reading = plate => ({ data: { plate, status: 'recognized', confidence: 'high', ocrConfidence: 98, candidates: [] } });
  ocrService.recognize.mockResolvedValueOnce(reading('ABC123'));
  vehicleService.getByPlate.mockResolvedValue({ data: { found: false, vehicle: null, tempPermits: [], plate: 'ABC123' } });
  logService.create.mockResolvedValue({});

  await frame();
  expect(vehicleService.getByPlate).toHaveBeenCalledTimes(1);
  expect(vehicleService.getByPlate).toHaveBeenCalledWith('ABC123');
  expect(logService.create).toHaveBeenCalledTimes(1);
  expect(logService.create).toHaveBeenCalledWith(expect.any(FormData));
  expect(container.textContent).toContain('Vehículo NO registrado');
});

test('same plate is not logged twice within 5 minutes', async () => {
  const reading = plate => ({ data: { plate, status: 'recognized', confidence: 'high', ocrConfidence: 98, candidates: [] } });
  ocrService.recognize.mockResolvedValueOnce(reading('ABC123'));
  vehicleService.getByPlate.mockResolvedValue({ data: { found: true, vehicle: { id: 'v1', plate: 'ABC123', students: [] }, tempPermits: [] } });
  logService.create.mockResolvedValue({});

  await frame();
  expect(logService.getRecentByPlate).toHaveBeenCalledWith('ABC123', 5);
  expect(logService.create).toHaveBeenCalledTimes(1);

  logService.getRecentByPlate.mockResolvedValueOnce({ data: { exists: true } });
  jest.setSystemTime(new Date(Date.now() + 4 * 60 * 1000));
  ocrService.recognize.mockResolvedValueOnce(reading('ABC123'));
  await frame();

  expect(logService.create).toHaveBeenCalledTimes(1);
});

test('reader errors retry automatically while the camera remains active', async () => {
  ocrService.recognize.mockRejectedValue({ response: { status: 503, data: { error: 'Inicia el servicio OCR' } } });
  await frame();
  expect(container.textContent).toContain('Inicia el servicio OCR');
  await frame();
  expect(ocrService.recognize).toHaveBeenCalledTimes(2);
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
});
