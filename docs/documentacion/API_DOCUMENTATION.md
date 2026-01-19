# 📚 ADMRufu Panel - API Documentation v1.0

## Índice

1. [Introducción](#introducción)
2. [Estructura de la API](#estructura-de-la-api)
3. [Autenticación](#autenticación)
4. [API Core (v1) - 7 Funciones Esenciales](#api-core-v1---7-funciones-esenciales)
5. [API Admin - Funciones Avanzadas](#api-admin---funciones-avanzadas)
6. [Códigos de Respuesta](#códigos-de-respuesta)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Introducción

La API de ADMRufu Panel está diseñada con dos niveles de acceso:

- **API Core (v1)**: 7 funciones esenciales para operadores sin conocimientos técnicos
- **API Admin**: Funciones avanzadas para superadministradores

### Base URL

```
http://your-server-ip:3001
```

### Formato de Respuesta

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "data": { ... },
  "message": "Mensaje descriptivo (opcional)"
}
```

En caso de error:

```json
{
  "success": false,
  "error": "Descripción del error"
}
```

---

## Estructura de la API

```
/api
├── /auth                    # Autenticación (público)
│   ├── POST /login
│   └── POST /logout
│
├── /v1                      # API CORE - Operadores
│   ├── /users              # Gestión de usuarios SSH
│   ├── /monitor            # Monitoreo básico
│   └── /vps                # Consulta de VPS
│
└── /admin                   # API ADMIN - Superadmin
    ├── /vps                # Gestión completa de VPS
    ├── /backup             # Sistema de backups
    └── /monitor            # Monitoreo avanzado
```

---

## Autenticación

### Login

Obtiene un token JWT para acceder a la API.

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "admin@paneladminssh.com",
  "password": "Mayte2024*#"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "clx...",
      "email": "admin@paneladminssh.com",
      "name": "Administrador",
      "role": "superadmin"
    }
  }
}
```

### Uso del Token

Incluir en todas las peticiones posteriores:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## API Core (v1) - 7 Funciones Esenciales

Estas son las únicas funciones necesarias para operadores del panel.

### 🔵 Función 6: DETALLES DE TODOS LOS USUARIOS

Listar todos los usuarios SSH con información básica.

```http
GET /api/v1/users
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "username": "user001",
      "vpsId": "clx456...",
      "vps": {
        "name": "VPS Miami",
        "host": "192.168.1.100"
      },
      "expiresAt": "2025-02-26T00:00:00Z",
      "isActive": true,
      "isBlocked": false,
      "createdAt": "2025-01-26T12:00:00Z"
    }
  ]
}
```

---

### 🟢 Función 1: NUEVO USUARIO

Crear un nuevo usuario SSH en el VPS seleccionado.

```http
POST /api/v1/users
```

**Request Body:**

```json
{
  "vpsId": "clx456...",
  "username": "user002",
  "password": "SecurePass123",
  "days": 30
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "username": "user002",
    "vpsId": "clx456...",
    "expiresAt": "2025-02-25T12:00:00Z",
    "isActive": true,
    "admrufuData": {
      "ip": "192.168.1.100",
      "username": "user002",
      "token": "ABC123XYZ",
      "expira": "25/02/2025"
    }
  },
  "message": "Usuario creado exitosamente"
}
```

---

### 🟡 Función 3: RENOVAR USUARIO

Renovar la fecha de expiración de un usuario existente.

```http
PUT /api/v1/users/:id/renew
```

**Request Body:**

```json
{
  "days": 30
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "username": "user002",
    "expiresAt": "2025-03-27T12:00:00Z"
  },
  "message": "Usuario renovado exitosamente por 30 días"
}
```

---

### 🔴 Función 4: BLOQUEAR USUARIO

Bloquear temporalmente un usuario SSH.

```http
PUT /api/v1/users/:id/block
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "username": "user002",
    "isBlocked": true
  },
  "message": "Usuario bloqueado exitosamente"
}
```

---

### 🟢 Función 4: DESBLOQUEAR USUARIO

Desbloquear un usuario SSH previamente bloqueado.

```http
PUT /api/v1/users/:id/unblock
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx789...",
    "username": "user002",
    "isBlocked": false
  },
  "message": "Usuario desbloqueado exitosamente"
}
```

---

### 🔴 Función 2: ELIMINAR USUARIO

Eliminar permanentemente un usuario SSH del VPS.

```http
DELETE /api/v1/users/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

---

### 🟣 Función 7: MONITOR DE USUARIOS CONECTADOS

Ver todos los usuarios SSH actualmente conectados en tiempo real.

```http
GET /api/v1/monitor/connections
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx999...",
      "username": "user001",
      "ipAddress": "203.0.113.45",
      "protocol": "SSH",
      "connectedAt": "2025-01-26T10:30:00Z",
      "vps": {
        "name": "VPS Miami",
        "host": "192.168.1.100"
      }
    }
  ]
}
```

---

### Estadísticas Básicas

Resumen simple del dashboard.

```http
GET /api/v1/monitor/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 45,
    "activeUsers": 38,
    "expiredUsers": 7,
    "blockedUsers": 2,
    "currentConnections": 12,
    "totalVPS": 3
  }
}
```

---

### Listar VPS Disponibles

Ver lista de VPS configurados para seleccionar al crear usuarios.

```http
GET /api/v1/vps
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx456...",
      "name": "VPS Miami",
      "host": "192.168.1.100",
      "location": "Miami, FL",
      "status": "online",
      "isActive": true
    }
  ]
}
```

---

## API Admin - Funciones Avanzadas

🔒 **Requiere rol**: `superadmin`

### Gestión Completa de VPS

#### Agregar Nuevo VPS

```http
POST /api/admin/vps
```

**Request Body:**

```json
{
  "name": "VPS Nueva York",
  "host": "192.168.1.200",
  "port": 22,
  "username": "root",
  "password": "RootPass123",
  "location": "Nueva York, NY",
  "provider": "DigitalOcean"
}
```

#### Editar VPS

```http
PUT /api/admin/vps/:id
```

#### Eliminar VPS

```http
DELETE /api/admin/vps/:id
```

---

### Sistema de Backups

#### Listar Backups

```http
GET /api/admin/backup
```

#### Crear Backup

```http
POST /api/admin/backup
```

**Request Body:**

```json
{
  "vpsId": "clx456...",
  "backupType": "full",
  "notes": "Backup mensual"
}
```

#### Restaurar Backup

```http
POST /api/admin/backup/:id/restore
```

---

### Monitoreo Avanzado

#### Historial de Conexiones

```http
GET /api/admin/monitor/history
```

**Query Parameters:**
- `limit` (opcional): Número de registros (default: 100)
- `offset` (opcional): Saltar registros (paginación)
- `vpsId` (opcional): Filtrar por VPS
- `username` (opcional): Filtrar por usuario

#### Logs de Acciones

```http
GET /api/admin/monitor/logs
```

**Query Parameters:**
- `limit` (opcional): Número de registros (default: 100)
- `action` (opcional): Filtrar por tipo de acción
- `status` (opcional): success | error

---

## Códigos de Respuesta

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Petición exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Datos de entrada inválidos |
| 401 | Unauthorized | Token no proporcionado o inválido |
| 403 | Forbidden | Sin permisos para acceder al recurso |
| 404 | Not Found | Recurso no encontrado |
| 429 | Too Many Requests | Límite de peticiones excedido |
| 500 | Internal Server Error | Error del servidor |

---

## Ejemplos de Uso

### JavaScript (Fetch API)

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@paneladminssh.com',
    password: 'Mayte2024*#'
  })
});

const { data } = await loginResponse.json();
const token = data.token;

// 2. Crear usuario
const createUserResponse = await fetch('http://localhost:3001/api/v1/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    vpsId: 'clx456...',
    username: 'newuser',
    password: 'SecurePass123',
    days: 30
  })
});

const user = await createUserResponse.json();
console.log('Usuario creado:', user.data);

// 3. Listar usuarios conectados
const connectionsResponse = await fetch('http://localhost:3001/api/v1/monitor/connections', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const connections = await connectionsResponse.json();
console.log('Usuarios conectados:', connections.data);
```

