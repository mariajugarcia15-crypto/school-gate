// src/routes/ocr.routes.js
const router = require('express').Router();
const { recognizePlate } = require('../controllers/ocr.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const ocrUpload = (req, _res, next) => { req.uploadFolder = 'temp'; next(); };

router.use(authenticate);
router.post('/recognize', ocrUpload, upload.single('image'), recognizePlate);

module.exports = router;
