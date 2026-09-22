// src/controllers/vehicle.controller.js
const prisma = require('../lib/prisma');

const normalizeStudentIds = (studentIds) => (
  studentIds === undefined ? undefined : Array.isArray(studentIds) ? studentIds : [studentIds]
);

const getAll = async (req, res) => {
  const { search, active } = req.query;
  const vehicles = await prisma.vehicle.findMany({
    where: {
      active: active !== undefined ? active === 'true' : true,
      ...(search && {
        OR: [
          { plate: { contains: search.toUpperCase(), mode: 'insensitive' } },
          { ownerName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      students: { include: { student: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(vehicles);
};

const getOne = async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: { students: { include: { student: true } }, logs: { take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });
  res.json(vehicle);
};

const getByPlate = async (req, res) => {
  const plate = req.params.plate.toUpperCase().replace(/\s/g, '');
  const vehicle = await prisma.vehicle.findFirst({
    where: { plate: { equals: plate, mode: 'insensitive' }, active: true },
    include: {
      students: { include: { student: true } },
    },
  });

  if (!vehicle) {
    return res.status(404).json({ found: false, plate, message: 'Vehículo no registrado' });
  }

  // Check temporary permits for today
  const today = new Date();
today.setUTCHours(5, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

  const tempPermits = await prisma.temporaryPermit.findMany({
    where: {
      vehicleId: vehicle.id,
      validDate: { gte: today, lt: tomorrow },
      used: false,
    },
    include: { student: true },
  });

  res.json({ found: true, vehicle, tempPermits });
};

const create = async (req, res) => {
  const { plate, brand, model, color, ownerName, ownerPhone, ownerDni, vehicleType, studentIds } = req.body;
  const normalizedStudentIds = normalizeStudentIds(studentIds);
  const photoUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: plate.toUpperCase().replace(/\s/g, ''),
      brand, model, color, ownerName, ownerPhone, ownerDni,
      vehicleType: vehicleType || 'CAR',
      photoUrl,
      students: normalizedStudentIds?.length
        ? { create: normalizedStudentIds.map((id) => ({ studentId: id, isMain: true })) }
        : undefined,
    },
    include: { students: { include: { student: true } } },
  });
  res.status(201).json(vehicle);
};

const update = async (req, res) => {
  const { plate, brand, model, color, ownerName, ownerPhone, ownerDni, vehicleType, active, studentIds } = req.body;
  const normalizedStudentIds = normalizeStudentIds(studentIds);
  const photoUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : undefined;

  const data = {
    ...(plate && { plate: plate.toUpperCase().replace(/\s/g, '') }),
    ...(brand !== undefined && { brand }),
    ...(model !== undefined && { model }),
    ...(color !== undefined && { color }),
    ...(ownerName && { ownerName }),
    ...(ownerPhone !== undefined && { ownerPhone }),
    ...(ownerDni !== undefined && { ownerDni }),
    ...(vehicleType && { vehicleType }),
    ...(active !== undefined && { active: active === 'true' || active === true }),
    ...(photoUrl && { photoUrl }),
  };

  if (normalizedStudentIds !== undefined) {
    await prisma.vehicleStudent.deleteMany({ where: { vehicleId: req.params.id } });
    data.students = { create: normalizedStudentIds.map((id) => ({ studentId: id, isMain: true })) };
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data,
    include: { students: { include: { student: true } } },
  });
  res.json(vehicle);
};

const remove = async (req, res) => {
  await prisma.vehicle.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ message: 'Vehículo desactivado' });
};

module.exports = { getAll, getOne, getByPlate, create, update, remove };
