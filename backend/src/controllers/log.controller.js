// src/controllers/log.controller.js
const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  const { from, to, plate, eventType, page = 1, limit = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(from && to && { createdAt: { gte: new Date(from), lte: new Date(to) } }),
    ...(plate && { plate: { contains: plate.toUpperCase(), mode: 'insensitive' } }),
    ...(eventType && { eventType }),
  };

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      include: { vehicle: true, students: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.accessLog.count({ where }),
  ]);

  res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

const getToday = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await prisma.accessLog.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
    include: { vehicle: true, students: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(logs);
};

const getRecentByPlate = async (req, res) => {
  const { plate, minutes = 5 } = req.query;
  const normalized = (plate || '').toUpperCase().replace(/\s/g, '');

  if (!normalized) {
    return res.status(400).json({ error: 'Se requiere una placa.' });
  }

  const from = new Date(Date.now() - Number(minutes || 5) * 60 * 1000);
  const recent = await prisma.accessLog.findFirst({
    where: {
      plate: { equals: normalized, mode: 'insensitive' },
      createdAt: { gte: from },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ exists: !!recent, recent: recent ? { id: recent.id, plate: recent.plate, createdAt: recent.createdAt } : null });
};

const create = async (req, res) => {
  const { vehicleId, plate, eventType, studentIds, notes, ocrRaw, confidence, authorized } = req.body;
  const normalizedPlate = (plate || '').toUpperCase().replace(/\s/g, '');
  const photoUrl = req.file ? `/uploads/logs/${req.file.filename}` : null;

  if (!normalizedPlate) {
    return res.status(400).json({ error: 'La placa es obligatoria.' });
  }

  const recent = await prisma.accessLog.findFirst({
    where: {
      plate: { equals: normalizedPlate, mode: 'insensitive' },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    return res.status(409).json({
      error: `La placa ${normalizedPlate} ya fue registrada en los últimos 5 minutos.`,
      duplicate: true,
      recent,
    });
  }

  const log = await prisma.accessLog.create({
    data: {
      vehicleId: vehicleId || null,
      plate: normalizedPlate,
      eventType: eventType || 'EXIT',
      photoUrl,
      ocrRaw,
      confidence: confidence ? parseFloat(confidence) : null,
      authorized: authorized !== false,
      notes,
      registeredBy: req.user?.id,
      students: studentIds?.length
  ? { connect: (Array.isArray(studentIds) ? studentIds : [studentIds]).map((id) => ({ id })) }
  : undefined,
    },
    include: { vehicle: true, students: true },
  });

  // Real-time broadcast to all connected clients
  req.io?.emit('log:created', log);

  // Mark temporary permit as used if applicable
  if (vehicleId && studentIds?.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.temporaryPermit.updateMany({
      where: {
        vehicleId,
        studentId: { in: Array.isArray(studentIds) ? studentIds : [studentIds] },
        validDate: { gte: today, lt: tomorrow },
        used: false,
      },
      data: { used: true, usedAt: new Date() },
    });
  }

  res.status(201).json(log);
};

const getStats = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayTotal, todayAuthorized, todayDenied, totalVehicles, totalStudents] = await Promise.all([
    prisma.accessLog.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.accessLog.count({ where: { createdAt: { gte: today, lt: tomorrow }, authorized: true } }),
    prisma.accessLog.count({ where: { createdAt: { gte: today, lt: tomorrow }, authorized: false } }),
    prisma.vehicle.count({ where: { active: true } }),
    prisma.student.count({ where: { active: true } }),
  ]);

  res.json({ todayTotal, todayAuthorized, todayDenied, totalVehicles, totalStudents });
};

module.exports = { getAll, getToday, getRecentByPlate, create, getStats };
