const router = require('express').Router();
const { recognizePlate } = require('../controllers/ocr.controller');
const { authenticate } = require('../middleware/auth.middleware');
const multer = require('multer');
// OCR images are not stored or exposed through /uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, fieldSize: 7 * 1024 * 1024, files: 1, fields: 1 },
});

router.use(authenticate);
router.post('/recognize', (req, res, next) => {
  upload.single('image')(req, res, error => {
    if (!error) return next();
    const tooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE'].includes(error.code);
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'La imagen supera el tamaño permitido' : 'Adjunta una sola imagen',
    });
  });
}, recognizePlate);
module.exports = router;
