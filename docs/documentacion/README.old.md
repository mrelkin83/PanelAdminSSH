# Panel Administrativo ADMRufu SSH

Panel web para administrar cuentas SSH en múltiples VPS con ADMRufu instalado.

## 🎯 Características

- ✅ Gestión de múltiples VPS remotos vía SSH
- ✅ Crear, renovar, eliminar usuarios SSH
- ✅ Bloquear/desbloquear usuarios
- ✅ Monitor de conexiones en tiempo real
- ✅ Backup y restauración de usuarios
- ✅ Sistema de logs detallado
- ✅ Autenticación JWT para administradores
- ✅ Arquitectura escalable (listo para SaaS)

## 🏗️ Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend    │ ◄─────► │  PostgreSQL │
│ React + TS  │  REST   │ Express + TS │         │             │
└─────────────┘  API    └──────────────┘         └─────────────┘
                              │
                              │ SSH (ssh2)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                ┌───▼───┐         ┌─────▼────┐
                │ VPS 1 │         │  VPS N   │
                │ADMRufu│   ...   │ ADMRufu  │
                └───────┘         └──────────┘
```

## 📁 Estructura del Proyecto

```
PanelAdminSSH-AMDRufus/
├── backend/                # Backend Node.js + TypeScript
│   ├── src/
│   │   ├── config/        # Configuraciones
│   │   ├── controllers/   # Controladores REST
│   │   ├── services/      # Lógica de negocio
│   │   ├── models/        # Modelos de datos
│   │   ├── middlewares/   # Middlewares Express
│   │   ├── utils/         # Utilidades
│   │   └── types/         # TypeScript types
│   ├── prisma/            # Schema y migraciones
│   └── package.json
├── frontend/              # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   ├── services/      # Servicios API
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # Estilos
│   └── package.json
├── docs/                  # Documentación
└── scripts/               # Scripts de utilidad
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ y npm/yarn
- PostgreSQL 14+
- VPS con ADMRufu instalado
- Clave SSH privada para acceso a VPS

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno en .env
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Configurar API URL en .env
npm run dev
```

## 🔧 Configuración

### Variables de Entorno (Backend)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/admrufu_panel"
JWT_SECRET="tu-secreto-super-seguro"
PORT=3001
NODE_ENV=development
```

### Agregar VPS

1. Generar par de claves SSH si no existe:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_admrufu
```

2. Copiar clave pública al VPS:
```bash
ssh-copy-id -i ~/.ssh/vps_admrufu.pub root@IP_VPS
```

3. Guardar clave privada en formato base64 en la DB

## 📝 Comandos ADMRufu Ejecutados

El panel ejecuta estos comandos en el VPS remoto:

### Gestión de Usuarios SSH

```bash
# Crear usuario
/etc/ADMRufu/sbin/userSSH -create <username> <password> <days>

# Renovar usuario
/etc/ADMRufu/sbin/userSSH -renew <username> <days>

# Eliminar usuario
/etc/ADMRufu/sbin/userSSH -delete <username>

# Bloquear usuario
/etc/ADMRufu/sbin/userSSH -block <username>

# Desbloquear usuario
/etc/ADMRufu/sbin/userSSH -unblock <username>

# Listar usuarios
/etc/ADMRufu/sbin/userSSH -list

# Info de usuario
/etc/ADMRufu/sbin/userSSH -info <username>

# Usuarios conectados
/etc/ADMRufu/sbin/online
```

## 🔐 Seguridad

- ✅ Autenticación JWT con expiración
- ✅ Claves SSH privadas encriptadas en DB
- ✅ CORS configurado correctamente
- ✅ Rate limiting en API
- ✅ Validación de inputs
- ✅ Logs de todas las acciones

## 📊 Base de Datos

### Modelos Principales

- **Admin**: Administradores del panel
- **VPS**: Servidores remotos
- **SSHUser**: Usuarios SSH creados
- **Connection**: Conexiones activas
- **ActionLog**: Log de acciones
- **Backup**: Respaldos de usuarios

## 🛠️ API Endpoints

### Autenticación
- `POST /api/auth/login` - Login admin
- `POST /api/auth/register` - Registro admin (solo si está habilitado)

### VPS
- `GET /api/vps` - Listar VPS
- `POST /api/vps` - Agregar VPS
- `DELETE /api/vps/:id` - Eliminar VPS
- `GET /api/vps/:id/status` - Estado VPS

### Usuarios SSH
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id/renew` - Renovar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `PUT /api/users/:id/block` - Bloquear usuario
- `PUT /api/users/:id/unblock` - Desbloquear usuario
- `GET /api/users/:id` - Detalle usuario

### Monitor
- `GET /api/monitor/connections` - Usuarios conectados
- `GET /api/monitor/stats` - Estadísticas generales

### Backup
- `POST /api/backup/create` - Crear backup
- `POST /api/backup/restore/:id` - Restaurar backup
- `GET /api/backup` - Listar backups

## 🚀 Producción

### Docker (Próximamente)

```bash
docker-compose up -d
```

### Deploy Manual

1. Compilar frontend:
```bash
cd frontend && npm run build
```

2. Compilar backend:
```bash
cd backend && npm run build
```

3. Configurar Nginx como reverse proxy
4. Configurar PM2 para el backend
5. Configurar variables de entorno de producción

## 📞 Soporte

Para issues o preguntas, abrir un issue en GitHub.

## 📄 Licencia

MIT License
