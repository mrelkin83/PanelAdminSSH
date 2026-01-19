# 🧪 Guía de Pruebas - Nuevas Funcionalidades

## 📋 Índice
1. [Monitoreo de VPS](#1-monitoreo-de-vps)
2. [Edición de Usuarios](#2-edición-de-usuarios)
3. [Límite de Conexiones](#3-límite-de-conexiones)
4. [Funciones de Mantenimiento](#4-funciones-de-mantenimiento)
5. [Dashboard Mejorado](#5-dashboard-mejorado)

---

## 🚀 Inicio Rápido

### 1. Iniciar Backend
```bash
cd backend
npm install
npm run dev
```

**Verifica en los logs que veas:**
```
✅ Auto-check de límites de conexión iniciado (cada 5 minutos)
```

### 2. Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Obtener Token de Autenticación
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

**Guarda el token** que recibes en la respuesta.

---

## 1. Monitoreo de VPS

### 🎯 Objetivo
Verificar que el monitoreo de CPU, RAM, Disk, Puertos y Uptime funcione correctamente.

### 📝 Pasos:

#### A) Agregar un VPS (si no tienes)
```bash
curl -X POST http://localhost:3001/api/vps \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VPS Test",
    "host": "192.168.1.100",
    "port": 22,
    "username": "root",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "location": "Miami, USA",
    "provider": "DigitalOcean"
  }'
```

#### B) Obtener métricas del VPS
```bash
curl http://localhost:3001/api/vps/VPS_ID/metrics \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "cpu": 15.2,
    "ram": 42.8,
    "disk": 65,
    "uptime": "5 days, 3 hours",
    "ports": [
      {"port": 22, "protocol": "tcp", "status": "listening", "service": "SSH"},
      {"port": 80, "protocol": "tcp", "status": "listening", "service": "HTTP"},
      {"port": 443, "protocol": "tcp", "status": "closed", "service": "HTTPS"}
    ],
    "timestamp": "2025-12-27T10:30:00.000Z"
  }
}
```

#### C) Limpiar logs del VPS
```bash
curl -X POST http://localhost:3001/api/vps/VPS_ID/clear-logs \
  -H "Authorization: Bearer TU_TOKEN"
```

#### D) Reiniciar VPS
```bash
curl -X POST http://localhost:3001/api/vps/VPS_ID/restart \
  -H "Authorization: Bearer TU_TOKEN"
```

### ✅ Verificación
- [ ] Las métricas se obtienen correctamente
- [ ] CPU, RAM, Disk muestran porcentajes
- [ ] Uptime muestra tiempo legible
- [ ] Puertos muestran estado correcto
- [ ] Logs se limpian sin errores
- [ ] Reinicio se ejecuta correctamente

---

## 2. Edición de Usuarios

### 🎯 Objetivo
Verificar que se pueda editar password, expiración, límite de conexiones y notas.

### 📝 Pasos:

#### A) Crear un usuario de prueba
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vpsId": "VPS_ID",
    "username": "testuser",
    "password": "pass123",
    "days": 30
  }'
```

#### B) Editar el usuario

**Cambiar password:**
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "newpass456"}'
```

**Cambiar fecha de expiración:**
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresAt": "2026-06-30T23:59:59.000Z"}'
```

**Cambiar límite de conexiones:**
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxConnections": 2}'
```

**Actualizar notas:**
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Usuario premium - soporte prioritario"}'
```

**Actualizar múltiples campos:**
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpass789",
    "maxConnections": 3,
    "notes": "Usuario actualizado"
  }'
```

### ✅ Verificación
- [ ] Password se cambia correctamente en VPS
- [ ] Expiración se actualiza en VPS
- [ ] Límite de conexiones se guarda en DB
- [ ] Notas se actualizan en DB
- [ ] Se pueden actualizar múltiples campos a la vez
- [ ] La acción se registra en ActionLog

**Probar en VPS:**
```bash
# SSH al VPS
ssh root@VPS_IP

# Verificar password cambiado
su - testuser  # Debe pedir newpass789

# Verificar fecha de expiración
chage -l testuser
```

---

## 3. Límite de Conexiones

### 🎯 Objetivo
Verificar que el sistema automático de límites funcione y bloquee usuarios que excedan el límite.

### 📝 Pasos:

#### A) Configurar límite para un usuario
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxConnections": 2}'
```

#### B) Simular múltiples conexiones
En el VPS, abre 3 sesiones SSH simultáneas:
```bash
# Terminal 1
ssh testuser@VPS_IP

# Terminal 2
ssh testuser@VPS_IP

# Terminal 3
ssh testuser@VPS_IP
```

#### C) Esperar 5 minutos o forzar verificación manual
```bash
curl -X POST http://localhost:3001/api/maintenance/check-limits \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "exceeded": 1,
    "blocked": 1,
    "results": [
      {
        "userId": "USER_ID",
        "username": "testuser",
        "vpsId": "VPS_ID",
        "maxConnections": 2,
        "currentConnections": 3,
        "exceeded": true,
        "blocked": true
      }
    ]
  },
  "message": "1 usuarios bloqueados por exceder límite"
}
```

#### D) Verificar bloqueo
```bash
# Intentar nueva conexión SSH
ssh testuser@VPS_IP
# Debe rechazar la conexión
```

#### E) Desbloquear manualmente
```bash
curl -X PUT http://localhost:3001/api/users/USER_ID/unblock \
  -H "Authorization: Bearer TU_TOKEN"
```

### ✅ Verificación
- [ ] Usuario se bloquea automáticamente al exceder límite
- [ ] Se registra en ActionLog con detalles
- [ ] El bloqueo se aplica en el VPS
- [ ] La verificación manual funciona
- [ ] El desbloqueo manual funciona
- [ ] El auto-check se ejecuta cada 5 minutos

**Ver logs del auto-check:**
```bash
# En el backend, verás logs como:
# Checking connection limits for X users
# User testuser blocked for exceeding connection limit: 3/2
```

---

## 4. Funciones de Mantenimiento

### 🎯 Objetivo
Verificar todas las funciones de mantenimiento del sistema.

### 📝 Pasos:

#### A) Verificar usuarios expirados
```bash
curl -X POST http://localhost:3001/api/maintenance/check-expired \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "deactivated": 3,
    "users": ["user1", "user2", "user3"]
  },
  "message": "3 usuarios expirados desactivados"
}
```

#### B) Limpiar logs de la API
```bash
# Limpiar logs de más de 7 días
curl -X POST "http://localhost:3001/api/maintenance/clean-logs?days=7" \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "dbLogsDeleted": 450,
    "filesDeleted": 2,
    "days": 7
  },
  "message": "Logs antiguos eliminados: 450 registros DB, 2 archivos"
}
```

#### C) Optimizar base de datos
```bash
curl -X POST http://localhost:3001/api/maintenance/optimize-db \
  -H "Authorization: Bearer TU_TOKEN"
