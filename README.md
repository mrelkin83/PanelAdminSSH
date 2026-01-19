# 🚀 Panel AdminSSH

**Sistema Profesional de Gestión de Usuarios SSH**

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/mrelkin83/PanelAdminSSH)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org)

---

## 📱 Contacto

- **Telegram:** [@MrELkin](https://t.me/MrELkin)
- **WhatsApp:** [+573124132002](https://wa.me/573124132002)
- **Desarrollado por:** @MrELkin

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Requisitos](#-requisitos)
- [Instalación Automática](#-instalación-automática-recomendado)
- [Instalación Manual](#-instalación-manual)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Comandos Útiles](#-comandos-útiles)
- [Solución de Problemas](#-solución-de-problemas)
- [Soporte](#-soporte)

---

## ✨ Características

- ✅ **Gestión de Usuarios SSH** - Crear, renovar, bloquear, desbloquear y eliminar usuarios
- ✅ **Múltiples VPS** - Administra usuarios en múltiples servidores desde un solo panel
- ✅ **Monitor en Tiempo Real** - Visualiza conexiones activas y métricas de cada VPS
- ✅ **Campo Alias** - Identifica usuarios fácilmente con nombres personalizados
- ✅ **Límite de 400 Usuarios** - Control automático de usuarios por VPS
- ✅ **Opciones de Mantenimiento** - Limpieza de logs, reinicio de VPS desde el panel
- ✅ **Días Exactos** - Sistema corregido: 30 días = exactamente 30 días
- ✅ **Interfaz Moderna** - Diseño profesional con React + Tailwind CSS
- ✅ **API RESTful** - Backend robusto con Node.js + TypeScript
- ✅ **Base de Datos PostgreSQL** - Almacenamiento seguro con Prisma ORM
- ✅ **Autenticación JWT** - Sistema de login seguro
- ✅ **Logs Completos** - Registro de todas las acciones

---

## 🔧 Requisitos

### Para VPS Ubuntu/Debian (donde se instalará el panel):

- Ubuntu 20.04+ / Debian 10+
- **Mínimo 1GB RAM** (Recomendado: 2GB)
- **Mínimo 10GB** de espacio en disco
- Acceso root
- Conexión a Internet

---

## 🚀 Instalación Automática (RECOMENDADO)

### Paso a Paso para TONTOS 😉

#### 1️⃣ Conectarse al VPS

**Windows (PuTTY):**
```
Host: tu-ip-del-vps
Port: 22
Usuario: root
```

**Mac/Linux:**
```bash
ssh root@TU_IP_DEL_VPS
```

#### 2️⃣ Copiar y Ejecutar

```bash
wget https://raw.githubusercontent.com/mrelkin83/PanelAdminSSH/main/install.sh -O install.sh && chmod +x install.sh && sudo ./install.sh
```

#### 3️⃣ Configurar Credenciales

Durante la instalación, el script te preguntará:

```
¿Deseas usar credenciales personalizadas? (s/n) [n]
```

**Opción 1: Credenciales Personalizadas (Recomendado) ✅**
- Responde: `s`
- El script pedirá:
  - Email del administrador
  - Contraseña (mínimo 6 caracteres)
  - Confirmación de contraseña
  - Nombre del administrador (opcional)

**Opción 2: Credenciales por Defecto**
- Responde: `n` o solo presiona Enter
- Se usarán:
  - Email: `admin@paneladminssh.com`
  - Password: `Mayte2024*#`

#### 4️⃣ Esperar (5-10 minutos)

El script hace TODO automáticamente ✅

#### 5️⃣ Acceder

Abre tu navegador: `http://TU_IP:3000`

**Inicia sesión con las credenciales que configuraste**

---

## 🛠️ Instalación Manual

<details>
<summary>Click para ver pasos detallados</summary>

### 1. Actualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Instalar PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Configurar Base de Datos
```bash
sudo -u postgres psql
CREATE DATABASE paneladminssh;
CREATE USER adminssh WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE paneladminssh TO adminssh;
\q
```

### 5. Clonar Repo
```bash
cd /opt
sudo git clone https://github.com/mrelkin83/PanelAdminSSH.git panel-adminssh
cd panel-adminssh
```

### 6. Backend
```bash
cd backend
sudo nano .env
```
Copiar:
```env
DATABASE_URL="postgresql://adminssh:tu_password@localhost:5432/paneladminssh"
JWT_SECRET="clave_secreta_aqui"
ENCRYPTION_KEY="clave_32_caracteres_aqui"
PORT=5000
NODE_ENV=production
```
```bash
sudo npm install
sudo npx prisma generate
sudo npx prisma migrate deploy
```

### 7. Frontend
```bash
cd ../frontend
sudo nano .env
```
Copiar:
```env
VITE_API_URL=http://localhost:5000/api/v1
```
```bash
sudo npm install
sudo npm run build
```

### 8. Servicios Systemd
Ver install.sh para configuración completa

</details>

---

## 💻 Comandos Útiles

```bash
# Ver logs
sudo journalctl -u adminssh-backend -f
sudo journalctl -u adminssh-frontend -f

# Reiniciar
sudo systemctl restart adminssh-backend
sudo systemctl restart adminssh-frontend

# Estado
sudo systemctl status adminssh-backend

# Actualizar
cd /opt/panel-adminssh && sudo git pull
cd backend && sudo npm install && sudo npx prisma migrate deploy
cd ../frontend && sudo npm install && sudo npm run build
sudo systemctl restart adminssh-backend adminssh-frontend
```

---

## 🔥 Solución de Problemas

### Panel no abre
```bash
sudo systemctl status adminssh-backend adminssh-frontend
sudo netstat -tlnp | grep -E ':(3000|5000)'
sudo journalctl -u adminssh-backend -n 50
```

### Error PostgreSQL
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### No conecta a VPS
1. Verifica IP y puerto
2. Prueba SSH manual: `ssh root@IP_VPS`
3. Verifica clave privada

---

## 📞 Soporte

**¿Necesitas ayuda?**
- 💬 **Telegram:** [@MrELkin](https://t.me/MrELkin)
- 📱 **WhatsApp:** [+573124132002](https://wa.me/573124132002)

**Antes de contactar:**
1. Versión de Ubuntu/Debian
2. Logs: `journalctl -u adminssh-backend -n 50`
3. Descripción del problema

---

## 🎮 Uso Rápido

1. **Agregar VPS:** Admin VPS → Agregar VPS
2. **Crear Usuario:** Usuarios SSH → Crear → Llenar formulario
3. **Monitor:** Ver conexiones y métricas en tiempo real
4. **Mantenimiento:** Monitor → Opciones de Mantenimiento

---

## 📝 Licencia

MIT License - Libre uso

---

## 🙏 Créditos

**Desarrollado por:** @MrELkin | +573124132002

**Stack:**
- React + TypeScript + Tailwind
- Node.js + Express + Prisma
- PostgreSQL
- JWT + SSH2

---

**© 2025 Panel AdminSSH - by @MrELkin**

⭐ **Dale una estrella si te gusta el proyecto!**
