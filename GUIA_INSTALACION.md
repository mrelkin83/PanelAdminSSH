# 🚀 Guía de Instalación - ADMRufu Panel

## Instalación Automática en VPS (Recomendado)

### Requisitos Previos

- **Sistema Operativo**: Ubuntu 20.04 o 22.04
- **Acceso**: SSH con privilegios root o sudo
- **Recursos Mínimos**:
  - RAM: 1GB
  - CPU: 1 core
  - Disco: 10GB libres
  - Puerto: 3001 disponible

### Instalación con un Solo Comando

```bash
curl -sSL https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/install-panel.sh | sudo bash
```

O si tienes el script descargado:

```bash
sudo bash install-panel.sh
```

### ¿Qué hace el instalador?

El script automático realiza las siguientes tareas:

1. ✅ Verifica compatibilidad con Ubuntu 20.04/22.04
2. ✅ Instala Node.js 20.x y dependencias del sistema
3. ✅ Crea usuario dedicado para la aplicación (`admrufu`)
4. ✅ Configura estructura de directorios en `/opt/admrufu-panel`
5. ✅ Instala dependencias de Node.js
6. ✅ Genera claves de seguridad (JWT, Encryption)
7. ✅ Inicializa base de datos SQLite
8. ✅ Crea usuario administrador inicial
9. ✅ Configura servicio systemd para inicio automático
10. ✅ Establece permisos de seguridad
11. ✅ Configura firewall (UFW)
12. ✅ Inicia el servicio automáticamente

### Proceso de Instalación

```bash
# 1. Conectar al VPS
ssh root@tu-vps-ip

# 2. Descargar el instalador
wget https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/install-panel.sh

# 3. Dar permisos de ejecución
chmod +x install-panel.sh

# 4. Ejecutar instalador
sudo ./install-panel.sh
```

### Post-Instalación

Al finalizar la instalación, verás:

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           ✅  INSTALACIÓN EXITOSA                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📊 Información de la instalación:

  🔹 Directorio de instalación: /opt/admrufu-panel
  🔹 Usuario del sistema: admrufu
  🔹 Puerto de la aplicación: 3001
  🔹 Logs de instalación: /var/log/admrufu-panel-install.log
  🔹 Logs de aplicación: /opt/admrufu-panel/logs/

🌐 Acceso al panel:

  URL: http://TU_IP:3001

👤 Credenciales por defecto:

  📧 Email: admin@admrufu.com
  🔑 Password: admin123

⚠️  IMPORTANTE: Cambia la contraseña después del primer login
```

### Primer Acceso

1. Abre tu navegador y ve a `http://TU_IP:3001`
2. Inicia sesión con las credenciales por defecto
3. **CAMBIA LA CONTRASEÑA INMEDIATAMENTE**

## Comandos Útiles

### Gestión del Servicio

```bash
# Ver estado del servicio
systemctl status admrufu-panel

# Iniciar servicio
systemctl start admrufu-panel

# Detener servicio
systemctl stop admrufu-panel

# Reiniciar servicio
systemctl restart admrufu-panel

# Ver logs en tiempo real
journalctl -u admrufu-panel -f

# Ver últimas 100 líneas de logs
journalctl -u admrufu-panel -n 100
```

### Gestión de Base de Datos

```bash
# Entrar al directorio del backend
cd /opt/admrufu-panel/backend

# Abrir Prisma Studio (interfaz web para DB)
npx prisma studio

# Ver migraciones aplicadas
npx prisma migrate status

# Resetear base de datos (⚠️ CUIDADO: borra todo)
npx prisma migrate reset
```

### Backup y Restauración

```bash
# Backup manual de base de datos
cp /opt/admrufu-panel/backend/prisma/dev.db /opt/admrufu-panel/backups/backup-$(date +%Y%m%d).db

# Backup de configuración
cp /opt/admrufu-panel/backend/.env /opt/admrufu-panel/backups/.env-$(date +%Y%m%d)

# Restaurar base de datos
systemctl stop admrufu-panel
cp /opt/admrufu-panel/backups/backup-20250126.db /opt/admrufu-panel/backend/prisma/dev.db
systemctl start admrufu-panel
```

## Instalación Manual (Desarrollo Local)

Si prefieres instalar manualmente en tu equipo local:

### 1. Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus configuraciones
nano .env

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Crear usuario admin inicial
npx tsx prisma/seed.ts

