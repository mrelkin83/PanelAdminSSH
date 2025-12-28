# 🔍 Diagnóstico: Error de Conexión al Iniciar Sesión

## 📋 Checklist de Diagnóstico

Vamos a verificar cada componente paso a paso:

---

## 1️⃣ Verificar que el Backend esté corriendo

### Paso 1: Abrir terminal en la carpeta backend
```bash
cd C:\PanelAdminSSH-AMDRufus\backend
```

### Paso 2: Verificar si el servidor está corriendo
```bash
# En Windows, buscar procesos de Node
netstat -ano | findstr :3001
```

**¿Ves algo?**
- ✅ **SÍ** → El backend está corriendo en el puerto 3001
- ❌ **NO** → El backend NO está corriendo, necesitas iniciarlo

### Paso 3: Iniciar el backend (si no está corriendo)
```bash
cd backend
npm run dev
```

**Deberías ver:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🚀 ADMRufu Panel Backend Server Started          │
│                                                     │
│   📡 Server: http://localhost:3001                 │
│   🌍 Environment: development                      │
│   📊 Database: Connected                            │
│                                                     │
└─────────────────────────────────────────────────────┘

✅ Auto-check de límites de conexión iniciado (cada 5 minutos)
```

---

## 2️⃣ Verificar la Base de Datos

### Paso 1: Verificar que PostgreSQL esté corriendo

**Windows:**
```bash
# Buscar proceso de PostgreSQL
tasklist | findstr postgres
```

**¿Ves algo?**
- ✅ **SÍ** → PostgreSQL está corriendo
- ❌ **NO** → Necesitas iniciar PostgreSQL

### Paso 2: Verificar conexión a la base de datos

Abre el archivo `.env` en la carpeta backend:
```bash
cd backend
notepad .env
```

**Verifica que `DATABASE_URL` esté correctamente configurado:**
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_base_datos"
```

**Ejemplo correcto:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/admrufu_panel"
```

### Paso 3: Probar conexión con Prisma
```bash
cd backend
npx prisma db pull
```

**Si falla:**
```bash
# Crear la base de datos si no existe
npx prisma migrate dev --name init
```

---

## 3️⃣ Verificar que exista un Admin en la Base de Datos

### Opción A: Usar el script de credenciales
```bash
cd backend
node scripts/update-admin.js
```

### Opción B: Crear admin manualmente con Prisma Studio
```bash
cd backend
npx prisma studio
```

1. Se abrirá en el navegador: `http://localhost:5555`
2. Click en la tabla **Admin**
3. Verifica si existe algún admin
4. Si NO existe, usa el script de la Opción A

---

## 4️⃣ Verificar la URL de la API en el Frontend

### Paso 1: Abrir archivo de configuración del frontend

**Opción 1 - .env:**
```bash
cd frontend
notepad .env
```

Verifica que tenga:
```env
VITE_API_URL=http://localhost:3001
```

**Opción 2 - Verificar en el código:**

Busca el archivo de servicio API del frontend y verifica la URL base.

---

## 5️⃣ Verificar CORS

### Abrir archivo de configuración del backend
```bash
cd backend
notepad src\index.ts
```

Busca la sección de CORS (línea ~30):
```typescript
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
```

### Verificar .env del backend
```bash
notepad .env
```

Debe tener:
```env
CORS_ORIGIN=http://localhost:5173
```

O para permitir todo (solo desarrollo):
```env
CORS_ORIGIN=*
```

---

## 6️⃣ Probar la API Manualmente

### Desde el navegador:
Abre: `http://localhost:3001/health`

**Deberías ver:**
```json
{
  "success": true,
  "status": "OK",
  "timestamp": "2025-12-27T...",
  "environment": "development"
}
```

### Desde la terminal (PowerShell):
```powershell
curl http://localhost:3001/health
```

**O con Git Bash:**
```bash
curl http://localhost:3001/health
```

---

## 7️⃣ Probar el Login Manualmente

### Con curl (Git Bash o PowerShell):
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"mr.elkin@hotmail.com\", \"password\": \"Mayte2024*#\"}"
```

**Respuesta esperada (éxito):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "mr.elkin@hotmail.com",
      "name": "Administrator",
      "role": "superadmin"
    }
  }
}
```

**Respuesta de error común:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## 8️⃣ Verificar los Logs del Backend

### Si el backend está corriendo:
```bash
cd backend
# Ver logs en tiempo real
Get-Content logs\combined.log -Wait -Tail 50
```

**O en Git Bash:**
```bash
tail -f logs/combined.log
```

**Busca errores como:**
- `Failed to connect to database`
- `CORS error`
- `Port already in use`
- `Invalid credentials`

---

## 🔧 Soluciones Rápidas

### Problema 1: "Cannot connect to database"
```bash
cd backend

# Verificar que PostgreSQL esté corriendo
# Windows: Servicios > PostgreSQL

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate
```

### Problema 2: "Invalid credentials"
```bash
cd backend

# Ejecutar script de credenciales
node scripts/update-admin.js

# Verificar en Prisma Studio
npx prisma studio
```

### Problema 3: "CORS error"
```bash
cd backend

# Editar .env
echo CORS_ORIGIN=* >> .env

# Reiniciar backend
# Ctrl+C y luego npm run dev
```

### Problema 4: "Port 3001 already in use"
```bash
# Windows: Matar proceso en puerto 3001
netstat -ano | findstr :3001
# Anota el PID (último número)
taskkill /PID NUMERO_PID /F

# Luego reiniciar
cd backend
npm run dev
```

---

## 📊 Checklist Final

Marca cada item cuando lo completes:

- [ ] Backend está corriendo en puerto 3001
- [ ] PostgreSQL está corriendo
- [ ] Base de datos existe y está conectada
- [ ] Admin existe en la base de datos
- [ ] `/health` endpoint responde correctamente
- [ ] Login manual con curl funciona
- [ ] CORS está configurado correctamente
- [ ] Frontend tiene la URL correcta de la API

---

## 🆘 Si Nada Funciona

### Reinicio Completo:

```bash
# 1. Detener todo
# Ctrl+C en ambas terminales (backend y frontend)

# 2. Backend
cd backend

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Regenerar Prisma
npx prisma generate
npx prisma migrate dev

# Crear admin
node scripts/update-admin.js

# Iniciar backend
npm run dev

# 3. Frontend (en otra terminal)
cd frontend

# Verificar .env
echo VITE_API_URL=http://localhost:3001 > .env

# Reinstalar si es necesario
npm install

# Iniciar frontend
npm run dev
```

---

## 📝 Información que Necesito

Para ayudarte mejor, por favor proporciona:

1. **¿Qué mensaje de error exacto ves?**
   - En el frontend (navegador)
   - En la consola del navegador (F12)

2. **¿El backend está corriendo?**
   ```bash
   netstat -ano | findstr :3001
   ```

3. **¿Qué responde el health check?**
   ```bash
   curl http://localhost:3001/health
   ```

4. **¿Hay errores en los logs del backend?**
   ```bash
   cd backend
   type logs\error.log
   ```

5. **Captura de pantalla del error (si es posible)**

---

Con esta información podré ayudarte a resolver el problema específico.
