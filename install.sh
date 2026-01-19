#!/bin/bash

#####################################
# Panel AdminSSH - Script de Instalación
# by @MrELkin | +573124132002
# Versión: 1.0
#####################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}[Panel AdminSSH]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Banner
clear
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║           Panel AdminSSH - Instalador v1.0             ║"
echo "║                                                       ║"
echo "║              by @MrELkin | +573124132002              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi

print_message "Iniciando instalación de Panel AdminSSH..."
sleep 2

# 1. Actualizar sistema
print_message "Paso 1/10: Actualizando sistema..."
apt-get update -qq > /dev/null 2>&1
print_success "Sistema actualizado"

# 2. Instalar dependencias básicas
print_message "Paso 2/10: Instalando dependencias básicas..."
apt-get install -y curl git wget build-essential -qq > /dev/null 2>&1
print_success "Dependencias básicas instaladas"

# 3. Instalar Node.js 20.x
print_message "Paso 3/10: Instalando Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq > /dev/null 2>&1
    print_success "Node.js $(node --version) instalado"
else
    print_success "Node.js ya está instalado ($(node --version))"
fi

# 4. Instalar PostgreSQL
print_message "Paso 4/10: Instalando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib -qq > /dev/null 2>&1
    systemctl start postgresql
    systemctl enable postgresql
    print_success "PostgreSQL instalado y en ejecución"
else
    print_success "PostgreSQL ya está instalado"
fi

# 5. Configurar base de datos
print_message "Paso 5/10: Configurando base de datos..."
DB_NAME="paneladminssh"
DB_USER="adminssh"
DB_PASS="AdminSSH2024Pass"

# Eliminar base de datos y usuario si ya existen
print_message "Limpiando base de datos anterior si existe..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};" 2>/dev/null || true

# Crear base de datos y usuario nuevos
print_message "Creando base de datos y usuario..."
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};"

print_success "Base de datos configurada"

# 6. Clonar repositorio
print_message "Paso 6/10: Clonando repositorio..."
INSTALL_DIR="/opt/panel-adminssh"

if [ -d "$INSTALL_DIR" ]; then
    print_warning "Directorio ya existe. Haciendo backup..."
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d%H%M%S)"
fi

git clone https://github.com/mrelkin83/PanelAdminSSH.git "$INSTALL_DIR" > /dev/null 2>&1
cd "$INSTALL_DIR"
print_success "Repositorio clonado"

# 7. Configurar Backend
print_message "Paso 7/10: Configurando backend..."
cd "$INSTALL_DIR/backend"

# Usar credenciales por defecto
ADMIN_EMAIL="admin@paneladminssh.com"
ADMIN_PASSWORD="Mayte2024*#"
ADMIN_NAME="Administrador"
print_success "Credenciales configuradas"

# Crear archivo .env
cat > .env << EOF
# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

# JWT
JWT_SECRET="$(openssl rand -base64 32)"

# Encryption
ENCRYPTION_KEY="$(openssl rand -hex 32)"

# Server
PORT=5000
NODE_ENV=production

# Logs
LOG_LEVEL=info

# CORS (permitir todos los orígenes para desarrollo local)
CORS_ORIGIN=*

# Admin credentials (for seed)
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ADMIN_NAME="${ADMIN_NAME}"
EOF

# Instalar dependencias (incluyendo devDependencies para tsx)
print_message "Instalando dependencias del backend..."
npm install --include=dev

print_message "Generando Prisma Client..."
npx prisma generate

print_message "Sincronizando base de datos..."
npx prisma db push --accept-data-loss

# Crear usuario admin con seed
print_message "Creando usuario administrador..."
npx prisma db seed

# Compilar backend para producción
print_message "Compilando backend..."
npm run build

print_success "Backend configurado"

# 8. Configurar dominios
print_message "Paso 8/11: Configurando dominios..."
echo
print_message "════════════════════════════════════════════════════════"
print_message "  CONFIGURACIÓN DE SUBDOMINIOS"
print_message "════════════════════════════════════════════════════════"
echo
print_message "Si tienes subdominios configurados, ingrésalos aquí."
print_message "Si no, presiona Enter para usar localhost (solo IP:puerto)"
echo

print_message "Subdominio para el BACKEND API (ej: api.tudominio.com):"
read -p "> " BACKEND_DOMAIN

print_message "Subdominio para el FRONTEND Panel (ej: panel.tudominio.com):"
read -p "> " FRONTEND_DOMAIN

