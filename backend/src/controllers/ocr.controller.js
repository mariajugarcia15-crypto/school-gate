// src/controllers/ocr.controller.js
const Tesseract = require('tesseract.js');
const path = require('path');

// Colombian plate pattern: 3 letters + 3 digits (cars) or 3 letters + 2 digits + 1 letter (motos)
const PLATE_PATTERNS = [
  /[A-Z]{3}[0-9]{3}/,    // Car: ABC123
  /[A-Z]{3}[0-9]{2}[A-Z]/, // Motorcycle: ABC12D
];

const cleanPlateText = (raw) => {
  // Remove spaces, newlines, special chars; keep only alphanumeric
  const cleaned = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Try to extract a valid Colombian plate from the OCR text
  for (const pattern of PLATE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) return { plate: match[0], confidence: 'high' };
  }

  // Fuzzy: try common OCR misreads (0→O, 1→I, etc.)
  const corrected = cleaned
    .replace(/0/g, 'O')
    .replace(/1/g, 'I');

  for (const pattern of PLATE_PATTERNS) {
    const match = corrected.match(pattern);
    if (match) return { plate: match[0], confidence: 'medium' };
  }

  return { plate: cleaned.slice(0, 6), confidence: 'low' };
};

const recognizePlate = async (req, res) => {
  if (!req.file && !req.body.imageBase64) {
    return res.status(400).json({ error: 'Imagen requerida' });
  }

  let imagePath;
  let tempFile = null;

  if (req.file) {
    imagePath = req.file.path;
  } else {
    // Handle base64 image from mobile
    const fs = require('fs');
    const { v4: uuidv4 } = require('uuid');
    const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    tempFile = path.join(__dirname, '../../uploads/temp', `${uuidv4()}.jpg`);
    const dir = path.dirname(tempFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tempFile, Buffer.from(base64Data, 'base64'));
    imagePath = tempFile;
  }

  try {
    const result = await Tesseract.recognize(imagePath, 'spa+eng', {
      logger: () => {},
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    });

    const rawText = result.data.text;
    const ocrConfidence = result.data.confidence;
    const { plate, confidence } = cleanPlateText(rawText);

    // Clean up temp file
    if (tempFile) {
      const fs = require('fs');
      fs.unlinkSync(tempFile);
    }

    res.json({
      plate,
      rawText,
      ocrConfidence: Math.round(ocrConfidence),
      confidence,
    });
  } catch (err) {
    if (tempFile) {
      try { require('fs').unlinkSync(tempFile); } catch {}
    }
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Error procesando imagen' });
  }
};

module.exports = { recognizePlate };
