// src/routes/student.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const studentUpload = (req, _res, next) => { req.uploadFolder = 'students'; next(); };

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'SECRETARIA'), studentUpload, upload.single('photo'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'SECRETARIA'), studentUpload, upload.single('photo'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
