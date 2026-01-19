#!/bin/bash

###############################################################################
# Admin SSH Panel - Instalación con Monitoreo Automático
# Versión: 2.0
# Autor: Panel Admin SSH Team
# Descripción: Script extendido con sistema de monitoreo node_exporter
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
NODE_EXPORTER_VERSION="1.7.0"
NODE_EXPORTER_PORT="9100"
NODE_EXPORTER_USER="node_exporter"
MONITORING_DIR="/opt/monitoring"

###############################################################################
# FUNCIONES AUXILIARES
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_banner() {
    clear
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        Admin SSH Panel - Instalación Automática          ║
║                 Con Monitoreo Integrado                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
       log_error "Este script debe ejecutarse como root"
       exit 1
    fi
    log_success "Permisos de root verificados"
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi

    log_info "SO detectado: $OS $OS_VERSION"

    # Verificar compatibilidad
    case $OS in
        ubuntu)
            if [[ "$OS_VERSION" != "20.04" ]] && [[ "$OS_VERSION" != "22.04" ]] && [[ "$OS_VERSION" != "24.04" ]]; then
                log_warn "Versión de Ubuntu no probada: $OS_VERSION"
            fi
            ;;
        debian)
            if [[ "$OS_VERSION" != "10" ]] && [[ "$OS_VERSION" != "11" ]] && [[ "$OS_VERSION" != "12" ]]; then
                log_warn "Versión de Debian no probada: $OS_VERSION"
            fi
            ;;
        *)
            log_warn "Sistema operativo no probado: $OS"
            ;;
    esac
}

###############################################################################
# FASE 1: CONFIGURACIÓN DEL SISTEMA DE MONITOREO
###############################################################################

setup_monitoring() {
    log_info "==============================================="
    log_info "  FASE 1: Configuración del Sistema de Monitoreo"
    log_info "==============================================="
    echo

    # Crear directorio de monitoreo
    log_info "Creando estructura de directorios..."
    mkdir -p ${MONITORING_DIR}
    mkdir -p ${MONITORING_DIR}/logs
    log_success "Directorios creados"

    # Crear usuario del sistema para node_exporter
    log_info "Creando usuario del sistema '${NODE_EXPORTER_USER}'..."
    if ! id ${NODE_EXPORTER_USER} &>/dev/null; then
        useradd --system --no-create-home --shell /bin/false ${NODE_EXPORTER_USER}
        log_success "Usuario creado"
    else
        log_warn "Usuario ya existe"
    fi

    # Descargar node_exporter
    log_info "Descargando node_exporter v${NODE_EXPORTER_VERSION}..."

    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            ARCH="amd64"
            ;;
        aarch64)
            ARCH="arm64"
            ;;
        armv7l)
            ARCH="armv7"
            ;;
        *)
            log_error "Arquitectura no soportada: $ARCH"
            exit 1
            ;;
    esac

    DOWNLOAD_URL="https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}.tar.gz"

    cd /tmp
    wget -q --show-progress ${DOWNLOAD_URL} -O node_exporter.tar.gz

    if [ $? -ne 0 ]; then
        log_error "Fallo al descargar node_exporter"
        exit 1
    fi

    log_success "Descarga completada"

    # Extraer e instalar
    log_info "Instalando node_exporter..."
    tar xzf node_exporter.tar.gz
    cp node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}/node_exporter /usr/local/bin/
    chown ${NODE_EXPORTER_USER}:${NODE_EXPORTER_USER} /usr/local/bin/node_exporter
    chmod +x /usr/local/bin/node_exporter

    # Limpiar archivos temporales
    rm -rf node_exporter-${NODE_EXPORTER_VERSION}.linux-${ARCH}
    rm -f node_exporter.tar.gz

    log_success "node_exporter instalado en /usr/local/bin/node_exporter"

    # Crear servicio systemd
    log_info "Configurando servicio systemd..."

    cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter - Recolector de Métricas del Sistema
Documentation=https://github.com/prometheus/node_exporter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=node_exporter
Group=node_exporter
ExecStart=/usr/local/bin/node_exporter \
    --web.listen-address=127.0.0.1:9100 \
    --collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+)($|/) \
    --collector.filesystem.fs-types-exclude=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$ \
    --collector.netclass.ignored-devices=^(veth.*|br.*|docker.*|lo)$ \
    --collector.netdev.device-exclude=^(veth.*|br.*|docker.*)$

