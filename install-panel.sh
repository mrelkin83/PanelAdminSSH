#!/bin/bash

################################################################################
# ADMRufu Panel - Auto-Instalador para VPS
#
# Script de instalación automatizada para Ubuntu 20.04/22.04
# Instala y configura el panel de administración ADMRufu
#
# Uso: curl -sSL [URL] | bash
# o:   bash install-panel.sh
################################################################################

set -e  # Salir en caso de error

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

APP_NAME="admrufu-panel"
APP_DIR="/opt/admrufu-panel"
APP_USER="admrufu"
APP_PORT="3001"
NODE_VERSION="20"
LOG_FILE="/var/log/admrufu-panel-install.log"
INSTALLATION_MARKER="${APP_DIR}/.installed"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_section() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
    log "Sección: $1"
}

# ============================================================================
# VALIDACIONES PREVIAS
# ============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        echo "Ejecuta: sudo bash $0"
        exit 1
    fi
}

check_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi

    source /etc/os-release

    if [[ "$ID" != "ubuntu" ]]; then
        log_error "Este instalador solo soporta Ubuntu"
        log_error "Sistema detectado: $ID $VERSION_ID"
        exit 1
    fi

    local version_major=$(echo "$VERSION_ID" | cut -d. -f1)

    if [[ "$version_major" -lt 20 ]]; then
        log_error "Se requiere Ubuntu 20.04 o superior"
        log_error "Versión detectada: $VERSION_ID"
        exit 1
    fi

    log_success "Sistema compatible detectado: Ubuntu $VERSION_ID"
}

check_already_installed() {
    if [[ -f "$INSTALLATION_MARKER" ]]; then
        log_warning "El panel ya está instalado en este servidor"
        echo ""
        read -p "¿Deseas reinstalar? Esto eliminará la instalación actual (s/N): " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            log "Instalación cancelada por el usuario"
            exit 0
        fi

        log_warning "Procediendo con reinstalación..."
        systemctl stop admrufu-panel 2>/dev/null || true
        rm -rf "$APP_DIR"
    fi
}

# ============================================================================
# INSTALACIÓN DE DEPENDENCIAS
# ============================================================================

install_dependencies() {
    log_section "Instalando dependencias del sistema"

    # Actualizar repositorios
    log "Actualizando repositorios..."
    apt-get update -qq >> "$LOG_FILE" 2>&1

    # Instalar herramientas básicas
    log "Instalando herramientas básicas..."
    apt-get install -y -qq \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        gnupg \
        ufw \
        >> "$LOG_FILE" 2>&1

    log_success "Dependencias del sistema instaladas"
}

install_nodejs() {
    log_section "Instalando Node.js ${NODE_VERSION}.x"

    # Verificar si Node.js ya está instalado
    if command -v node &> /dev/null; then
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$current_version" -ge "$NODE_VERSION" ]]; then
            log_success "Node.js ya está instalado ($(node -v))"
            return
        fi
        log_warning "Versión de Node.js obsoleta detectada, actualizando..."
    fi

    # Agregar repositorio de NodeSource
    log "Agregando repositorio NodeSource..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - >> "$LOG_FILE" 2>&1

    # Instalar Node.js
    log "Instalando Node.js..."
    apt-get install -y -qq nodejs >> "$LOG_FILE" 2>&1

    # Verificar instalación
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        log_error "Falló la instalación de Node.js"
        exit 1
    fi

    log_success "Node.js instalado: $(node -v)"
    log_success "npm instalado: $(npm -v)"
}

# ============================================================================
# CONFIGURACIÓN DEL SISTEMA
# ============================================================================

create_app_user() {
    log_section "Configurando usuario de aplicación"

    if id "$APP_USER" &>/dev/null; then
        log_success "Usuario '$APP_USER' ya existe"
    else
        log "Creando usuario '$APP_USER'..."
        useradd -r -m -s /bin/bash "$APP_USER" >> "$LOG_FILE" 2>&1
        log_success "Usuario '$APP_USER' creado"
    fi
}

create_directories() {
    log_section "Creando estructura de directorios"

    # Crear directorio principal
    log "Creando directorio de aplicación: $APP_DIR"
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/backend"
    mkdir -p "$APP_DIR/logs"
    mkdir -p "$APP_DIR/backups"

    # Crear directorio para base de datos
    mkdir -p "$APP_DIR/backend/prisma"

    log_success "Estructura de directorios creada"
}