### cURL

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@paneladminssh.com","password":"Mayte2024*#"}' \
  | jq -r '.data.token')

# Listar usuarios
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN"

# Crear usuario
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vpsId": "clx456...",
    "username": "testuser",
    "password": "Pass123",
    "days": 30
  }'

# Renovar usuario
curl -X PUT http://localhost:3001/api/v1/users/clx789.../renew \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# Bloquear usuario
curl -X PUT http://localhost:3001/api/v1/users/clx789.../block \
  -H "Authorization: Bearer $TOKEN"

# Ver conexiones activas
curl -X GET http://localhost:3001/api/v1/monitor/connections \
  -H "Authorization: Bearer $TOKEN"
```

### Python (requests)

```python
import requests

BASE_URL = "http://localhost:3001/api"

# Login
login_response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@paneladminssh.com",
    "password": "Mayte2024*#"
})
token = login_response.json()["data"]["token"]

headers = {"Authorization": f"Bearer {token}"}

# Listar usuarios
users = requests.get(f"{BASE_URL}/v1/users", headers=headers).json()
print("Usuarios:", users["data"])

# Crear usuario
new_user = requests.post(f"{BASE_URL}/v1/users", headers=headers, json={
    "vpsId": "clx456...",
    "username": "pythonuser",
    "password": "SecurePass123",
    "days": 30
}).json()
print("Usuario creado:", new_user["data"])

# Monitorear conexiones
connections = requests.get(f"{BASE_URL}/v1/monitor/connections", headers=headers).json()
print("Conectados:", connections["data"])
```

---

## Rate Limiting

La API tiene límites de peticiones para prevenir abuso:

- **Ventana**: 15 minutos
- **Máximo de peticiones**: 100

Si excedes el límite, recibirás:

```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

---

## Compatibilidad con Versiones Antiguas

Las rutas legacy (`/api/users`, `/api/monitor`, etc.) se mantienen por compatibilidad, pero se recomienda migrar a:

- **Core**: `/api/v1/*`
- **Admin**: `/api/admin/*`

---

## Soporte

Para reportar problemas o sugerencias:
- GitHub Issues: [tu-repo]/issues
- Email: support@admrufu.com

---

**Versión**: 1.0.0
**Última actualización**: 2025-12-26
