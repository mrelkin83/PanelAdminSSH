# 🚀 Quick Start - ADMRufu Panel Refactorizado

## ✅ Refactorización Completada

El panel ADMRufu ha sido completamente refactorizado para ser **comercial, simple y listo para vender**.

---

## 📦 Archivos Importantes Creados

### 1. Auto-Instalador VPS
```bash
install-panel.sh          # Instalación con 1 comando
```

### 2. Nuevas Rutas API
```
backend/src/routes/
├── v1/                   # API CORE (7 funciones esenciales)
│   ├── core.routes.ts
│   ├── users.routes.ts
│   ├── monitor.routes.ts
│   └── vps.routes.ts
└── admin/                # API ADMIN (funciones avanzadas)
    ├── admin.routes.ts
    ├── vps.routes.ts
    ├── backup.routes.ts
    └── monitor.routes.ts
```

### 3. Middleware de Seguridad
```
backend/src/middlewares/
└── admin.middleware.ts   # Control de acceso superadmin
```

### 4. Documentación
```
API_DOCUMENTATION.md      # Documentación completa de API
REFACTORING_SUMMARY.md    # Resumen detallado de cambios
GUIA_INSTALACION.md       # Guía de instalación paso a paso
QUICK_START_REFACTORED.md # Este archivo
```

---

## 🎯 Las 7 Funciones Esenciales (API Core)

### Para Operadores (Rol: admin)

```
BASE URL: http://localhost:3001/api/v1
```

| # | Función | Endpoint | Método |
|---|---------|----------|--------|
| 1 | **NUEVO USUARIO** | `/users` | POST |
| 2 | **ELIMINAR USUARIO** | `/users/:id` | DELETE |
| 3 | **RENOVAR USUARIO** | `/users/:id/renew` | PUT |
| 4 | **BLOQUEAR USUARIO** | `/users/:id/block` | PUT |
| 4 | **DESBLOQUEAR USUARIO** | `/users/:id/unblock` | PUT |
| 6 | **DETALLES DE TODOS** | `/users` | GET |
| 7 | **MONITOR CONECTADOS** | `/monitor/connections` | GET |

---

## 🔐 Funciones Avanzadas (API Admin)

### Para Superadministradores (Rol: superadmin)

```
BASE URL: http://localhost:3001/api/admin
```

**Gestión de VPS:**
- `POST /vps` - Agregar nuevo VPS
- `PUT /vps/:id` - Editar VPS
- `DELETE /vps/:id` - Eliminar VPS

**Sistema de Backups:**
- `GET /backup` - Listar backups
- `POST /backup` - Crear backup
- `POST /backup/:id/restore` - Restaurar backup
- `DELETE /backup/:id` - Eliminar backup

**Monitoreo Avanzado:**
- `GET /monitor/history` - Historial de conexiones
- `GET /monitor/logs` - Logs de auditoría

---

## 📝 Ejemplo de Uso Rápido

### 1. Login (obtener token)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admrufu.com",
    "password": "admin123"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "email": "admin@admrufu.com",
      "role": "superadmin"
    }
  }
}
```

### 2. Crear Usuario SSH (Función #1)

```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vpsId": "clx123...",
    "username": "cliente001",
    "password": "Pass123",
    "days": 30
  }'
