# 馃殌 Panel AdminSSH

**Sistema Profesional de Gesti贸n de Usuarios SSH**

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/mrelkin83/PanelAdminSSH)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org)

---

## 馃摫 Contacto

- **Telegram:** [@MrELkin](https://t.me/MrELkin)
- **WhatsApp:** [+573124132002](https://wa.me/573124132002)
- **Desarrollado por:** @MrELkin

---

## 馃搵 Tabla de Contenidos

- [Caracter铆sticas](#-caracter铆sticas)
- [Requisitos](#-requisitos)
- [Instalaci贸n Autom谩tica](#-instalaci贸n-autom谩tica-recomendado)
- [Instalaci贸n Manual](#-instalaci贸n-manual)
- [Configuraci贸n](#-configuraci贸n)
- [Uso](#-uso)
- [Comandos 脷tiles](#-comandos-煤tiles)
- [Soluci贸n de Problemas](#-soluci贸n-de-problemas)
- [Soporte](#-soporte)

---

## 鉁?Caracter铆sticas

- 鉁?**Gesti贸n de Usuarios SSH** - Crear, renovar, bloquear, desbloquear y eliminar usuarios
- 鉁?**M煤ltiples VPS** - Administra usuarios en m煤ltiples servidores desde un solo panel
- 鉁?**Monitor en Tiempo Real** - Visualiza conexiones activas y m茅tricas de cada VPS
- 鉁?**Campo Alias** - Identifica usuarios f谩cilmente con nombres personalizados
- 鉁?**L铆mite de 400 Usuarios** - Control autom谩tico de usuarios por VPS
- 鉁?**Opciones de Mantenimiento** - Limpieza de logs, reinicio de VPS desde el panel
- 鉁?**D铆as Exactos** - Sistema corregido: 30 d铆as = exactamente 30 d铆as
- 鉁?**Interfaz Moderna** - Dise帽o profesional con React + Tailwind CSS
- 鉁?**API RESTful** - Backend robusto con Node.js + TypeScript
- 鉁?**Base de Datos PostgreSQL** - Almacenamiento seguro con Prisma ORM
- 鉁?**Autenticaci贸n JWT** - Sistema de login seguro
- 鉁?**Logs Completos** - Registro de todas las acciones

---

## 馃敡 Requisitos

### Para VPS Ubuntu/Debian (donde se instalar谩 el panel):

- Ubuntu 20.04+ / Debian 10+
- **M铆nimo 1GB RAM** (Recomendado: 2GB)
- **M铆nimo 10GB** de espacio en disco
- Acceso root
- Conexi贸n a Internet

---

## 馃殌 Instalaci贸n Autom谩tica (RECOMENDADO)

### Paso a Paso para TONTOS 馃槈

#### 1锔忊儯 Conectarse al VPS

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

#### 2锔忊儯 Copiar y Ejecutar

```bash
  wget https://raw.githubusercontent.com/mrelkin83/PanelAdminSSH/main/install.sh -O install.sh && chmod +x install.sh && sudo ./install.sh```

#### 3锔忊儯 Configurar Credenciales

Durante la instalaci贸n, el script te preguntar谩:

```
驴Deseas usar credenciales personalizadas? (s/n) [n]
```

**Opci贸n 1: Credenciales Personalizadas (Recomendado) 鉁?*
- Responde: `s`
- El script pedir谩:
  - Email del administrador
  - Contrase帽a (m铆nimo 6 caracteres)
  - Confirmaci贸n de contrase帽a
  - Nombre del administrador (opcional)

**Opci贸n 2: Credenciales por Defecto**
- Responde: `n` o solo presiona Enter
- Se usar谩n:
  - Email: `admin@paneladminssh.com`
  - Password: `Mayte2024*#`

#### 4锔忊儯 Esperar (5-10 minutos)

El script hace TODO autom谩ticamente 鉁?
#### 5锔忊儯 Acceder

Abre tu navegador: `http://TU_IP:3000`

**Inicia sesi贸n con las credenciales que configuraste**

---

## 馃洜锔?Instalaci贸n Manual

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
Ver install.sh para configuraci贸n completa

</details>

---

## 馃捇 Comandos 脷tiles

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

## 馃敟 Soluci贸n de Problemas

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

## 馃摓 Soporte

**驴Necesitas ayuda?**
- 馃挰 **Telegram:** [@MrELkin](https://t.me/MrELkin)
- 馃摫 **WhatsApp:** [+573124132002](https://wa.me/573124132002)

**Antes de contactar:**
1. Versi贸n de Ubuntu/Debian
2. Logs: `journalctl -u adminssh-backend -n 50`
3. Descripci贸n del problema

---

## 馃幃 Uso R谩pido

1. **Agregar VPS:** Admin VPS 鈫?Agregar VPS
2. **Crear Usuario:** Usuarios SSH 鈫?Crear 鈫?Llenar formulario
3. **Monitor:** Ver conexiones y m茅tricas en tiempo real
4. **Mantenimiento:** Monitor 鈫?Opciones de Mantenimiento

---

## 馃摑 Licencia

MIT License - Libre uso

---

## 馃檹 Cr茅ditos

**Desarrollado por:** @MrELkin | +573124132002

**Stack:**
- React + TypeScript + Tailwind
- Node.js + Express + Prisma
- PostgreSQL
- JWT + SSH2

---

**漏 2025 Panel AdminSSH - by @MrELkin**

猸?**Dale una estrella si te gusta el proyecto!**
