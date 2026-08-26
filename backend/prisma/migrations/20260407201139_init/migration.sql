-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SECRETARIA', 'PORTERO');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'VAN', 'BUS');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ENTRY', 'EXIT', 'DENIED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PORTERO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerDni" TEXT,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_students" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_permits" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "validDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "temporary_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plate" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL DEFAULT 'EXIT',
    "photoUrl" TEXT,
    "ocrRaw" TEXT,
    "confidence" DOUBLE PRECISION,
    "authorized" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "registeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccessLogToStudent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_students_vehicleId_studentId_key" ON "vehicle_students"("vehicleId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "_AccessLogToStudent_AB_unique" ON "_AccessLogToStudent"("A", "B");

-- CreateIndex
CREATE INDEX "_AccessLogToStudent_B_index" ON "_AccessLogToStudent"("B");

-- AddForeignKey
ALTER TABLE "vehicle_students" ADD CONSTRAINT "vehicle_students_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_students" ADD CONSTRAINT "vehicle_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_permits" ADD CONSTRAINT "temporary_permits_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_permits" ADD CONSTRAINT "temporary_permits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessLogToStudent" ADD CONSTRAINT "_AccessLogToStudent_A_fkey" FOREIGN KEY ("A") REFERENCES "access_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessLogToStudent" ADD CONSTRAINT "_AccessLogToStudent_B_fkey" FOREIGN KEY ("B") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