# Usar localhost si no se ingresó nada
BACKEND_DOMAIN=${BACKEND_DOMAIN:-localhost}
FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-localhost}

# Determinar protocolo (http o https)
if [ "$BACKEND_DOMAIN" != "localhost" ]; then
    BACKEND_PROTOCOL="https"
else
    BACKEND_PROTOCOL="http"
fi

if [ "$FRONTEND_DOMAIN" != "localhost" ]; then
    FRONTEND_PROTOCOL="https"
else
    FRONTEND_PROTOCOL="http"
fi

# Inicializar variable SSL
INSTALL_SSL="n"

print_success "Dominios configurados"

# 9. Configurar Frontend
print_message "Paso 9/11: Configurando frontend..."
cd "$INSTALL_DIR/frontend"

# Crear archivo .env con el dominio del backend
cat > .env << EOF
VITE_API_BASE_URL=${BACKEND_PROTOCOL}://${BACKEND_DOMAIN}/api
VITE_API_URL=${BACKEND_PROTOCOL}://${BACKEND_DOMAIN}/api/v1
EOF

# Actualizar vite.config.ts para permitir hosts personalizados
print_message "Configurando hosts permitidos en Vite..."
if [ -f "vite.config.ts" ]; then
    # Crear lista de hosts permitidos
    ALLOWED_HOSTS="'localhost'"
    [ "$FRONTEND_DOMAIN" != "localhost" ] && ALLOWED_HOSTS="${ALLOWED_HOSTS}, '${FRONTEND_DOMAIN}', '.${FRONTEND_DOMAIN#*.}'"

    # Actualizar vite.config.ts
    sed -i "/preview: {/,/},/c\\
  preview: {\n\
    host: '0.0.0.0',\n\
    port: 3000,\n\
    strictPort: true,\n\
    allowedHosts: [${ALLOWED_HOSTS}],\n\
  }," vite.config.ts

    print_success "Hosts permitidos configurados"
fi

print_message "Instalando dependencias del frontend..."
npm install

print_message "Compilando frontend..."
npm run build

print_success "Frontend configurado"

# 10. Crear servicios systemd
print_message "Paso 10/11: Creando servicios systemd..."

# Servicio Backend
cat > /etc/systemd/system/adminssh-backend.service << EOF
[Unit]
Description=Panel AdminSSH Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Servicio Frontend
cat > /etc/systemd/system/adminssh-frontend.service << EOF
[Unit]
Description=Panel AdminSSH Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=/usr/bin/npm run preview -- --port 3000 --host 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable adminssh-backend adminssh-frontend
systemctl start adminssh-backend adminssh-frontend

print_success "Servicios systemd creados y activados"

# 11. Configurar Nginx
print_message "Paso 11/11: Configurando Nginx..."
apt-get install -y nginx

# Configuración del Backend
cat > /etc/nginx/sites-available/adminssh-backend << EOF
server {
    listen 80;
    server_name ${BACKEND_DOMAIN};

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Configuración del Frontend
cat > /etc/nginx/sites-available/adminssh-frontend << EOF
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activar configuraciones
ln -sf /etc/nginx/sites-available/adminssh-backend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/adminssh-frontend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
print_message "Verificando configuración de Nginx..."
nginx -t

print_message "Reiniciando Nginx..."
systemctl restart nginx
print_success "Nginx configurado"

# Configurar SSL si se usan dominios reales
if [ "$BACKEND_DOMAIN" != "localhost" ] && [ "$FRONTEND_DOMAIN" != "localhost" ]; then
    echo
    print_message "════════════════════════════════════════════════════════"
    print_message "  CONFIGURACIÓN SSL/HTTPS"
    print_message "════════════════════════════════════════════════════════"
    echo
    print_warning "IMPORTANTE: Los registros DNS deben estar configurados y propagados"
    print_message "¿Deseas instalar certificados SSL con Let's Encrypt? (s/n)"
    read -p "> " INSTALL_SSL

    if [ "$INSTALL_SSL" = "s" ] || [ "$INSTALL_SSL" = "S" ]; then
        print_message "Instalando Certbot..."
        apt-get install -y certbot python3-certbot-nginx -qq > /dev/null 2>&1

        print_message "Solicitando certificados SSL..."
        certbot --nginx -d ${BACKEND_DOMAIN} -d ${FRONTEND_DOMAIN} --non-interactive --agree-tos --redirect --email noreply@${BACKEND_DOMAIN#*.} || {
            print_warning "No se pudo configurar SSL automáticamente."
            print_message "Esto puede deberse a:"
            print_message "  1. Los DNS no están configurados correctamente"
            print_message "  2. Los DNS no se han propagado aún"
            print_message "Puedes configurar SSL manualmente después con:"
            print_message "  certbot --nginx -d ${BACKEND_DOMAIN} -d ${FRONTEND_DOMAIN}"
        }

        # Configurar renovación automática
        systemctl enable certbot.timer > /dev/null 2>&1

        print_success "Configuración SSL completada"
    else
        print_message "SSL omitido. Puedes configurarlo después con:"
        print_message "  certbot --nginx -d ${BACKEND_DOMAIN} -d ${FRONTEND_DOMAIN}"
    fi
else
    INSTALL_SSL="n"
fi

# Resumen
echo
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║         ✓ Panel AdminSSH Instalado Exitosamente        ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo
print_success "Instalación completada!"
echo
echo -e "${BLUE}Información de acceso:${NC}"
if [ "$FRONTEND_DOMAIN" != "localhost" ]; then
    echo -e "  URL Frontend: ${GREEN}${FRONTEND_PROTOCOL}://${FRONTEND_DOMAIN}${NC}"
else
    echo -e "  URL Frontend: ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
fi

if [ "$BACKEND_DOMAIN" != "localhost" ]; then
    echo -e "  URL Backend:  ${GREEN}${BACKEND_PROTOCOL}://${BACKEND_DOMAIN}${NC}"
else
    echo -e "  URL Backend:  ${GREEN}http://$(hostname -I | awk '{print $1}'):5000${NC}"
fi
echo
echo -e "${BLUE}Credenciales de administrador:${NC}"
echo -e "  Email:    ${GREEN}${ADMIN_EMAIL}${NC}"
echo -e "  Password: ${GREEN}${ADMIN_PASSWORD}${NC}"
echo -e "  Nombre:   ${GREEN}${ADMIN_NAME}${NC}"
echo
echo -e "${YELLOW}⚠ IMPORTANTE: Guarda estas credenciales en un lugar seguro${NC}"
echo
echo -e "${BLUE}Base de datos:${NC}"
echo -e "  Nombre:   ${GREEN}${DB_NAME}${NC}"
echo -e "  Usuario:  ${GREEN}${DB_USER}${NC}"
echo -e "  Password: ${GREEN}${DB_PASS}${NC}"
echo
echo -e "${BLUE}Comandos útiles:${NC}"
echo -e "  Ver logs backend:  ${GREEN}journalctl -u adminssh-backend -f${NC}"
echo -e "  Ver logs frontend: ${GREEN}journalctl -u adminssh-frontend -f${NC}"
echo -e "  Reiniciar backend: ${GREEN}systemctl restart adminssh-backend${NC}"
echo -e "  Reiniciar frontend:${GREEN}systemctl restart adminssh-frontend${NC}"
echo
echo -e "${BLUE}Soporte:${NC}"
echo -e "  Telegram: ${GREEN}@MrELkin${NC}"
echo -e "  WhatsApp: ${GREEN}+573124132002${NC}"
echo

# Notas adicionales si se configuraron dominios
if [ "$BACKEND_DOMAIN" != "localhost" ] || [ "$FRONTEND_DOMAIN" != "localhost" ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                  CONFIGURACIÓN DNS                     ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Asegúrate de configurar los registros DNS:${NC}"

    if [ "$BACKEND_DOMAIN" != "localhost" ]; then
        echo -e "  ${GREEN}${BACKEND_DOMAIN}${NC} → A record → ${GREEN}$(hostname -I | awk '{print $1}')${NC}"
    fi

    if [ "$FRONTEND_DOMAIN" != "localhost" ]; then
        echo -e "  ${GREEN}${FRONTEND_DOMAIN}${NC} → A record → ${GREEN}$(hostname -I | awk '{print $1}')${NC}"
    fi

    echo
    echo -e "${YELLOW}⚠ Los dominios deben apuntar a este servidor antes de que funcionen${NC}"

    if [ "$INSTALL_SSL" = "s" ] || [ "$INSTALL_SSL" = "S" ]; then
        echo -e "${YELLOW}⚠ SSL se configurará automáticamente una vez que los DNS estén propagados${NC}"
    fi
    echo
fi

print_message "¡Gracias por usar Panel AdminSSH!"
echo
