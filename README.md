# EduGate — Sistema de Control de Acceso Escolar

## Estructura del proyecto

```
school-gate/
├── backend/               # Node.js + Express + Prisma + PostgreSQL
├── frontend-web/          # React Web App
└── mobile-app/            # React Native (Expo)
```

---

## Requisitos previos

- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)
- Un dispositivo Android o iOS (o emulador)

---

## 1. Configurar la base de datos (PostgreSQL)

```sql
CREATE DATABASE school_gate;
CREATE USER school_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE school_gate TO school_user;
```

---

## 2. Backend

```bash
cd backend
npm install

# Copiar y editar variables de entorno
cp .env.example .env
# Edita DATABASE_URL con tu usuario y contraseña

# Generar el cliente Prisma y crear tablas
npx prisma generate
npx prisma migrate dev --name init

# Cargar datos de prueba
node prisma/seed.js

# Iniciar el servidor
npm run dev
```

El servidor corre en `http://localhost:4000`

### Usuarios creados por el seed:
| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@colegio.edu.co | admin123 |
| Secretaria | secretaria@colegio.edu.co | secretaria123 |
| Portero | portero@colegio.edu.co | portero123 |

---

## 3. Frontend Web

```bash
cd frontend-web
npm install
npm start
```

La app web corre en `http://localhost:3000`

---

## 4. App Móvil (React Native / Expo)

```bash
cd mobile-app
npm install

# IMPORTANTE: Editar la IP del servidor
# Abre src/services/api.js y cambia:
# const BASE_URL = 'http://TU_IP_LOCAL:4000/api';
# Por la IP de tu computador en la red local, ej:
# const BASE_URL = 'http://192.168.1.100:4000/api';
```

Para encontrar tu IP local:
- Windows: `ipconfig` → busca "IPv4 Address"
- Mac/Linux: `ifconfig` → busca `inet` en la interfaz `en0` o `wlan0`

```bash
# Iniciar la app
npx expo start

# Escanea el QR con la app Expo Go en tu celular
# O presiona 'a' para Android / 'i' para iOS (emulador)
```

---

## Módulos y pantallas

### App Web
| Módulo | Roles | Descripción |
|--------|-------|-------------|
| Dashboard | Todos | Estadísticas del día y actividad reciente |
| Portería | Todos | Cámara + lectura OCR + verificación de placa |
| Vehículos | Admin, Secretaria | CRUD completo de vehículos y estudiantes vinculados |
| Estudiantes | Admin, Secretaria | CRUD de estudiantes |
| Permisos | Admin, Secretaria | Permisos temporales de un día |
| Historial | Todos | Log completo con filtros |

### App Móvil
| Pantalla | Descripción |
|----------|-------------|
| Portería | Cámara, OCR, búsqueda manual, confirmar/denegar salida |
| Permisos | Ver permisos del día o todos, eliminar |
| Historial | Actividad de hoy con pull-to-refresh |

---

## Flujo del permiso temporal (un día)

1. La **secretaria** abre la app web → sección "Permisos"
2. Hace clic en **"+ Nuevo permiso"**
3. Selecciona la fecha, el vehículo que va a recoger y el estudiante
4. Escribe el motivo (opcional)
5. Guarda — el permiso queda activo solo para esa fecha
6. Cuando el vehículo llega a la portería, el sistema muestra al estudiante con la etiqueta **"Permiso temporal"**
7. Al día siguiente, el permiso se desactiva automáticamente (cron job a medianoche)

---

## Flujo de lectura de placa

1. El portero abre la app (web o móvil)
2. Activa la cámara o sube una foto
3. El backend procesa la imagen con **Tesseract.js** (OCR)
4. Se extrae la placa (formato colombiano: ABC123 o ABC12D)
5. El sistema consulta la base de datos
6. Si está registrado → muestra vehículo + estudiantes autorizados
7. El portero confirma la salida o deniega el paso
8. El evento queda registrado en el historial en tiempo real (Socket.io)

---

## Variables de entorno (backend)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/school_gate"
JWT_SECRET="secreto_muy_seguro"
JWT_EXPIRES_IN="8h"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

---

## Tecnologías utilizadas

**Backend:** Node.js · Express · Prisma ORM · PostgreSQL · Tesseract.js (OCR) · Socket.io · JWT · Multer

**Frontend Web:** React · React Router · Axios · Socket.io-client · react-webcam · date-fns

**App Móvil:** React Native · Expo · expo-camera · React Navigation · AsyncStorage
