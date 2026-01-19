# Guía de Instalación y Despliegue - Panel Admin SSH

## 📋 Requisitos Previos

### En tu máquina local / servidor del panel:

- **Node.js** 18+ y npm/yarn
- **PostgreSQL** 14+
- **Git** para clonar el repositorio
- Acceso SSH a VPS remotos

### En cada VPS remoto:

- **SSH Server** habilitado y funcionando
- **SSH** habilitado (puerto 22 por defecto)
- **Usuario root** o sudo access
- **Par de claves SSH** configurado

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/mrelkin83/PanelAdminSSH.git
cd PanelAdminSSH
```

### 2. Configurar Base de Datos PostgreSQL

#### Instalar PostgreSQL (si no está instalado)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Descargar desde https://www.postgresql.org/download/windows/

#### Crear base de datos y usuario

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Dentro de psql:
CREATE DATABASE adminssh_panel;
CREATE USER adminssh_user WITH ENCRYPTED PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE adminssh_panel TO adminssh_user;
\q
```

### 3. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus valores
nano .env
```

#### Configurar `.env`:

```env
# Database
DATABASE_URL="postgresql://adminssh_user:tu_password_seguro@localhost:5432/adminssh_panel?schema=public"

# JWT Secret (generar uno aleatorio)
JWT_SECRET="tu-secreto-super-seguro-aleatorio-de-32-caracteres-minimo"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# CORS (URL del frontend)
CORS_ORIGIN="http://localhost:5173"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSH
SSH_TIMEOUT=30000
SSH_KEEPALIVE_INTERVAL=10000

# Logs
LOG_LEVEL=info
```

**Generar JWT_SECRET aleatorio:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Ejecutar migraciones de Prisma

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones (crear tablas)
npx prisma migrate dev --name init

# Verificar con Prisma Studio (opcional)
npx prisma studio
```

#### Crear primer administrador

```bash
# Opción 1: Usar Prisma Studio
npx prisma studio
# Crear un Admin manualmente con password hasheado

# Opción 2: Script de seed (crear este archivo)
```

Crear `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'superadmin',
    },
  });

  console.log('Admin created:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Ejecutar seed:

```bash
npx tsx prisma/seed.ts
```

#### Iniciar servidor backend

```bash
# Modo desarrollo
npm run dev

# El servidor inicia en http://localhost:3001
```

### 4. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env
nano .env
```

#### Configurar `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

#### Iniciar servidor frontend

```bash
# Modo desarrollo
npm run dev

# El frontend inicia en http://localhost:5173
```

### 5. Configurar Acceso SSH a VPS

#### Generar par de claves SSH (si no existe)

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_admrufu -C "panel-admrufu"
```

Esto genera:
- `~/.ssh/vps_admrufu` (clave privada)
- `~/.ssh/vps_admrufu.pub` (clave pública)

#### Copiar clave pública al VPS remoto

```bash
ssh-copy-id -i ~/.ssh/vps_admrufu.pub root@IP_DEL_VPS
```

O manualmente:

```bash
# Copiar contenido de la clave pública
cat ~/.ssh/vps_admrufu.pub

# Conectar al VPS
ssh root@IP_DEL_VPS

# Agregar al archivo authorized_keys
echo "tu-clave-publica-aqui" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### Verificar conexión SSH

```bash
ssh -i ~/.ssh/vps_admrufu root@IP_DEL_VPS
```

#### Verificar que ADMRufu está instalado en el VPS

```bash
# En el VPS
ls -la /etc/ADMRufu
cat /etc/ADMRufu/vercion
```

Si no está instalado, instalar ADMRufu:

```bash
rm -rf install.sh* && wget https://raw.githubusercontent.com/rudi9999/ADMRufu/main/install.sh && chmod 775 install.sh* && ./install.sh* --start
```

### 6. Agregar VPS al Panel

1. Abrir el panel en el navegador: `http://localhost:5173`
2. Login con credenciales creadas:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Ir a **VPS** → **Agregar VPS**
4. Completar formulario:
   - **Nombre**: `VPS Miami 1`
   - **Host**: `192.168.1.100` (IP del VPS)
   - **Puerto**: `22`
   - **Usuario**: `root`
   - **Clave Privada**: Copiar contenido de `~/.ssh/vps_admrufu`

```bash
# Obtener clave privada
cat ~/.ssh/vps_admrufu
```

Copiar todo el contenido incluyendo:
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

5. Click en **Guardar**

El panel automáticamente:
- Probará la conexión SSH
- Verificará que ADMRufu está instalado
- Obtendrá la versión
- Guardará el VPS en la base de datos

### 7. Crear Primer Usuario SSH

1. Ir a **Usuarios SSH** → **Crear Usuario**
2. Seleccionar VPS
3. Completar formulario:
   - **Username**: `usuario1`
   - **Password**: `pass123`
   - **Días de validez**: `30`
   - **Máx. conexiones**: `2` (opcional)
   - **Notas**: `Cliente de prueba`
4. Click en **Crear**

El panel ejecutará en el VPS:

```bash
useradd -M -s /bin/false -e $(date -d "+30 days" +%Y-%m-%d) usuario1
echo "usuario1:pass123" | chpasswd
```

### 8. Verificar Funcionamiento

#### Probar conexión SSH del usuario creado

```bash
# Desde tu máquina o del cliente
ssh usuario1@IP_DEL_VPS
# Password: pass123
```

#### Ver usuarios en el panel

1. Ir a **Usuarios SSH**
2. Deberías ver `usuario1` listado
3. Ver detalles: días restantes, estado, etc.

#### Ver conexiones activas

1. Ir a **Monitor**
2. Seleccionar VPS
3. Ver usuarios conectados en tiempo real