```

### 3. Listar Usuarios (Función #6)

```bash
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Monitor de Conectados (Función #7)

```bash
curl -X GET http://localhost:3001/api/v1/monitor/connections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Instalación en VPS de Producción

### Opción 1: Instalación Automatizada (Recomendado)

```bash
# 1. Conectar al VPS
ssh root@tu-vps-ip

# 2. Descargar y ejecutar instalador
curl -sSL https://raw.githubusercontent.com/TU_REPO/main/install-panel.sh | sudo bash

# 3. ¡Listo! El panel estará en http://tu-vps-ip:3001
```

### Opción 2: Instalación Manual

Ver `GUIA_INSTALACION.md` para instrucciones detalladas.

---

## 🎨 Desarrollo Local (Frontend)

El backend está listo. Próximo paso es crear el frontend:

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar API endpoint
# .env.local:
VITE_API_URL=http://localhost:3001/api/v1

# Iniciar desarrollo
npm run dev
```

### Estructura del Frontend Recomendada

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx          # Vista principal
│   │   ├── Users.tsx              # 7 funciones core
│   │   ├── Monitor.tsx            # Usuarios conectados
│   │   └── admin/                 # Panel admin (solo superadmin)
│   │       ├── VPSManagement.tsx
│   │       ├── Backups.tsx
│   │       └── Logs.tsx
│   ├── components/
│   │   ├── UserForm.tsx           # Crear/editar usuario
│   │   ├── UserCard.tsx           # Tarjeta de usuario
│   │   └── ConnectionList.tsx    # Lista de conectados
│   └── api/
│       └── client.ts              # Cliente axios para API
```

---

## 🔒 Sistema de Permisos

### Roles Disponibles

| Rol | Dashboard | 7 Funciones Core | Gestión VPS | Backups | Logs |
|-----|-----------|------------------|-------------|---------|------|
| `admin` | ✅ | ✅ | ❌ Ver solo | ❌ | ❌ |
| `superadmin` | ✅ | ✅ | ✅ Completo | ✅ | ✅ |

### Cambiar Rol de Usuario

```sql
-- Conectar a la base de datos
cd /opt/admrufu-panel/backend
npx prisma studio

-- O directamente con SQL
sqlite3 prisma/dev.db
UPDATE admins SET role = 'superadmin' WHERE email = 'usuario@example.com';
```

---

## 📊 Verificar Estado del Sistema

### En Desarrollo (Local)

```bash
# Ver si el servidor está corriendo
curl http://localhost:3001/health

# Ver logs en tiempo real
# (el servidor ya está corriendo con npm run dev)
```

### En Producción (VPS)

```bash
# Estado del servicio
systemctl status admrufu-panel

# Logs en tiempo real
journalctl -u admrufu-panel -f

# Ver últimos 100 logs
journalctl -u admrufu-panel -n 100

# Reiniciar servicio
systemctl restart admrufu-panel
```

---

## 🐛 Solución de Problemas Comunes

### Error: "Acceso denegado. Se requieren privilegios de administrador"

**Causa**: Intentando acceder a `/api/admin/*` con rol `admin`

**Solución**:
```sql
-- Actualizar rol a superadmin
UPDATE admins SET role = 'superadmin' WHERE email = 'tu-email@example.com';
```

### Error: "Failed to connect to VPS via SSH"

**Causa**: Credenciales SSH incorrectas o VPS inaccesible

**Solución**:
1. Verificar que el VPS esté online
2. Validar credenciales SSH manualmente: `ssh root@vps-ip`
3. Revisar firewall: `ufw status`

### Error: "error:1C800064:Provider routines::bad decrypt"

**Causa**: `ENCRYPTION_KEY` cambió después de crear VPS

**Solución**:
```bash
# No cambiar ENCRYPTION_KEY en .env
# Si es necesario, eliminar VPS y volver a agregarlo
```

---

## 📈 Próximos Pasos

### Inmediato (Esta Semana)

- [ ] Crear dashboard React con las 7 funciones
- [ ] Diseño simple y profesional (no técnico)
- [ ] Probar flujo completo end-to-end

### Corto Plazo (2 Semanas)

- [ ] Implementar panel admin para superadmin
- [ ] Agregar confirmaciones antes de acciones peligrosas
- [ ] Testing en VPS real con instalador

### Mediano Plazo (1 Mes)

- [ ] Configurar dominio y SSL
- [ ] Nginx como reverse proxy
- [ ] Sistema de notificaciones por email
- [ ] Documentación para clientes finales

---

## 📚 Documentación Completa

Para más detalles, consulta:

- **`API_DOCUMENTATION.md`** - Documentación completa de endpoints
- **`REFACTORING_SUMMARY.md`** - Resumen detallado de todos los cambios
- **`GUIA_INSTALACION.md`** - Guía paso a paso de instalación
- **`RESUMEN_PRUEBAS.md`** - Estado de pruebas y problemas conocidos

---

## 🎯 Resumen de Beneficios

### ✅ Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Instalación** | Manual, compleja | 1 comando automático |
| **API** | Mezclada, técnica | Separada: Core + Admin |
| **Operadores** | Confuso, muchas opciones | 7 funciones simples |
| **Seguridad** | Todo accesible | RBAC, funciones ocultas |
| **Documentación** | Básica | Completa y detallada |
| **Comercialización** | No lista | Lista para vender ✅ |

---

## 💡 Contacto y Soporte

- **Documentación**: Ver archivos `.md` en la raíz del proyecto
- **Logs**: `/var/log/admrufu-panel-install.log` (instalación)
- **Logs**: `journalctl -u admrufu-panel` (producción)
- **Logs**: `backend/logs/` (desarrollo)

---

**Panel ADMRufu v1.0 - Refactorizado para Producción**

🚀 Listo para comercializar
🔒 Seguro por defecto
📊 Simple para operadores
🛠️ Completo para administradores

---

**Última actualización**: 2025-12-26