# ============================================================================
# INSTALACIÓN DE LA APLICACIÓN
# ============================================================================

install_application() {
    log_section "Instalando aplicación ADMRufu Panel"

    # Copiar archivos del backend
    log "Copiando archivos de la aplicación..."

    # Nota: Aquí deberías copiar desde el repositorio o desde donde tengas los archivos
    # Por ahora, asumimos que los archivos están en el directorio actual

    if [[ -d "./backend" ]]; then
        cp -r ./backend/* "$APP_DIR/backend/" 2>/dev/null || true
        log_success "Archivos copiados desde directorio local"
    else
        log_warning "No se encontró directorio ./backend"
        log "Los archivos deberán copiarse manualmente a $APP_DIR/backend/"
    fi
}

install_npm_packages() {
    log_section "Instalando dependencias de Node.js"

    cd "$APP_DIR/backend"

    if [[ ! -f "package.json" ]]; then
        log_error "No se encontró package.json en $APP_DIR/backend"
        exit 1
    fi

    log "Instalando paquetes npm (esto puede tomar varios minutos)..."
    npm install --production >> "$LOG_FILE" 2>&1

    log_success "Dependencias de Node.js instaladas"
}

setup_environment() {
    log_section "Configurando variables de entorno"

    cd "$APP_DIR/backend"

    if [[ -f ".env" ]]; then
        log_warning "Archivo .env ya existe, respaldando..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Generar claves seguras
    local jwt_secret=$(openssl rand -hex 32)
    local encryption_key=$(openssl rand -hex 32)

    log "Creando archivo .env con configuración de producción..."

    cat > .env << EOF
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="${jwt_secret}"
JWT_EXPIRES_IN="7d"

# Encryption
ENCRYPTION_KEY="${encryption_key}"

# Server
PORT=${APP_PORT}
NODE_ENV=production

# CORS (ajustar según tu dominio)
CORS_ORIGIN="*"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSH
SSH_TIMEOUT=30000
SSH_KEEPALIVE_INTERVAL=10000

# Logs
LOG_LEVEL=info
EOF

    log_success "Archivo .env creado con claves seguras"
    log_warning "IMPORTANTE: Guarda estas claves en un lugar seguro"
}

initialize_database() {
    log_section "Inicializando base de datos"

    cd "$APP_DIR/backend"

    if [[ ! -f "prisma/schema.prisma" ]]; then
        log_error "No se encontró el schema de Prisma"
        exit 1
    fi

    log "Generando cliente Prisma..."
    npx prisma generate >> "$LOG_FILE" 2>&1

    log "Ejecutando migraciones..."
    npx prisma migrate deploy >> "$LOG_FILE" 2>&1

    log "Creando usuario administrador inicial..."
    npx tsx prisma/seed.ts >> "$LOG_FILE" 2>&1

    log_success "Base de datos inicializada"
}

build_application() {
    log_section "Compilando aplicación TypeScript"

    cd "$APP_DIR/backend"

    if [[ -f "tsconfig.json" ]]; then
        log "Compilando TypeScript a JavaScript..."
        npm run build >> "$LOG_FILE" 2>&1
        log_success "Aplicación compilada exitosamente"
    else
        log_warning "No se encontró tsconfig.json, se usará tsx en runtime"
    fi
}

# ============================================================================
# CONFIGURACIÓN DE SYSTEMD
# ============================================================================

create_systemd_service() {
    log_section "Configurando servicio systemd"

    log "Creando archivo de servicio..."

    cat > /etc/systemd/system/admrufu-panel.service << EOF
[Unit]
Description=ADMRufu Panel - Sistema de Gestión SSH
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:${APP_DIR}/logs/app.log
StandardError=append:${APP_DIR}/logs/error.log

# Limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

    # Recargar systemd
    systemctl daemon-reload >> "$LOG_FILE" 2>&1

    log_success "Servicio systemd configurado"
}

# ============================================================================
# PERMISOS Y SEGURIDAD
# ============================================================================

set_permissions() {
    log_section "Configurando permisos"

    log "Estableciendo propietario de archivos..."
    chown -R ${APP_USER}:${APP_USER} "$APP_DIR"

    log "Configurando permisos restrictivos..."
    chmod 750 "$APP_DIR"
    chmod 640 "$APP_DIR/backend/.env"
    chmod 750 "$APP_DIR/logs"

    log_success "Permisos configurados correctamente"
}

configure_firewall() {
    log_section "Configurando firewall (UFW)"

    # Verificar si UFW está instalado
    if ! command -v ufw &> /dev/null; then
        log_warning "UFW no está instalado, saltando configuración de firewall"
        return
    fi

    log "Configurando reglas de firewall..."

    # Permitir SSH (importante para no quedar bloqueado)
    ufw allow 22/tcp >> "$LOG_FILE" 2>&1

    # Permitir puerto de la aplicación
    ufw allow ${APP_PORT}/tcp >> "$LOG_FILE" 2>&1

    # Habilitar firewall si no está activo
    if ! ufw status | grep -q "Status: active"; then
        log_warning "UFW no está activo. Para activarlo ejecuta: ufw enable"
    else
        ufw reload >> "$LOG_FILE" 2>&1
        log_success "Firewall configurado"
    fi
}

# ============================================================================
# FINALIZACIÓN
# ============================================================================

start_service() {
    log_section "Iniciando servicio"

    # Habilitar inicio automático
    systemctl enable admrufu-panel >> "$LOG_FILE" 2>&1

    # Iniciar servicio
    log "Iniciando ADMRufu Panel..."
    systemctl start admrufu-panel >> "$LOG_FILE" 2>&1

    # Esperar unos segundos
    sleep 3

    # Verificar estado
    if systemctl is-active --quiet admrufu-panel; then
        log_success "Servicio iniciado correctamente"
    else
        log_error "El servicio no pudo iniciarse"
        log "Revisa los logs: journalctl -u admrufu-panel -n 50"
        exit 1
    fi
}

create_installation_marker() {
    echo "$(date +'%Y-%m-%d %H:%M:%S')" > "$INSTALLATION_MARKER"
    echo "Version: 1.0.0" >> "$INSTALLATION_MARKER"
}

show_final_info() {
    clear
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║           ✅  INSTALACIÓN EXITOSA                              ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}📊 Información de la instalación:${NC}"
    echo ""
    echo "  🔹 Directorio de instalación: $APP_DIR"
    echo "  🔹 Usuario del sistema: $APP_USER"
    echo "  🔹 Puerto de la aplicación: $APP_PORT"
    echo "  🔹 Logs de instalación: $LOG_FILE"
    echo "  🔹 Logs de aplicación: $APP_DIR/logs/"
    echo ""
    echo -e "${BLUE}🌐 Acceso al panel:${NC}"
    echo ""
    echo "  URL: http://$(curl -s ifconfig.me 2>/dev/null || echo "TU_IP"):${APP_PORT}"
    echo ""
    echo -e "${BLUE}👤 Credenciales por defecto:${NC}"
    echo ""
    echo "  📧 Email: admin@admrufu.com"
    echo "  🔑 Password: admin123"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Cambia la contraseña después del primer login${NC}"
    echo ""
    echo -e "${BLUE}🔧 Comandos útiles:${NC}"
    echo ""
    echo "  • Ver estado del servicio:"
    echo "    systemctl status admrufu-panel"
    echo ""
    echo "  • Ver logs en tiempo real:"
    echo "    journalctl -u admrufu-panel -f"
    echo ""
    echo "  • Reiniciar servicio:"
    echo "    systemctl restart admrufu-panel"
    echo ""
    echo "  • Detener servicio:"
    echo "    systemctl stop admrufu-panel"
    echo ""
    echo -e "${GREEN}✅ El panel está listo para usar${NC}"
    echo ""
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    # Crear archivo de log
    touch "$LOG_FILE"

    # Banner inicial
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║        🚀  Instalador ADMRufu Panel v1.0                       ║"
    echo "║                                                                ║"
    echo "║        Sistema de Gestión de Usuarios SSH                     ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    log "=== Iniciando instalación de ADMRufu Panel ==="

    # Validaciones previas
    check_root
    check_ubuntu
    check_already_installed

    # Instalación
    install_dependencies
    install_nodejs
    create_app_user
    create_directories
    install_application
    install_npm_packages
    setup_environment
    initialize_database
    build_application

    # Configuración del sistema
    create_systemd_service
    set_permissions
    configure_firewall

    # Finalización
    create_installation_marker
    start_service

    # Mostrar información final
    show_final_info

    log "=== Instalación completada exitosamente ==="
}

# ============================================================================
# MANEJO DE ERRORES
# ============================================================================

trap 'log_error "La instalación falló en la línea $LINENO. Revisa el log: $LOG_FILE"; exit 1' ERR

# Ejecutar instalación
main "$@"
