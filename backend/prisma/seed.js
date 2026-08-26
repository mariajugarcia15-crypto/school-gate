// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const adminPass = await bcrypt.hash('admin123', 10);
  const secPass = await bcrypt.hash('secretaria123', 10);
  const porteroPass = await bcrypt.hash('portero123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@colegio.edu.co' },
    update: {},
    create: { name: 'Administrador', email: 'admin@colegio.edu.co', password: adminPass, role: 'ADMIN' },
  });

  const secretaria = await prisma.user.upsert({
    where: { email: 'secretaria@colegio.edu.co' },
    update: {},
    create: { name: 'María González', email: 'secretaria@colegio.edu.co', password: secPass, role: 'SECRETARIA' },
  });

  await prisma.user.upsert({
    where: { email: 'portero@colegio.edu.co' },
    update: {},
    create: { name: 'Juan Portero', email: 'portero@colegio.edu.co', password: porteroPass, role: 'PORTERO' },
  });

  // Create students
  const students = await Promise.all([
    prisma.student.upsert({ where: { id: 'student-001' }, update: {}, create: { id: 'student-001', name: 'Sofía Martínez', grade: '5', section: 'B' } }),
    prisma.student.upsert({ where: { id: 'student-002' }, update: {}, create: { id: 'student-002', name: 'Luis Rodríguez', grade: '5', section: 'B' } }),
    prisma.student.upsert({ where: { id: 'student-003' }, update: {}, create: { id: 'student-003', name: 'Valentina Torres', grade: '3', section: 'A' } }),
    prisma.student.upsert({ where: { id: 'student-004' }, update: {}, create: { id: 'student-004', name: 'Andrés Herrera', grade: '4', section: 'C' } }),
  ]);

  // Create vehicles
  const v1 = await prisma.vehicle.upsert({
    where: { plate: 'ABC123' },
    update: {},
    create: {
      plate: 'ABC123', brand: 'Toyota', model: 'Hilux', color: 'Blanca',
      ownerName: 'Carlos Martínez', ownerPhone: '3101234567', vehicleType: 'CAR',
      students: { create: [{ studentId: 'student-001', isMain: true }] },
    },
  });

  const v2 = await prisma.vehicle.upsert({
    where: { plate: 'XYZ456' },
    update: {},
    create: {
      plate: 'XYZ456', brand: 'Chevrolet', model: 'Spark', color: 'Roja',
      ownerName: 'Laura Rodríguez', ownerPhone: '3209876543', vehicleType: 'CAR',
      students: { create: [{ studentId: 'student-002', isMain: true }] },
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'MNO789' },
    update: {},
    create: {
      plate: 'MNO789', brand: 'Honda', model: 'CB190', color: 'Negra',
      ownerName: 'Pedro Torres', ownerPhone: '3156789012', vehicleType: 'MOTORCYCLE',
      students: { create: [{ studentId: 'student-003', isMain: true }] },
    },
  });

  // Create a sample temporary permit for today
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  await prisma.temporaryPermit.create({
    data: {
      vehicleId: v1.id,
      studentId: 'student-002',
      validDate: today,
      reason: 'Los padres de Luis están de viaje. Carlos Martínez lo recoge hoy.',
      createdById: secretaria.id,
    },
  }).catch(() => {});

  console.log('Seed completed!');
  console.log('Usuarios creados:');
  console.log('  Admin:      admin@colegio.edu.co / admin123');
  console.log('  Secretaria: secretaria@colegio.edu.co / secretaria123');
  console.log('  Portero:    portero@colegio.edu.co / portero123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