```

#### D) Obtener estadísticas del sistema
```bash
curl http://localhost:3001/api/maintenance/stats \
  -H "Authorization: Bearer TU_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "vps": {
      "total": 5,
      "active": 4,
      "offline": 1
    },
    "users": {
      "total": 50,
      "active": 42,
      "blocked": 3,
      "expired": 5
    },
    "connections": {
      "total": 156
    },
    "logs": {
      "total": 2340,
      "lastWeek": 567
    }
  }
}
```

#### E) Configurar auto-check
```bash
# Activar con intervalo de 3 minutos
curl -X POST http://localhost:3001/api/maintenance/auto-check \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "intervalMinutes": 3
  }'
```

### ✅ Verificación
- [ ] Usuarios expirados se desactivan correctamente
- [ ] Logs de DB se eliminan correctamente
- [ ] Archivos .log se eliminan correctamente
- [ ] VACUUM ANALYZE se ejecuta sin errores
- [ ] Estadísticas se obtienen correctamente
- [ ] Auto-check se puede configurar

---

## 5. Dashboard Mejorado

### 🎯 Objetivo
Verificar las nuevas características del Dashboard.

### 📝 Pasos:

#### A) Abrir el Dashboard mejorado
```
http://localhost:5173
```

#### B) Probar actualización configurable

1. Busca el selector de intervalo (icono de reloj)
2. Cambia entre:
   - 30 segundos
   - 1 minuto
   - 3 minutos
   - 5 minutos
   - Manual

3. Verifica que los datos se actualicen según el intervalo seleccionado

#### C) Probar actualización manual

1. Click en botón "Actualizar"
2. Verifica que los datos se refresquen inmediatamente

#### D) Probar filtros

1. Click en botón "Filtros"
2. Verifica que se muestre el panel de filtros

#### E) Probar búsqueda

1. En el campo de búsqueda, escribe:
   - Nombre de un VPS
   - IP de un VPS
   - Ubicación de un VPS

2. Verifica que la lista de VPS se filtre en tiempo real

#### F) Probar vista detallada de VPS

1. En la sección "VPS Activos"
2. Click en "Ver Detalle" de cualquier VPS
3. Verifica que muestre:
   - Información completa
   - Estadísticas
   - Usuarios asociados
   - Conexiones

### ✅ Verificación
- [ ] Selector de intervalo funciona
- [ ] Actualización manual funciona
- [ ] Filtros se muestran/ocultan correctamente
- [ ] Búsqueda filtra en tiempo real
- [ ] Vista detallada de VPS funciona
- [ ] Estadísticas se actualizan automáticamente
- [ ] UI es responsive

---

## 🧪 Pruebas Integradas

### Escenario Completo:

1. **Crear usuario con límite**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vpsId": "VPS_ID",
    "username": "testlimit",
    "password": "pass123",
    "days": 30,
    "maxConnections": 1
  }'
```

