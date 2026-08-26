// src/routes/vehicle.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/vehicle.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const vehicleUpload = (req, _res, next) => { req.uploadFolder = 'vehicles'; next(); };

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/plate/:plate', ctrl.getByPlate);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'SECRETARIA'), vehicleUpload, upload.single('photo'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'SECRETARIA'), vehicleUpload, upload.single('photo'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
