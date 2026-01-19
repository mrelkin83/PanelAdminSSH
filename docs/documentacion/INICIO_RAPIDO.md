# 🚀 Inicio Rápido - Panel ADMRufu

## Estado Actual

✅ Backend configurado
✅ Dependencias instaladas
✅ Cliente Prisma generado
⏳ Pendiente: Configurar base de datos
⏳ Pendiente: Iniciar servidor

## Próximos Pasos

### 1. Configurar PostgreSQL

#### Opción A: PostgreSQL Local

```bash
# Instalar PostgreSQL (si no está instalado)
# Windows: Descargar desde https://www.postgresql.org/download/windows/
# Linux: sudo apt install postgresql postgresql-contrib

# Crear base de datos
psql -U postgres
CREATE DATABASE admrufu_panel;
CREATE USER admrufu_user WITH ENCRYPTED PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE admrufu_panel TO admrufu_user;
\q
```

#### Opción B: SQLite (Para desarrollo rápido)

Editar `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

### 2. Configurar Variables de Entorno

Editar `backend/.env`:

```env
# Para PostgreSQL:
DATABASE_URL="postgresql://admrufu_user:tu_password@localhost:5432/admrufu_panel?schema=public"

# Para SQLite:
# DATABASE_URL="file:./dev.db"

JWT_SECRET="genera-un-secreto-aleatorio-aqui"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

Generar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Ejecutar Migraciones

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Crear Admin Inicial

```bash
npx tsx prisma/seed.ts
```

**Credenciales creadas:**
- Email: `admin@admrufu.com`
- Password: `admin123`

### 5. Iniciar Backend

```bash
npm run dev
```

El servidor inicia en: `http://localhost:3001`

### 6. Verificar Backend

```bash
# Test health check
curl http://localhost:3001/health
```

## Probar Conexión al VPS

### Script de Prueba

El archivo `backend/test-interactive-menu.ts` ya está configurado con tus credenciales VPS.

```bash
cd backend
npx tsx test-interactive-menu.ts
```

**Qué hace:**
1. Conecta al VPS vía SSH
2. Abre sesión shell interactiva
3. Ejecuta comando `menu`
4. Captura y muestra el output
5. Guarda output en `admrufu-output.txt`

**Salida esperada:**
```
🔌 Conectando a 213.199.61.64:22...
✅ SSH conectado, abriendo shell...
✅ Shell abierto

[OUTPUT DEL MENÚ ADMRUFU]

💾 Output completo guardado en: admrufu-output.txt
```

### Analizar Output del Menú

1. Ejecuta el script de prueba
2. Revisa `admrufu-output.txt`
3. Identifica:
   - Estructura del menú
   - Opciones numéricas
   - Prompts de input
   - Mensajes de éxito/error

4. Adapta `backend/src/services/admrufu.service.ts`:
   - Ajusta números de opciones en cada método
   - Ajusta patrones de detección

## API Endpoints Disponibles

### Autenticación
```bash
# Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@admrufu.com",
  "password": "admin123"
}

# Respuesta:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "admin@admrufu.com",
      "name": "Administrador",
      "role": "superadmin"
    }
  }
}
```

### VPS
```bash
# Agregar VPS
POST http://localhost:3001/api/vps
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "VPS Principal",
  "host": "213.199.61.64",
  "port": 22,
  "username": "root",
  "password": "M@ytE.2024*#Teo.2017",
  "location": "EU",
  "provider": "Custom"
}
```

### Usuarios SSH
```bash
# Crear usuario
POST http://localhost:3001/api/users
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vpsId": "ID_DEL_VPS",
  "username": "test_user",
  "password": "pass123",
  "days": 30,
  "notes": "Usuario de prueba"
}
```

## Estructura de Archivos Clave

```
backend/
├── src/
│   ├── services/
│   │   ├── ssh-interactive.service.ts    # SSH shell interactivo
│   │   └── admrufu.service.ts            # Interacción con menú ADMRufu
│   ├── controllers/
│   │   ├── auth.controller.ts            # Login/registro
│   │   ├── vps.controller.ts             # Gestión VPS
│   │   └── users.controller.ts           # Gestión usuarios SSH
│   ├── routes/                           # Rutas API
│   └── index.ts                          # Servidor principal
├── prisma/
│   ├── schema.prisma                     # Schema de base de datos
│   └── seed.ts                           # Seed admin inicial
└── test-interactive-menu.ts              # Script de prueba SSH
```

## Siguiente: Frontend

Una vez el backend esté funcionando:

```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con: VITE_API_URL=http://localhost:3001/api
npm run dev
```

Frontend abre en: `http://localhost:5173`

## Troubleshooting

### Error: Puerto 3001 en uso
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Error: Cannot connect to database
- Verificar que PostgreSQL esté corriendo
- Verificar credenciales en DATABASE_URL
- O cambiar a SQLite para desarrollo

### Error: SSH connection failed
- Verificar IP del VPS
- Verificar port 22 abierto
- Verificar credenciales (password o privateKey)

## Estado de Implementación

| Componente | Estado |
|------------|--------|
| SSH Interactive Service | ✅ Completo |
| ADMRufu Service | ✅ Template (requiere adaptación al menú real) |
| Controladores Backend | ✅ Completo |
| Rutas API | ✅ Completo |
| Auth JWT | ✅ Completo |
| Base de Datos | ✅ Schema listo |
| Frontend | ⏳ Por implementar |

## Comandos Útiles

```bash
# Ver logs de Prisma
npx prisma studio

# Resetear base de datos
npx prisma migrate reset

# Ver todos los endpoints
grep -r "router\." backend/src/routes/

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start
```