# Iniciar en modo desarrollo
npm run dev
```

### 3. Variables de Entorno Importantes

Edita el archivo `.env` y configura:

```env
# Database (SQLite para desarrollo)
DATABASE_URL="file:./dev.db"

# JWT Secret (generar con: openssl rand -hex 32)
JWT_SECRET="tu-secreto-jwt-super-seguro-aleatorio"
JWT_EXPIRES_IN="7d"

# Encryption Key (generar con: openssl rand -hex 32)
ENCRYPTION_KEY="tu-clave-de-encriptacion-de-32-bytes-en-hex"

# Server
PORT=3001
NODE_ENV=development

# CORS (frontend)
CORS_ORIGIN="http://localhost:5173"
```

### 4. Generar Claves Seguras

```bash
# Generar JWT_SECRET
openssl rand -hex 32

# Generar ENCRYPTION_KEY
openssl rand -hex 32
```

## Actualización del Panel

Para actualizar el panel a una nueva versión:

```bash
# Detener servicio
systemctl stop admrufu-panel

# Backup de base de datos
cp /opt/admrufu-panel/backend/prisma/dev.db /opt/admrufu-panel/backups/backup-pre-update.db

# Backup de configuración
cp /opt/admrufu-panel/backend/.env /opt/admrufu-panel/backups/.env-pre-update

# Actualizar archivos (método depende de cómo obtengas las actualizaciones)
cd /opt/admrufu-panel
# git pull origin main  # Si usas Git
# o copiar archivos nuevos manualmente

# Instalar nuevas dependencias
cd backend
npm install

# Ejecutar nuevas migraciones
npx prisma migrate deploy

# Reconstruir aplicación
npm run build

# Reiniciar servicio
systemctl start admrufu-panel
```

## Solución de Problemas

### El servicio no inicia

```bash
# Ver logs detallados
journalctl -u admrufu-panel -n 100 --no-pager

# Verificar estado
systemctl status admrufu-panel

# Verificar puerto en uso
netstat -tulpn | grep 3001

# Verificar permisos
ls -la /opt/admrufu-panel/backend/.env
ls -la /opt/admrufu-panel/backend/prisma/dev.db
```

### Error de base de datos

```bash
# Regenerar cliente Prisma
cd /opt/admrufu-panel/backend
npx prisma generate

# Verificar migraciones
npx prisma migrate status

# Aplicar migraciones pendientes
npx prisma migrate deploy
```

### Error de permisos

```bash
# Corregir permisos
chown -R admrufu:admrufu /opt/admrufu-panel
chmod 750 /opt/admrufu-panel
chmod 640 /opt/admrufu-panel/backend/.env
```

### Reinstalación completa

```bash
# Detener y deshabilitar servicio
systemctl stop admrufu-panel
systemctl disable admrufu-panel

# Eliminar archivos
rm -rf /opt/admrufu-panel
rm /etc/systemd/system/admrufu-panel.service

# Eliminar usuario (opcional)
userdel -r admrufu

# Ejecutar instalador nuevamente
./install-panel.sh
```

## Desinstalación

Para desinstalar completamente el panel:

```bash
# Detener servicio
systemctl stop admrufu-panel
systemctl disable admrufu-panel

# Eliminar servicio systemd
rm /etc/systemd/system/admrufu-panel.service
systemctl daemon-reload

# Eliminar archivos de aplicación
rm -rf /opt/admrufu-panel

# Eliminar usuario del sistema
userdel -r admrufu

# Eliminar logs de instalación
rm /var/log/admrufu-panel-install.log

# Eliminar regla de firewall (si se configuró)
ufw delete allow 3001/tcp
```

## Configuración de Producción

### Usar Nginx como Reverse Proxy (Recomendado)

```bash
# Instalar Nginx
apt install nginx

# Crear configuración
nano /etc/nginx/sites-available/admrufu-panel
```

Contenido de la configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
ln -s /etc/nginx/sites-available/admrufu-panel /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### SSL con Let's Encrypt

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx

# Obtener certificado
certbot --nginx -d tu-dominio.com

# Renovación automática ya está configurada
```

## Soporte

Si encuentras problemas durante la instalación:

1. Revisa los logs: `/var/log/admrufu-panel-install.log`
2. Verifica los logs de la aplicación: `journalctl -u admrufu-panel -n 100`
3. Consulta la documentación completa
4. Abre un issue en GitHub

---

**Versión**: 1.0.0
**Última actualización**: 2025-12-26
