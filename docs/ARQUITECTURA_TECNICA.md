# Arquitectura Técnica - Panel ADMRufu SSH

## Visión General

Este panel administrativo permite gestionar usuarios SSH en múltiples VPS remotos que tienen instalado el script **ADMRufu**, sin modificar el script original. La comunicación es exclusivamente vía SSH usando claves privadas.

## 📐 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Dashboard | VPS | Users | Monitor | Backup             │   │
│  │                                                           │   │
│  │  React Router | React Query | Zustand | Axios           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP REST API
                          │ JSON + JWT
┌─────────────────────────▼───────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Auth API   │  │   VPS API    │  │  Users API   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  ┌──────▼─────────────────▼──────────────────▼───────┐          │
│  │              SSH Service (ssh2)                    │          │
│  │  - executeCommand()                                │          │
│  │  - createSSHUser()                                 │          │
│  │  - renewSSHUser()                                  │          │
│  │  - deleteSSHUser()                                 │          │
│  │  - listSSHUsers()                                  │          │
│  │  - getConnectedUsers()                             │          │
│  └────────────────────────────────────────────────────┘          │
└─────────────┬──────────────────┬────────────────────────────────┘
              │                  │
              │ Prisma ORM       │ SSH Connections (Port 22)
              │                  │ Private Key Authentication
┌─────────────▼──────────┐      │
│   PostgreSQL Database  │      │
│   ┌──────────────────┐ │      │
│   │ - Admins         │ │      │
│   │ - VPS            │ │      │
│   │ - SSHUsers       │ │      │
│   │ - Connections    │ │      │
│   │ - ActionLogs     │ │      │
│   │ - Backups        │ │      │
│   └──────────────────┘ │      │
└────────────────────────┘      │
                                │
                 ┌──────────────▼──────────────┐
                 │      VPS 1 (Remote)         │
                 │  ┌──────────────────────┐   │
                 │  │   ADMRufu Installed  │   │
                 │  │   /etc/ADMRufu/      │   │
                 │  │   - userSSH          │   │
                 │  │   - userHWID         │   │
                 │  │   - userTOKEN        │   │
                 │  └──────────────────────┘   │
                 └─────────────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │      VPS N (Remote)         │
                 │  ┌──────────────────────┐   │
                 │  │   ADMRufu Installed  │   │
                 │  └──────────────────────┘   │
                 └─────────────────────────────┘
```

## 🔐 Flujo de Autenticación

### 1. Login de Administrador

```typescript
// Frontend: Login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}

// Backend: Verifica credenciales
1. Buscar admin en DB
2. Comparar password hash (bcrypt)
3. Generar JWT token
4. Retornar token + datos admin

// Frontend: Guarda token
localStorage.setItem('token', token)
```

### 2. Autenticación de Peticiones

```typescript
// Todas las peticiones incluyen:
Authorization: Bearer <JWT_TOKEN>

// Backend middleware verifica:
1. Token presente en header
2. Token válido (firma JWT)
3. Token no expirado
4. Adjunta user al request
```

## 🖥️ Flujo de Gestión SSH

### Agregar VPS

```typescript
// Frontend
POST /api/vps
{
  "name": "VPS Miami 1",
  "host": "192.168.1.100",
  "port": 22,
  "username": "root",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "location": "Miami, USA",
  "provider": "DigitalOcean"
}

// Backend proceso:
1. Validar datos de entrada
2. Encriptar clave privada (AES-256-CBC)
3. Probar conexión SSH
4. Verificar ADMRufu instalado
5. Obtener versión de ADMRufu
6. Guardar en base de datos
7. Registrar acción en logs
```

### Crear Usuario SSH

```typescript
// Frontend
POST /api/users
{
  "vpsId": "clx123...",
  "username": "usuario1",
  "password": "pass123",
  "days": 30,
  "maxConnections": 2,
  "notes": "Cliente premium"
}

// Backend proceso:
1. Validar datos
2. Obtener VPS de DB
3. Desencriptar clave privada
4. Conectar vía SSH al VPS
5. Ejecutar comandos de creación:
   ```bash
   # Crear usuario con fecha de expiración
   useradd -M -s /bin/false -e $(date -d "+30 days" +%Y-%m-%d) usuario1

   # Establecer password
   echo "usuario1:pass123" | chpasswd
   ```
6. Verificar resultado
7. Guardar usuario en DB (password encriptado)
8. Registrar acción en logs
9. Retornar éxito/error
```

### Renovar Usuario SSH

```typescript
// Frontend
PUT /api/users/:id/renew
{
  "days": 30
}

// Backend ejecuta en VPS:
```bash
# Extender fecha de expiración
chage -E $(date -d "+30 days" +%Y-%m-%d) usuario1
```

// Actualiza DB y registra log
```

### Bloquear Usuario

```typescript
// Backend ejecuta en VPS:
```bash
# Bloquear password
passwd -l usuario1
```

// Actualiza isBlocked=true en DB
```

### Desbloquear Usuario

```typescript
// Backend ejecuta en VPS:
```bash
# Desbloquear password
passwd -u usuario1
```

