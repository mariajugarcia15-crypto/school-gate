// src/controllers/permit.controller.js
const prisma = require('../lib/prisma');

const getToday = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const permits = await prisma.temporaryPermit.findMany({
    where: { validDate: { gte: today, lt: tomorrow } },
    include: {
      vehicle: true,
      student: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(permits);
};

const getAll = async (req, res) => {
  const { from, to, studentId, vehicleId } = req.query;
  const permits = await prisma.temporaryPermit.findMany({
    where: {
      ...(from && to && { validDate: { gte: new Date(from), lte: new Date(to) } }),
      ...(studentId && { studentId }),
      ...(vehicleId && { vehicleId }),
    },
    include: { vehicle: true, student: true },
    orderBy: { validDate: 'desc' },
  });
  res.json(permits);
};

const create = async (req, res) => {
  const { vehicleId, studentId, validDate, reason } = req.body;

  // Validate vehicle and student exist
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

  // Check if permit already exists for same day
  const date = new Date(validDate);
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const existing = await prisma.temporaryPermit.findFirst({
    where: {
      studentId,
      validDate: { gte: date, lt: nextDay },
      used: false,
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un permiso para ese estudiante en esa fecha' });
  }

  const permit = await prisma.temporaryPermit.create({
    data: {
      vehicleId,
      studentId,
      validDate: new Date(validDate + 'T12:00:00'),
      reason,
      createdById: req.user?.id,
    },
    include: { vehicle: true, student: true },
  });

  // Notify connected clients in real time
  req.io?.emit('permit:created', permit);

  res.status(201).json(permit);
};

const markUsed = async (req, res) => {
  const permit = await prisma.temporaryPermit.update({
    where: { id: req.params.id },
    data: { used: true, usedAt: new Date() },
  });
  res.json(permit);
};

const remove = async (req, res) => {
  await prisma.temporaryPermit.delete({ where: { id: req.params.id } });
  res.json({ message: 'Permiso eliminado' });
};

module.exports = { getToday, getAll, create, markUsed, remove };
