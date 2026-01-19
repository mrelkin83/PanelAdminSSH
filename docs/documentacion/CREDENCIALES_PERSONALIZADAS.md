# 🔐 Credenciales Personalizadas

## Durante la Instalación

El instalador de Panel AdminSSH te permite configurar credenciales personalizadas para mayor seguridad.

### Proceso Interactivo

```bash
╔═══════════════════════════════════════════════════════╗
║         Configuración de credenciales de              ║
║               administrador                           ║
╚═══════════════════════════════════════════════════════╝

¿Deseas usar credenciales personalizadas? (s/n) [n]
> s

Ingresa el email del administrador:
> tu-email@ejemplo.com

Ingresa la contraseña del administrador (mínimo 6 caracteres):
> ********

Confirma la contraseña:
> ********

Nombre del administrador (opcional) [Administrador]:
> Tu Nombre

✓ Credenciales personalizadas configuradas
```

### Credenciales Por Defecto

Si respondes `n` o presionas Enter:

```
Email:    admin@paneladminssh.com
Password: Mayte2024*#
Nombre:   Administrador
```

## Cambiar Credenciales Después de Instalación

### Método 1: Desde el Panel (Próximamente)

1. Iniciar sesión
2. Ir a Configuración > Perfil
3. Cambiar contraseña

### Método 2: Usando Seed Manual

```bash
cd /opt/panel-adminssh/backend

# Configurar variables de entorno
export ADMIN_EMAIL="nuevo-email@ejemplo.com"
export ADMIN_PASSWORD="NuevaPassword123!"
export ADMIN_NAME="Nuevo Nombre"

# Ejecutar seed
npx prisma db seed
```

### Método 3: Directamente en Base de Datos

```bash
# Conectar a PostgreSQL
sudo -u postgres psql paneladminssh

# Ver usuarios actuales
SELECT email, name, role FROM "Admin";

# Actualizar email
UPDATE "Admin" SET email = 'nuevo@email.com' WHERE email = 'admin@paneladminssh.com';

# Salir
\q
```

**⚠️ Nota:** Para cambiar la contraseña en la base de datos, necesitas hashearla primero con bcrypt.

## Seguridad

### Recomendaciones:

✅ **Usar credenciales personalizadas** durante la instalación
✅ **Contraseña fuerte:** Mínimo 12 caracteres, mayúsculas, minúsculas, números y símbolos
✅ **Email real:** Para recuperación de cuenta (próximamente)
✅ **No compartir credenciales**
✅ **Cambiar contraseña periódicamente**

### Ejemplo de Contraseña Fuerte:

```
✗ Débil:   admin123
✗ Regular: Mayte2024*#
✓ Fuerte:  P@n3l_AdminSSH_2025!_Secure
```

## Variables de Entorno

El archivo `.env` del backend contiene:

```env
# Admin credentials (for seed)
ADMIN_EMAIL="tu-email@ejemplo.com"
ADMIN_PASSWORD="tu-password-seguro"
ADMIN_NAME="Tu Nombre"
```

**⚠️ Importante:** Mantén este archivo seguro y no lo compartas.

---

**© 2025 Panel AdminSSH - by @MrELkin**
