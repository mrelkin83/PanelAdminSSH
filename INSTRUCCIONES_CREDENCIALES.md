# 🔐 Instrucciones para Configurar Credenciales Personalizadas

## Si Ya Instalaste el Panel

Si ya instalaste Panel AdminSSH con la versión anterior del instalador, tienes 3 opciones:

---

## ✅ OPCIÓN 1: Usar Script de Creación de Admin (Recomendado)

### 1. Descargar el script

```bash
cd ~
wget https://raw.githubusercontent.com/TU_USUARIO/PanelAdminSSH/main/create-admin.sh
chmod +x create-admin.sh
```

### 2. Ejecutar el script

```bash
sudo ./create-admin.sh
```

### 3. Seguir las instrucciones

```
╔═══════════════════════════════════════════════════════╗
║        Panel AdminSSH - Crear Administrador          ║
╚═══════════════════════════════════════════════════════╝

=== Configuración de Nuevo Administrador ===

Ingresa el email del administrador:
> tu-email@ejemplo.com

Ingresa la contraseña (mínimo 6 caracteres):
> ********

Confirma la contraseña:
> ********

Nombre del administrador [Administrador]:
> Tu Nombre

Rol [superadmin]:
  1) superadmin (acceso completo)
  2) admin (acceso limitado)
> 1

¿Crear nuevo administrador con estos datos? (s/n)
  Email:    tu-email@ejemplo.com
  Nombre:   Tu Nombre
  Rol:      superadmin
> s

✓ ¡Administrador creado exitosamente!
```

---

## 🔄 OPCIÓN 2: Reinstalar con el Nuevo Instalador

### 1. Hacer backup de la base de datos (opcional)

```bash
sudo -u postgres pg_dump paneladminssh > ~/backup-adminssh.sql
```

### 2. Desinstalar versión actual

```bash
sudo systemctl stop adminssh-backend adminssh-frontend
sudo rm -rf /opt/panel-adminssh
sudo -u postgres psql -c "DROP DATABASE paneladminssh;"
```

### 3. Descargar nuevo instalador

```bash
wget https://raw.githubusercontent.com/TU_USUARIO/PanelAdminSSH/main/install.sh -O install.sh
chmod +x install.sh
```

### 4. Instalar

```bash
sudo ./install.sh
```

Ahora SÍ verás la opción de credenciales personalizadas:

```
¿Deseas usar credenciales personalizadas? (s/n) [n]
> s
```

---

## 🛠️ OPCIÓN 3: Crear Admin Manualmente

### 1. Conectar a la base de datos

```bash
cd /opt/panel-adminssh/backend
```

### 2. Crear archivo temporal

```bash
cat > create-admin-manual.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Administrador';

  if (!email || !password) {
    console.log('Uso: node create-admin-manual.js <email> <password> [nombre]');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
    },
    create: {
      email,
      password: hashedPassword,
      name,
      role: 'superadmin',
      isActive: true,
    },
  });

  console.log('✅ Admin creado/actualizado:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF
```

### 3. Ejecutar

```bash
node create-admin-manual.js "tu-email@ejemplo.com" "TuPasswordSeguro123!" "Tu Nombre"
```

### 4. Limpiar

```bash
rm create-admin-manual.js
```

---

## 📋 VERIFICAR QUE FUNCIONÓ

### Opción 1: Desde el navegador

```
1. Ir a http://TU_IP:3000
2. Intentar login con las nuevas credenciales
```

### Opción 2: Desde base de datos

```bash
sudo -u postgres psql paneladminssh -c "SELECT email, name, role FROM \"Admin\";"
```

Deberías ver:

```
         email          |    name    |    role
------------------------+------------+------------
 tu-email@ejemplo.com   | Tu Nombre  | superadmin
```

---

## 🔐 ELIMINAR ADMIN ANTERIOR (Opcional)

Si quieres eliminar el admin por defecto:

```bash
sudo -u postgres psql paneladminssh -c "DELETE FROM \"Admin\" WHERE email = 'admin@paneladminssh.com';"
```

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Error: "npx: command not found"

```bash
# Instalar Node.js si no está instalado
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Error: "Cannot find module '@prisma/client'"

```bash
cd /opt/panel-adminssh/backend
sudo npm install
sudo npx prisma generate
```

### Error: "Connection refused to database"

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql
sudo systemctl start postgresql
```

---

## 💡 CONSEJOS DE SEGURIDAD

✅ **Contraseña fuerte:** Mínimo 12 caracteres
✅ **Email real:** Para recuperación (próximamente)
✅ **No reutilizar contraseñas**
✅ **Cambiar contraseña cada 3 meses**

### Ejemplos de contraseñas:

```
❌ Débil:   admin123
❌ Regular: Mayte2024*#
✅ Fuerte:  MyP@nel_AdminSSH2025!
✅ Muy fuerte: 8Kx#mP9$vL2@qW5n
```

---

## 📞 AYUDA

Si tienes problemas:
- 💬 Telegram: [@MrELkin](https://t.me/MrELkin)
- 📱 WhatsApp: [+573124132002](https://wa.me/573124132002)

---

**© 2025 Panel AdminSSH - by @MrELkin**
