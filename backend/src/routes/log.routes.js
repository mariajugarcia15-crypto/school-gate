// src/routes/log.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/log.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const logUpload = (req, _res, next) => { req.uploadFolder = 'logs'; next(); };

router.use(authenticate);
router.get('/stats', ctrl.getStats);
router.get('/today', ctrl.getToday);
router.get('/recent', ctrl.getRecentByPlate);
router.get('/', ctrl.getAll);
router.post('/', logUpload, upload.single('photo'), ctrl.create);

module.exports = router;