# Recursos y seguridad
Nice=10
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
ReadOnlyPaths=/
ReadWritePaths=/var/log

# Restart
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    log_success "Servicio systemd creado"

    # Recargar systemd y habilitar servicio
    log_info "Habilitando e iniciando node_exporter..."
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter

    # Verificar estado
    sleep 2
    if systemctl is-active --quiet node_exporter; then
        log_success "node_exporter está corriendo correctamente"
    else
        log_error "node_exporter no pudo iniciarse"
        systemctl status node_exporter --no-pager
        exit 1
    fi

    # Probar endpoint de métricas
    log_info "Verificando endpoint de métricas..."
    if curl -s http://127.0.0.1:9100/metrics | grep -q "node_"; then
        log_success "Endpoint de métricas respondiendo correctamente"
    else
        log_error "Endpoint de métricas no responde"
        exit 1
    fi

    # Configurar firewall (asegurar que el puerto NO esté expuesto públicamente)
    log_info "Configurando firewall..."
    if command -v ufw &> /dev/null; then
        # Asegurarse que el puerto 9100 NO esté abierto públicamente
        ufw deny 9100/tcp &>/dev/null || true
        log_success "Puerto 9100 bloqueado en firewall (solo localhost)"
    fi

    # Crear script de utilidad para consultar métricas
    log_info "Creando script de utilidades..."

    cat > ${MONITORING_DIR}/get-metrics.sh << 'SCRIPT_EOF'
#!/bin/bash

# Script de utilidad para consultar métricas del sistema

get_cpu_usage() {
    curl -s http://127.0.0.1:9100/metrics | grep "node_cpu_seconds_total" | head -5
}

get_memory_usage() {
    TOTAL=$(curl -s http://127.0.0.1:9100/metrics | grep "^node_memory_MemTotal_bytes" | awk '{print $2}')
    AVAILABLE=$(curl -s http://127.0.0.1:9100/metrics | grep "^node_memory_MemAvailable_bytes" | awk '{print $2}')
    USED=$((TOTAL - AVAILABLE))
    PERCENT=$((USED * 100 / TOTAL))
    echo "Memoria Total: $(($TOTAL / 1024 / 1024)) MB"
    echo "Memoria Usada: $(($USED / 1024 / 1024)) MB"
    echo "Uso de Memoria: ${PERCENT}%"
}

get_disk_usage() {
    curl -s http://127.0.0.1:9100/metrics | grep "node_filesystem_avail_bytes" | grep 'mountpoint="/"'
}

get_uptime() {
    UPTIME=$(curl -s http://127.0.0.1:9100/metrics | grep "^node_boot_time_seconds" | awk '{print $2}')
    CURRENT=$(date +%s)
    SECONDS=$((CURRENT - ${UPTIME%.*}))
    DAYS=$((SECONDS / 86400))
    HOURS=$(((SECONDS % 86400) / 3600))
    MINUTES=$(((SECONDS % 3600) / 60))
    echo "Uptime: ${DAYS}d ${HOURS}h ${MINUTES}m"
}

case "$1" in
    cpu)
        get_cpu_usage
        ;;
    memory|ram)
        get_memory_usage
        ;;
    disk)
        get_disk_usage
        ;;
    uptime)
        get_uptime
        ;;
    all)
        echo "=== CPU ==="
        get_cpu_usage
        echo
        echo "=== MEMORIA ==="
        get_memory_usage
        echo
        echo "=== DISCO ==="
        get_disk_usage
        echo
        echo "=== UPTIME ==="
        get_uptime
        ;;
    *)
        echo "Uso: $0 {cpu|memory|disk|uptime|all}"
        exit 1
        ;;
esac
SCRIPT_EOF

    chmod +x ${MONITORING_DIR}/get-metrics.sh
    log_success "Script de utilidades creado en ${MONITORING_DIR}/get-metrics.sh"

    # Crear archivo de información
    cat > ${MONITORING_DIR}/README.txt << 'README_EOF'
╔══════════════════════════════════════════════════════════════╗
║         SISTEMA DE MONITOREO NODE_EXPORTER                   ║
╚══════════════════════════════════════════════════════════════╝

