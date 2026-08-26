// src/routes/auth.routes.js
const router = require('express').Router();
const { login, me, createUser } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/users', authenticate, authorize('ADMIN'), createUser);

module.exports = router;
