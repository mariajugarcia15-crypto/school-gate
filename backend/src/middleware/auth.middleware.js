// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.active) return res.status(401).json({ error: 'Usuario no autorizado' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  }
  next();
};

module.exports = { authenticate, authorize };
