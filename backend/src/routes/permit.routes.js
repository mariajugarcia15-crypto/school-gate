// src/routes/permit.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/permit.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/today', ctrl.getToday);
router.get('/', ctrl.getAll);
router.post('/', authorize('ADMIN', 'SECRETARIA'), ctrl.create);
router.patch('/:id/use', ctrl.markUsed);
router.delete('/:id', authorize('ADMIN', 'SECRETARIA'), ctrl.remove);

module.exports = router;