2. **Conectarse al VPS 2 veces**
```bash
# Terminal 1
ssh testlimit@VPS_IP

# Terminal 2
ssh testlimit@VPS_IP
```

3. **Esperar 5 minutos** (o forzar verificación manual)
```bash
curl -X POST http://localhost:3001/api/maintenance/check-limits \
  -H "Authorization: Bearer TU_TOKEN"
```

4. **Verificar que se bloqueó automáticamente**
```bash
# Intentar nueva conexión
ssh testlimit@VPS_IP
# Debe fallar
```

5. **Ver en el Dashboard**
- El usuario debe aparecer como "Bloqueado"
- La estadística de "Usuarios Bloqueados" debe incrementar

6. **Verificar en ActionLog**
```bash
# Buscar en la base de datos
# Debe existir un registro con action: 'auto_block_limit_exceeded'
```

---

## 📊 Verificación de Logs

### Ver logs en tiempo real:
```bash
# Backend logs
tail -f backend/logs/combined.log

# Logs de auto-check
grep "Checking connection limits" backend/logs/combined.log

# Logs de bloqueos automáticos
grep "blocked for exceeding" backend/logs/combined.log
```

### Ver ActionLog en DB:
```sql
-- Últimas 10 acciones
SELECT * FROM "ActionLog" ORDER BY "createdAt" DESC LIMIT 10;

-- Bloqueos automáticos
SELECT * FROM "ActionLog" WHERE action = 'auto_block_limit_exceeded';

-- Desactivaciones automáticas
SELECT * FROM "ActionLog" WHERE action = 'auto_deactivate_expired';
```

---

## 🐛 Troubleshooting

### El auto-check no se inicia
**Solución:** Verifica que veas en los logs al iniciar el backend:
```
✅ Auto-check de límites de conexión iniciado (cada 5 minutos)
```

### Las métricas no se obtienen
**Solución:** Verifica la conexión SSH al VPS:
```bash
curl http://localhost:3001/api/vps/VPS_ID/status \
  -H "Authorization: Bearer TU_TOKEN"
```

### El bloqueo automático no funciona
**Verificar:**
1. El usuario tiene `maxConnections` > 0
2. Las conexiones SSH están activas
3. El auto-check está ejecutándose
4. Los logs muestran verificaciones

### Error en edición de usuario
**Verificar:**
1. El token JWT es válido
2. El usuario existe
3. Los datos enviados son válidos
4. La conexión SSH al VPS funciona

---

## ✅ Checklist Final

- [ ] Monitoreo de VPS funciona
- [ ] Edición de usuarios funciona
- [ ] Límite de conexiones bloquea automáticamente
- [ ] Verificación de expirados funciona
- [ ] Limpieza de logs funciona
- [ ] Dashboard se actualiza automáticamente
- [ ] Filtros y búsqueda funcionan
- [ ] Auto-check se ejecuta cada 5 minutos
- [ ] Los logs se registran correctamente
- [ ] ActionLog guarda todas las acciones

---

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs del backend
2. Verifica que la BD esté conectada
3. Verifica la conexión SSH a los VPS
4. Revisa ActionLog para detalles de errores

---

**Fecha:** 2025-12-27
**Versión:** 1.0.0
**Estado:** ✅ Listo para pruebas
