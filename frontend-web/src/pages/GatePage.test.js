import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import GatePage from './GatePage';
import { ocrService, vehicleService, logService } from '../services/api';

jest.mock('../services/api', () => ({
  ocrService: { recognize: jest.fn() },
  vehicleService: { getByPlate: jest.fn() },
  logService: { create: jest.fn() },
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

test('empty and uncertain readings never query a vehicle or record an event', async () => {
  ocrService.recognize.mockResolvedValueOnce({ data: { plate: null, status: 'no_plate', confidence: 'low', ocrConfidence: 0, candidates: [] } });
  await click('Activar cámara');
  await frame();
  expect(container.textContent).toContain('No se pudo leer');
  ocrService.recognize.mockResolvedValueOnce({ data: { plate: null, status: 'review_required', confidence: 'medium', ocrConfidence: 80, candidates: [{ plate: 'ABC123' }] } });
  await frame();
  expect(container.textContent).toContain('Lectura dudosa');
  expect(container.querySelector('input.form-input').value).toBe('ABC123');
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
  expect(logService.create).not.toHaveBeenCalled();
});

test('automatic lookup requires matching readings and exit stays manual', async () => {
  const reading = plate => ({ data: { plate, status: 'recognized', confidence: 'high', ocrConfidence: 98, candidates: [] } });
  ocrService.recognize.mockResolvedValueOnce(reading('ABC123'))
    .mockResolvedValueOnce(reading('XYZ789')).mockResolvedValueOnce(reading('XYZ789'));
  vehicleService.getByPlate.mockResolvedValue({ data: { found: true, vehicle: { id: 'v1', plate: 'XYZ789', students: [] }, tempPermits: [] } });
  logService.create.mockResolvedValue({});
  await click('Activar cámara');
  await frame();
  await frame();
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
  await frame();
  expect(vehicleService.getByPlate).toHaveBeenCalledTimes(1);
  expect(vehicleService.getByPlate).toHaveBeenCalledWith('XYZ789');
  expect(logService.create).not.toHaveBeenCalled();
  await click('Confirmar salida');
  expect(logService.create).toHaveBeenCalledTimes(1);
});

test('a result arriving after stopping the camera is ignored', async () => {
  let resolve;
  ocrService.recognize.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await click('Activar cámara');
  await frame();
  await click('Apagar cámara');
  await act(async () => resolve({ data: { plate: 'ABC123', status: 'recognized', confidence: 'high', ocrConfidence: 99 } }));
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
  expect(container.querySelector('input.form-input').value).toBe('');
});

test('an unavailable reader stops retries and shows the error', async () => {
  ocrService.recognize.mockRejectedValueOnce({ response: { status: 503, data: { error: 'Inicia el servicio OCR' } } });
  await click('Activar cámara');
  await frame();
  expect(container.textContent).toContain('Inicia el servicio OCR');
  await frame();
  expect(ocrService.recognize).toHaveBeenCalledTimes(1);
  expect(vehicleService.getByPlate).not.toHaveBeenCalled();
});
