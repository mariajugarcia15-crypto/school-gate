const { recognizeImage, OcrError } = require('../services/ocr.service');

const MAX_BYTES = 5 * 1024 * 1024;

function imageFromRequest(req) {
  if (req.file?.buffer) return req.file.buffer;
  const input = req.body?.imageBase64;
  if (typeof input !== 'string' || !input.length) throw new OcrError(400, 'Imagen requerida');
  const base64 = input.replace(/^data:image\/(?:jpeg|png|webp);base64,/, '');
  if (base64.length > Math.ceil(MAX_BYTES / 3) * 4) throw new OcrError(413, 'La imagen supera los 5 MB');
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new OcrError(400, 'Imagen base64 inválida');
  }
  return Buffer.from(base64, 'base64');
}

const recognizePlate = async (req, res) => {
  try {
    const image = imageFromRequest(req);
    if (image.length > MAX_BYTES) throw new OcrError(413, 'La imagen supera los 5 MB');
    return res.json(await recognizeImage(image));
  } catch (error) {
    return res.status(error instanceof OcrError ? error.status : 500).json({
      error: error instanceof OcrError ? error.message : 'Error procesando imagen',
    });
  }
};

module.exports = { recognizePlate, imageFromRequest };