// Actualiza isBlocked=false en DB
```

### Eliminar Usuario

```typescript
// Backend ejecuta en VPS:
```bash
# Eliminar usuario del sistema
userdel usuario1
```

// Elimina de DB y registra log
```

### Listar Usuarios SSH

```typescript
// Backend ejecuta en VPS:
```bash
# Obtener usuarios del sistema (UID >= 1000)
awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | while read user; do
  # Obtener fecha de expiración
  expiry=$(chage -l $user 2>/dev/null | grep "Account expires" | cut -d: -f2 | xargs)

  # Verificar si está bloqueado
  locked=$(passwd -S $user 2>/dev/null | awk '{print $2}')

  echo "$user|$expiry|$locked"
done
```

// Parsea output y retorna JSON
```

### Monitor de Conexiones

```typescript
// Backend ejecuta en VPS:
```bash
# Listar usuarios conectados actualmente
w -h | awk '{print $1"|"$3"|"$4}' | sort -u
```

// Output ejemplo:
usuario1|192.168.1.50|10:30
usuario2|192.168.1.51|11:45

// Guarda en tabla connections y retorna
```

## 📦 Modelo de Datos

### Admin (Administradores del Panel)

```typescript
{
  id: string (cuid)
  email: string (unique)
  password: string (bcrypt hash)
  name: string
  role: "admin" | "superadmin"
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### VPS (Servidores Remotos)

```typescript
{
  id: string (cuid)
  name: string
  host: string (IP o dominio)
  port: number (default 22)
  username: string (default "root")
  privateKey: string (AES-256 encrypted)
  location?: string
  provider?: string
  isActive: boolean
  status: "online" | "offline" | "error" | "unknown"
  version?: string (ADMRufu version)
  lastCheckAt?: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}
```

### SSHUser (Usuarios SSH Creados)

```typescript
{
  id: string (cuid)
  vpsId: string (FK -> VPS)
  username: string
  password: string (AES-256 encrypted)
  expiresAt: DateTime
  isBlocked: boolean
  isActive: boolean
  maxConnections?: number
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}

// Unique constraint: (vpsId, username)
```

### Connection (Conexiones Activas)

```typescript
{
  id: string (cuid)
  vpsId: string (FK -> VPS)
  sshUserId?: string (FK -> SSHUser)
  username: string
  ipAddress: string
  protocol?: string (SSH, OpenVPN, V2Ray, etc)
  connectedAt: DateTime
  disconnectedAt?: DateTime
  bytesIn?: bigint
  bytesOut?: bigint
}
```

### ActionLog (Logs de Acciones)

```typescript
{
  id: string (cuid)
  adminId?: string (FK -> Admin)
  vpsId?: string (FK -> VPS)
  sshUserId?: string (FK -> SSHUser)
  action: string (create_user, delete_user, renew_user, etc)
  status: "success" | "error"
  details?: string (JSON)
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  createdAt: DateTime
}
```

### Backup (Respaldos de Usuarios)

```typescript
{
  id: string (cuid)
  vpsId: string (FK -> VPS)
  sshUserId?: string (FK -> SSHUser)
  adminId: string (FK -> Admin)
  backupData: string (JSON serializado)
  backupType: "full" | "single_user"
  notes?: string
  createdAt: DateTime
  restoredAt?: DateTime
}
```

## 🔒 Seguridad

### Encriptación de Datos Sensibles

```typescript
// Claves privadas SSH y passwords se encriptan con AES-256-CBC
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Passwords de Admins

```typescript
// Bcrypt con salt rounds = 10
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### JWT Tokens

```typescript
import jwt from 'jsonwebtoken';

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d' // 7 días
  });
}

function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET);
}
```

### Rate Limiting

```typescript
// Limitar peticiones por IP
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 peticiones
});

app.use('/api', limiter);
```

### CORS

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN, // Solo frontend autorizado
  credentials: true
}));
```

## 📡 Comunicación SSH

### Biblioteca: ssh2

```typescript
import { Client } from 'ssh2';

async function executeCommand(
  sshConfig: SSHConfig,
  command: string
): Promise<SSHCommandResult> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code) => {
          conn.end();
          resolve({
            success: code === 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      privateKey: sshConfig.privateKey,
      timeout: 30000,
      keepaliveInterval: 10000
    });
  });
}
```

### Comandos SSH Ejecutados

#### Verificar ADMRufu Instalado

```bash
test -d /etc/ADMRufu && echo "installed" || echo "not_installed"
```

#### Obtener Versión ADMRufu

```bash
cat /etc/ADMRufu/vercion 2>/dev/null || echo "unknown"
```

#### Crear Usuario SSH

```bash
useradd -M -s /bin/false -e $(date -d "+30 days" +%Y-%m-%d) usuario1 &&
echo "usuario1:pass123" | chpasswd &&
echo "Usuario usuario1 creado exitosamente"
```

#### Renovar Usuario

```bash
chage -E $(date -d "+30 days" +%Y-%m-%d) usuario1 &&
echo "Usuario usuario1 renovado por 30 días"
```

#### Bloquear Usuario

```bash
passwd -l usuario1 &&
echo "Usuario usuario1 bloqueado"
```

#### Desbloquear Usuario

```bash
passwd -u usuario1 &&
echo "Usuario usuario1 desbloqueado"
```

#### Eliminar Usuario

```bash
userdel usuario1 &&
echo "Usuario usuario1 eliminado exitosamente"
```

#### Listar Usuarios

```bash
awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | while read user; do
  expiry=$(chage -l $user 2>/dev/null | grep "Account expires" | cut -d: -f2 | xargs)
  locked=$(passwd -S $user 2>/dev/null | awk '{print $2}')
  echo "$user|$expiry|$locked"
