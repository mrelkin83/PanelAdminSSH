#!/bin/bash

#####################################
# Panel AdminSSH - Crear Nuevo Admin
# by @MrELkin | +573124132002
#####################################

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
echo "║        Panel AdminSSH - Crear Administrador          ║"
echo "║                                                       ║"
echo "║              by @MrELkin | +573124132002              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# Verificar que estamos en el directorio correcto
PANEL_DIR="/opt/panel-adminssh"

if [ ! -d "$PANEL_DIR" ]; then
    print_error "No se encontró la instalación de Panel AdminSSH en $PANEL_DIR"
    echo
    print_message "¿Instalaste el panel en otra ubicación? Especifica la ruta:"
    read -p "> " CUSTOM_DIR

    if [ -d "$CUSTOM_DIR/backend" ]; then
        PANEL_DIR="$CUSTOM_DIR"
        print_success "Usando directorio: $PANEL_DIR"
    else
        print_error "Directorio inválido. Saliendo..."
        exit 1
    fi
fi

# Preguntar credenciales
echo
print_message "=== Configuración de Nuevo Administrador ==="
echo

print_message "Ingresa el email del administrador:"
read -p "> " ADMIN_EMAIL

while [ -z "$ADMIN_EMAIL" ]; do
    print_error "El email no puede estar vacío"
    read -p "> " ADMIN_EMAIL
done

print_message "Ingresa la contraseña (mínimo 6 caracteres):"
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

print_message "Nombre del administrador [Administrador]:"
read -p "> " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Administrador}

print_message "Rol [superadmin]:"
echo "  1) superadmin (acceso completo)"
echo "  2) admin (acceso limitado)"
read -p "> " ROLE_CHOICE

if [ "$ROLE_CHOICE" = "2" ]; then
    ADMIN_ROLE="admin"
else
    ADMIN_ROLE="superadmin"
fi

echo
print_warning "¿Crear nuevo administrador con estos datos? (s/n)"
echo "  Email:    $ADMIN_EMAIL"
echo "  Nombre:   $ADMIN_NAME"
echo "  Rol:      $ADMIN_ROLE"
read -p "> " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    print_error "Operación cancelada"
    exit 0
fi

# Crear administrador
cd "$PANEL_DIR/backend"

print_message "Creando administrador..."

# Exportar variables de entorno
export ADMIN_EMAIL="$ADMIN_EMAIL"
export ADMIN_PASSWORD="$ADMIN_PASSWORD"
export ADMIN_NAME="$ADMIN_NAME"
export ADMIN_ROLE="$ADMIN_ROLE"

# Ejecutar seed
npx prisma db seed 2>&1 | grep -v "warn"

if [ $? -eq 0 ]; then
    echo
    print_success "¡Administrador creado exitosamente!"
    echo
    echo -e "${BLUE}Credenciales de acceso:${NC}"
    echo -e "  Email:    ${GREEN}$ADMIN_EMAIL${NC}"
    echo -e "  Password: ${GREEN}$ADMIN_PASSWORD${NC}"
    echo -e "  Nombre:   ${GREEN}$ADMIN_NAME${NC}"
    echo -e "  Rol:      ${GREEN}$ADMIN_ROLE${NC}"
    echo
    echo -e "${YELLOW}⚠ IMPORTANTE: Guarda estas credenciales en un lugar seguro${NC}"
    echo
else
    print_error "Error al crear administrador"
    echo
    print_message "Verifica que:"
    echo "  1. PostgreSQL esté corriendo: systemctl status postgresql"
    echo "  2. El backend esté configurado correctamente"
    echo "  3. El archivo .env exista en $PANEL_DIR/backend"
    exit 1
fi
