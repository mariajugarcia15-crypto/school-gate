class OcrError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function recognizeImage(image) {
  const endpoint = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8001';
  const timeout = Number(process.env.OCR_TIMEOUT_MS || 20000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) && timeout > 0 ? timeout : 20000);
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: image,
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) {
      const errors = {
        400: 'La imagen no es válida. Usa JPEG, PNG o WebP',
        413: 'La imagen es demasiado grande (máximo 5 MB y 16 megapíxeles)',
        429: 'El lector está ocupado. Intenta de nuevo',
      };
      throw new OcrError(errors[response.status] ? response.status : 503,
        errors[response.status] || 'El lector local no pudo procesar la imagen');
    }
    const result = await response.json();
    const statuses = ['recognized', 'no_plate', 'review_required', 'ambiguous'];
    if (!statuses.includes(result.status) ||
      !Number.isFinite(result.ocrConfidence) || result.ocrConfidence < 0 || result.ocrConfidence > 100 ||
      !Array.isArray(result.candidates) ||
      (result.status === 'recognized' && (!/^[A-Z]{3}[0-9]{2}[A-Z0-9]$/.test(result.plate) || result.confidence !== 'high')) ||
      (result.status !== 'recognized' && result.plate !== null)) {
      throw new OcrError(503, 'Respuesta inválida del lector local');
    }
    return result;
  } catch (error) {
    if (error instanceof OcrError) throw error;
    if (controller.signal.aborted) throw new OcrError(504, 'El lector tardó demasiado. Intenta con una imagen más cercana');
    throw new OcrError(503, 'El lector local no está disponible. Inicia el servicio OCR en el servidor');
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { recognizeImage, OcrError };