## 📦 Despliegue en Producción

### Opción 1: VPS con PM2

#### 1. Preparar servidor

```bash
# Conectar al servidor de producción
ssh user@tu-servidor.com

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib
```

#### 2. Configurar base de datos

```bash
sudo -u postgres psql
CREATE DATABASE admrufu_panel;
CREATE USER admrufu_user WITH ENCRYPTED PASSWORD 'password_produccion_seguro';
GRANT ALL PRIVILEGES ON DATABASE admrufu_panel TO admrufu_user;
\q
```

#### 3. Clonar y configurar proyecto

```bash
git clone https://github.com/mrelkin83/PanelAdminSSH.git
cd PanelAdminSSH

# Backend
cd backend
npm install --production
cp .env.example .env
nano .env  # Configurar para producción
```

`.env` de producción:

```env
DATABASE_URL="postgresql://admrufu_user:password@localhost:5432/admrufu_panel?schema=public"
JWT_SECRET="secreto-produccion-super-aleatorio"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
CORS_ORIGIN="https://tu-dominio.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SSH_TIMEOUT=30000
LOG_LEVEL=info
```

```bash
# Ejecutar migraciones
npx prisma migrate deploy
npx prisma generate

# Compilar TypeScript
npm run build
```

#### 4. Configurar PM2 para backend

```bash
# Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'admrufu-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Seguir instrucciones para auto-start
```

#### 5. Compilar y servir frontend

```bash
cd ../frontend
npm install
npm run build  # Genera carpeta 'dist'
```

#### 6. Configurar Nginx

```bash
sudo apt install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/admrufu-panel
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Frontend (React build)
    root /home/user/PanelAdminSSH-AMDRufus/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/admrufu-panel /etc/nginx/sites-enabled/

# Test configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### 7. Configurar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática
sudo certbot renew --dry-run
```

### Opción 2: Docker + Docker Compose

#### Crear `Dockerfile` para backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### Crear `Dockerfile` para frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Crear `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: admrufu_panel
      POSTGRES_USER: admrufu_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - admrufu-network

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admrufu_user:${DB_PASSWORD}@db:5432/admrufu_panel
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - db
    networks:
      - admrufu-network

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - admrufu-network

volumes:
  postgres_data:

networks:
  admrufu-network:
    driver: bridge
```

#### Desplegar con Docker Compose

```bash
# Crear archivo .env
cat > .env << 'EOF'
DB_PASSWORD=password_seguro_produccion
JWT_SECRET=secreto_jwt_aleatorio_seguro
EOF

# Construir y levantar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ejecutar migraciones
docker-compose exec backend npx prisma migrate deploy
```

## 🔧 Mantenimiento

### Actualizar aplicación

```bash
# Backend
cd backend
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart admrufu-backend

# Frontend
cd ../frontend
git pull
npm install
npm run build
sudo systemctl reload nginx
```

### Backups de base de datos

```bash
# Backup manual
pg_dump -U admrufu_user admrufu_panel > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U admrufu_user admrufu_panel < backup_20240101.sql

# Backup automático (cron)
crontab -e

# Agregar línea:
0 2 * * * pg_dump -U admrufu_user admrufu_panel > /backups/admrufu_$(date +\%Y\%m\%d).sql
```

### Logs

```bash
# Logs de PM2
pm2 logs admrufu-backend

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de la aplicación
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Monitoreo

```bash
# Ver procesos PM2
pm2 status
pm2 monit

# Ver uso de recursos
htop

# Ver conexiones de base de datos
sudo -u postgres psql admrufu_panel -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🐛 Troubleshooting

### Error: No se puede conectar al VPS vía SSH

**Solución:**
```bash
# Verificar que la clave SSH es correcta
ssh -i clave_privada root@IP_VPS

# Verificar permisos de la clave
chmod 600 clave_privada

# Verificar que el puerto SSH está abierto
telnet IP_VPS 22
```

### Error: ADMRufu no está instalado

**Solución:**
```bash
# Conectar al VPS
ssh root@IP_VPS

# Instalar ADMRufu
rm -rf install.sh* && wget https://raw.githubusercontent.com/rudi9999/ADMRufu/main/install.sh && chmod 775 install.sh* && ./install.sh* --start
```

### Error: Base de datos no conecta

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
cat backend/.env | grep DATABASE_URL

# Probar conexión manual
psql postgresql://user:pass@localhost:5432/dbname
```

### Error: CORS

**Solución:**

Verificar que `CORS_ORIGIN` en `.env` del backend coincide con la URL del frontend.

```env
# Desarrollo
CORS_ORIGIN=http://localhost:5173

# Producción
CORS_ORIGIN=https://tu-dominio.com
```

## ✅ Checklist de Producción

- [ ] PostgreSQL configurado y seguro
- [ ] JWT_SECRET aleatorio y seguro
- [ ] Passwords de admin fuertes
- [ ] SSL/TLS configurado (HTTPS)
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] Backups automáticos de base de datos
- [ ] Logs rotando correctamente
- [ ] PM2 auto-restart configurado
- [ ] Nginx configurado como reverse proxy
- [ ] Variables de entorno de producción
- [ ] NODE_ENV=production
- [ ] Rate limiting activado
- [ ] Monitoreo configurado
- [ ] Dominio apuntando correctamente

## 🎉 ¡Listo!

Tu panel ADMRufu ya está funcionando. Ahora puedes:

1. Agregar todos tus VPS
2. Crear usuarios SSH desde el panel
3. Monitorear conexiones en tiempo real
4. Gestionar renovaciones y bloqueos
5. Hacer backups de usuarios

Para más información técnica, consulta `docs/ARQUITECTURA_TECNICA.md`