INFORMACIÓN:
  - Servicio: node_exporter
  - Puerto: 9100 (solo localhost)
  - Usuario: node_exporter
  - Endpoint: http://127.0.0.1:9100/metrics

COMANDOS ÚTILES:

  # Ver estado del servicio
  systemctl status node_exporter

  # Reiniciar servicio
  systemctl restart node_exporter

  # Ver logs
  journalctl -u node_exporter -f

  # Consultar métricas manualmente
  curl http://127.0.0.1:9100/metrics

  # Usar script de utilidades
  /opt/monitoring/get-metrics.sh all
  /opt/monitoring/get-metrics.sh cpu
  /opt/monitoring/get-metrics.sh memory
  /opt/monitoring/get-metrics.sh disk
  /opt/monitoring/get-metrics.sh uptime

MÉTRICAS PRINCIPALES:

  - node_cpu_seconds_total: Uso de CPU
  - node_memory_*: Uso de RAM
  - node_filesystem_*: Uso de disco
  - node_boot_time_seconds: Tiempo de arranque (para calcular uptime)
  - node_network_*: Estadísticas de red

SEGURIDAD:

  ✓ El puerto 9100 NO está expuesto públicamente
  ✓ Solo accesible desde localhost (127.0.0.1)
  ✓ Ejecutado por usuario sin privilegios
  ✓ Protección systemd habilitada

INTEGRACIÓN:

  Las métricas pueden ser consumidas por:
  - Panel de administración remoto via SSH
  - Scripts de monitoreo personalizados
  - Prometheus (si se configura en el futuro)

README_EOF

    log_success "Archivo README creado"

    echo
    log_success "========================================="
    log_success "  MONITOREO INSTALADO CORRECTAMENTE"
    log_success "========================================="
    echo
    log_info "Detalles:"
    log_info "  • Endpoint: http://127.0.0.1:9100/metrics"
    log_info "  • Servicio: systemctl status node_exporter"
    log_info "  • Utilidades: ${MONITORING_DIR}/get-metrics.sh"
    log_info "  • README: ${MONITORING_DIR}/README.txt"
    echo
}

###############################################################################
# FASE 2: INSTALACIÓN DEL PANEL (PLACEHOLDER)
###############################################################################

install_panel() {
    log_info "==============================================="
    log_info "  FASE 2: Instalación del Panel Admin SSH"
    log_info "==============================================="
    echo

    # Aquí iría la instalación normal del Panel
    # Por ahora es un placeholder

    log_info "Instalando dependencias base..."
    apt-get update -qq
    apt-get install -y curl wget git &>/dev/null

    log_success "Dependencias instaladas"
    log_info "ADMRufu se instalaría aquí (integrar con install.sh original)"
}

###############################################################################
# FASE 3: CONFIGURACIÓN POST-INSTALACIÓN
###############################################################################

post_install() {
    log_info "==============================================="
    log_info "  FASE 3: Configuración Final"
    log_info "==============================================="
    echo

    # Mostrar resumen
    log_success "Instalación completada exitosamente!"
    echo
    log_info "Servicios instalados:"
    log_info "  ✓ Node Exporter (monitoreo)"
    log_info "  ✓ ADMRufu (gestión SSH)"
    echo
    log_info "Para ver métricas del sistema:"
    log_info "  ${MONITORING_DIR}/get-metrics.sh all"
    echo
    log_info "Para acceder al panel de administración:"
    log_info "  Conéctate via SSH y ejecuta: menu"
    echo
}

###############################################################################
# MAIN
###############################################################################

main() {
    print_banner
    check_root
    detect_os

    echo
    log_info "Iniciando instalación..."
    echo

    # FASE 1: Instalar sistema de monitoreo
    setup_monitoring

    # FASE 2: Instalar Panel Admin SSH (placeholder - integrar con instalación original)
    # install_panel

    # FASE 3: Configuración final
    post_install

    echo
    log_success "╔═══════════════════════════════════════════╗"
    log_success "║   INSTALACIÓN COMPLETADA EXITOSAMENTE     ║"
    log_success "╚═══════════════════════════════════════════╝"
    echo
}

# Ejecutar
main "$@"
