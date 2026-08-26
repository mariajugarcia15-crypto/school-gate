// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const studentRoutes = require('./routes/student.routes');
const permitRoutes = require('./routes/permit.routes');
const logRoutes = require('./routes/log.routes');
const ocrRoutes = require('./routes/ocr.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach socket.io to req
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ocr', ocrRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// Error handler
app.use(errorHandler);

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Daily cron: mark expired temporary permits at midnight
cron.schedule('0 0 * * *', async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await prisma.temporaryPermit.updateMany({
    where: { validDate: { lt: yesterday }, used: false },
    data: { used: true },
  });
  await prisma.$disconnect();
  console.log('Expired temporary permits cleaned up');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };
