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
DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true

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

# Preguntar por credenciales personalizadas
echo
print_message "Configuración de credenciales de administrador"
echo
print_warning "¿Deseas usar credenciales personalizadas? (s/n) [n]"
read -p "> " USE_CUSTOM_CREDS

if [ "$USE_CUSTOM_CREDS" = "s" ] || [ "$USE_CUSTOM_CREDS" = "S" ]; then
    echo
    print_message "Ingresa el email del administrador:"
    read -p "> " ADMIN_EMAIL

    while [ -z "$ADMIN_EMAIL" ]; do
        print_error "El email no puede estar vacío"
        read -p "> " ADMIN_EMAIL
    done

    print_message "Ingresa la contraseña del administrador (mínimo 6 caracteres):"
    read -s -p "> " ADMIN_PASSWORD
    echo

    while [ ${#ADMIN_PASSWORD} -lt 6 ]; do
        print_error "La contraseña debe tener al menos 6 caracteres"
        read -s -p "> " ADMIN_PASSWORD
        echo
    done

    print_message "Confirma la contraseña:"
    read -s -p "> " ADMIN_PASSWORD_CONFIRM
    echo

    while [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; do
        print_error "Las contraseñas no coinciden. Intenta de nuevo."
        print_message "Ingresa la contraseña:"
        read -s -p "> " ADMIN_PASSWORD
        echo
        print_message "Confirma la contraseña:"
        read -s -p "> " ADMIN_PASSWORD_CONFIRM
        echo
    done

    print_message "Nombre del administrador (opcional) [Administrador]:"
    read -p "> " ADMIN_NAME
    ADMIN_NAME=${ADMIN_NAME:-Administrador}

    print_success "Credenciales personalizadas configuradas"
else
    # Usar credenciales por defecto
    ADMIN_EMAIL="admin@paneladminssh.com"
    ADMIN_PASSWORD="Mayte2024*#"
    ADMIN_NAME="Administrador"
    print_success "Usando credenciales por defecto"
fi

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

# Admin credentials (for seed)
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ADMIN_NAME="${ADMIN_NAME}"
EOF

# Instalar dependencias
npm install --production -qq > /dev/null 2>&1
npx prisma generate > /dev/null 2>&1
npx prisma migrate deploy > /dev/null 2>&1

# Crear usuario admin con seed
print_message "Creando usuario administrador..."
npx prisma db seed > /dev/null 2>&1

print_success "Backend configurado"

# 8. Configurar Frontend
print_message "Paso 8/10: Configurando frontend..."
cd "$INSTALL_DIR/frontend"

# Crear archivo .env
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api/v1
EOF

npm install -qq > /dev/null 2>&1
npm run build > /dev/null 2>&1

print_success "Frontend configurado"

# 9. Crear servicios systemd
print_message "Paso 9/10: Creando servicios systemd..."

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

# 10. Configurar Nginx (opcional)
print_message "Paso 10/10: ¿Desea instalar y configurar Nginx? (s/n)"
read -p "> " INSTALL_NGINX

if [ "$INSTALL_NGINX" = "s" ] || [ "$INSTALL_NGINX" = "S" ]; then
    apt-get install -y nginx -qq > /dev/null 2>&1

    cat > /etc/nginx/sites-available/adminssh << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/adminssh /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    systemctl restart nginx
    print_success "Nginx instalado y configurado"
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
echo -e "  URL Frontend: ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "  URL Backend:  ${GREEN}http://$(hostname -I | awk '{print $1}'):5000${NC}"
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
print_message "¡Gracias por usar Panel AdminSSH!"
echo