done
```

#### Obtener Info de Usuario

```bash
if id "usuario1" &>/dev/null; then
  expiry=$(chage -l usuario1 2>/dev/null | grep "Account expires" | cut -d: -f2 | xargs)
  locked=$(passwd -S usuario1 2>/dev/null | awk '{print $2}')
  echo "$expiry|$locked"
else
  echo "USER_NOT_FOUND"
fi
```

#### Usuarios Conectados

```bash
w -h | awk '{print $1"|"$3"|"$4}' | sort -u
```

#### Estadísticas del Sistema

```bash
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')"
echo "MEM: $(free | grep Mem | awk '{print ($3/$2) * 100.0}')"
echo "DISK: $(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')"
echo "USERS: $(awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | wc -l)"
```

## 🚀 Escalabilidad (SaaS)

### Arquitectura Multi-Tenant

Para convertir esto en SaaS:

1. **Modelo de Organización**
```typescript
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      String   // free, pro, enterprise
  maxVPS    Int      @default(5)
  maxUsers  Int      @default(50)
  createdAt DateTime @default(now())

  admins    Admin[]
  vps       VPS[]
}
```

2. **Multi-tenancy en API**
```typescript
// Middleware para filtrar por organización
app.use((req, res, next) => {
  req.organizationId = req.user.organizationId;
  next();
});

// Todas las queries filtran por org
const vps = await prisma.vPS.findMany({
  where: { organizationId: req.organizationId }
});
```

3. **Planes y Límites**
```typescript
// Verificar límites antes de crear recursos
if (organization.vps.length >= organization.maxVPS) {
  throw new Error('VPS limit reached. Upgrade your plan.');
}
```

4. **Billing Integration**
- Stripe para pagos
- Webhooks para activar/desactivar cuentas
- Métricas de uso por organización

## 📊 Monitoreo y Logs

### Winston Logger

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('User created', { username, vpsId });
logger.error('SSH connection failed', { error, vpsId });
```

### Logs en Base de Datos

Todas las acciones se registran en `ActionLog`:

```typescript
await prisma.actionLog.create({
  data: {
    adminId: req.user.id,
    vpsId: vps.id,
    sshUserId: user.id,
    action: 'create_user',
    status: 'success',
    details: JSON.stringify({ username, days }),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  }
});
```

## 🔄 Flujo de Datos Completo

### Ejemplo: Crear Usuario SSH

1. **Frontend**: Usuario completa formulario
2. **Frontend**: Valida datos localmente
3. **Frontend**: POST /api/users con datos + token JWT
4. **Backend**: Middleware verifica JWT
5. **Backend**: Valida datos (express-validator)
6. **Backend**: Busca VPS en DB
7. **Backend**: Desencripta clave privada SSH
8. **Backend**: Conecta a VPS vía SSH (ssh2)
9. **VPS Remote**: Ejecuta comando `useradd`
10. **VPS Remote**: Ejecuta comando `chpasswd`
11. **VPS Remote**: Retorna stdout/stderr
12. **Backend**: Verifica éxito del comando
13. **Backend**: Encripta password del usuario
14. **Backend**: Guarda usuario en DB (Prisma)
15. **Backend**: Registra acción en ActionLog
16. **Backend**: Retorna respuesta JSON
17. **Frontend**: Muestra notificación de éxito
18. **Frontend**: Actualiza lista de usuarios

## 🎯 Mejores Prácticas Implementadas

✅ Separación de responsabilidades (controllers, services, models)
✅ Validación de inputs en frontend y backend
✅ Manejo de errores centralizado
✅ Logging completo de acciones
✅ Encriptación de datos sensibles
✅ Autenticación JWT stateless
✅ Rate limiting para prevenir abuso
✅ Conexiones SSH con timeout
✅ Transacciones de base de datos
✅ Código TypeScript type-safe
✅ RESTful API design
✅ CORS configurado correctamente

## 📈 Próximas Mejoras

- [ ] WebSockets para notificaciones en tiempo real
- [ ] Caché con Redis para mejor performance
- [ ] Tests unitarios y de integración
- [ ] CI/CD con GitHub Actions
- [ ] Docker y Docker Compose
- [ ] Kubernetes para escalado horizontal
- [ ] Monitoreo con Prometheus + Grafana
- [ ] Alertas automáticas (email/telegram)
- [ ] Audit log completo
- [ ] 2FA para administradores
