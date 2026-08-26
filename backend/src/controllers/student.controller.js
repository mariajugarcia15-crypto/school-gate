// src/controllers/student.controller.js
const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  const { search, grade } = req.query;
  const students = await prisma.student.findMany({
    where: {
      active: true,
      ...(grade && { grade }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { grade: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      vehicleLinks: { include: { vehicle: true } },
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });
  res.json(students);
};

const getOne = async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      vehicleLinks: { include: { vehicle: true } },
      logs: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
  res.json(student);
};

const create = async (req, res) => {
  const { name, grade, section } = req.body;
  const photoUrl = req.file ? `/uploads/students/${req.file.filename}` : null;
  const student = await prisma.student.create({
    data: { name, grade, section, photoUrl },
  });
  res.status(201).json(student);
};

const update = async (req, res) => {
  const { name, grade, section, active } = req.body;
  const photoUrl = req.file ? `/uploads/students/${req.file.filename}` : undefined;
  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(grade && { grade }),
      ...(section && { section }),
      ...(active !== undefined && { active: active === 'true' || active === true }),
      ...(photoUrl && { photoUrl }),
    },
  });
  res.json(student);
};

const remove = async (req, res) => {
  await prisma.student.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ message: 'Estudiante desactivado' });
};

module.exports = { getAll, getOne, create, update, remove };
