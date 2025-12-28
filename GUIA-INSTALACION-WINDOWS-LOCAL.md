# 🖥️ Guía de Instalación Local en Windows
## Panel AdminSSH en tu PC con Windows

Esta guía te enseñará a instalar el Panel AdminSSH **en tu computadora Windows** para desarrollo o pruebas locales.

---

## 🎯 ¿Qué Vamos a Lograr?

Al final de esta guía tendrás:
- ✅ El Panel AdminSSH corriendo en tu PC Windows
- ✅ Acceso desde tu navegador a `http://localhost`
- ✅ Todo funcionando sin necesidad de un servidor VPS

---

## 📋 Requisitos Previos

- 💻 Windows 10 versión 2004 o superior (o Windows 11)
- 💾 Al menos 10 GB de espacio libre en disco
- 🌐 Conexión a Internet
- ⚡ Derechos de administrador en tu PC

---

## 🛠️ MÉTODO 1: Usando WSL2 (Recomendado)

WSL2 es como tener Linux dentro de Windows. Es la forma más fácil y compatible.

### PASO 1: Instalar WSL2

#### 1.1. Abrir PowerShell como Administrador

1. Presiona la tecla **Windows** en tu teclado
2. Escribe: `PowerShell`
3. Haz clic derecho en **"Windows PowerShell"**
4. Selecciona **"Ejecutar como administrador"**
5. Si aparece un mensaje preguntando si permites cambios, clic en **"Sí"**

#### 1.2. Instalar WSL2

En la ventana de PowerShell, **copia y pega** este comando:

```powershell
wsl --install
```

**¿Qué hace?** Instala automáticamente:
- WSL2 (Windows Subsystem for Linux)
- Ubuntu (distribución de Linux)

**Tiempo:** 5-10 minutos (depende de tu internet)

#### 1.3. Reiniciar tu PC

```powershell
Restart-Computer
```

O simplemente reinicia tu PC desde el menú de Windows.

#### 1.4. Configurar Ubuntu

Después de reiniciar:

1. Se abrirá automáticamente una ventana de **Ubuntu**
2. Espera unos minutos mientras se instala
3. Te pedirá crear un usuario:
   - **Username:** escribe un nombre (ejemplo: `admin`)
   - **Password:** escribe una contraseña (no se verá mientras escribes)
   - **Confirm password:** vuelve a escribir la misma contraseña

**💡 Consejo:** Anota tu usuario y contraseña, los necesitarás después.

✅ **¡Listo!** Ahora tienes Ubuntu corriendo dentro de Windows.

---

### PASO 2: Actualizar Ubuntu

En la ventana de Ubuntu, **copia y pega** estos comandos uno por uno:

```bash
sudo apt update
```

Te pedirá tu contraseña (la que creaste en el paso anterior).

```bash
sudo apt upgrade -y
```

**Tiempo:** 3-5 minutos

---

### PASO 3: Instalar el Panel AdminSSH

Ahora que tienes Ubuntu, usa los mismos comandos que en el servidor:

#### 3.1. Descargar el instalador

```bash
wget https://raw.githubusercontent.com/mrelkin83/PanelAdminSSH/main/install.sh -O install.sh
```

#### 3.2. Dar permisos

```bash
chmod +x install.sh
```

#### 3.3. Ejecutar instalador

```bash
sudo ./install.sh
```

**Durante la instalación:**

**Pregunta 1 - Subdominios:**
```
Subdominio para el BACKEND API:
>
```
**→ Simplemente presiona Enter** (dejarlo en blanco)

```
Subdominio para el FRONTEND Panel:
>
```
**→ Presiona Enter de nuevo**

**Tiempo:** 8-12 minutos

---

### PASO 4: Acceder al Panel

Una vez terminada la instalación:

1. **Abre tu navegador** (Chrome, Edge, Firefox)
2. Ve a: `http://localhost`
3. **Credenciales:**
   - Email: `admin@paneladminssh.com`
   - Password: `Mayte2024*#`

🎉 **¡Listo! Ya tienes el panel corriendo localmente.**

---

## 🔧 Comandos Útiles en WSL2

### Abrir Ubuntu cuando lo necesites:

1. Presiona **Windows + R**
2. Escribe: `wsl`
3. Enter

O busca **"Ubuntu"** en el menú de inicio.

### Ver si los servicios están corriendo:

```bash
sudo systemctl status adminssh-backend
sudo systemctl status adminssh-frontend
sudo systemctl status nginx
```

### Reiniciar servicios:

```bash
sudo systemctl restart adminssh-backend
sudo systemctl restart adminssh-frontend
sudo systemctl restart nginx
```

### Detener servicios (para liberar recursos):

```bash
sudo systemctl stop adminssh-backend
sudo systemctl stop adminssh-frontend
sudo systemctl stop nginx
```

### Iniciar servicios de nuevo:

```bash
sudo systemctl start adminssh-backend
sudo systemctl start adminssh-frontend
sudo systemctl start nginx
```

---

## 🛠️ MÉTODO 2: Sin WSL (Instalación Manual)

Si no quieres usar WSL2, puedes instalar todo manualmente en Windows.

### PASO 1: Instalar Node.js

1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (Long Term Support)
3. Ejecuta el instalador
4. Deja todas las opciones por defecto
5. Clic en **"Next"** hasta terminar

**Verificar instalación:**

Abre PowerShell y escribe:
```powershell
node --version
npm --version
```

Deberías ver números de versión (ejemplo: `v20.19.6`)

---

### PASO 2: Instalar PostgreSQL

1. Ve a: https://www.postgresql.org/download/windows/
2. Descarga el instalador
3. Ejecuta el instalador:
   - **Password:** Crea una contraseña (ejemplo: `admin123`)
   - **Puerto:** Deja `5432`
   - Deja todo lo demás por defecto
4. Termina la instalación

**💡 Anota tu contraseña de PostgreSQL**

---

### PASO 3: Instalar Git

1. Ve a: https://git-scm.com/download/win
2. Descarga el instalador
3. Instala dejando todo por defecto

---

### PASO 4: Descargar el Código

Abre PowerShell y navega a donde quieres instalar:

```powershell
cd C:\
mkdir PanelAdminSSH
cd PanelAdminSSH
git clone https://github.com/mrelkin83/PanelAdminSSH.git .
```

---

### PASO 5: Configurar Base de Datos

Abre **pgAdmin 4** (se instaló con PostgreSQL)

1. Conectarse al servidor (usa la contraseña que creaste)
2. Clic derecho en **"Databases"** → **"Create"** → **"Database"**
3. Nombre: `paneladminssh`
4. Clic en **"Save"**

Crear usuario:

1. Clic derecho en **"Login/Group Roles"** → **"Create"** → **"Login/Group Role"**
2. **General** → Name: `adminssh`
3. **Definition** → Password: `AdminSSH2024Pass`
4. **Privileges** → Activar todo
5. Clic en **"Save"**

---

### PASO 6: Configurar Backend

#### 6.1. Crear archivo .env

Navega a la carpeta del backend:

```powershell
cd backend
```

Crea un archivo llamado `.env` con este contenido:

```env
DATABASE_URL="postgresql://adminssh:AdminSSH2024Pass@localhost:5432/paneladminssh?schema=public"
JWT_SECRET="tu-secreto-super-seguro-aqui-cambialo"
ENCRYPTION_KEY="otra-clave-secreta-diferente-aqui"
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
ADMIN_EMAIL="admin@paneladminssh.com"
ADMIN_PASSWORD="Mayte2024*#"
ADMIN_NAME="Administrador"
```

**💡 Tip:** Usa el Bloc de notas de Windows para crear este archivo.

#### 6.2. Instalar dependencias

```powershell
npm install
```

#### 6.3. Configurar base de datos

```powershell
npx prisma generate
npx prisma db push
npx prisma db seed
```

#### 6.4. Iniciar backend

```powershell
npm run dev
```

**Dejar esta ventana abierta.** El backend ahora está corriendo.

---

### PASO 7: Configurar Frontend

**Abre una NUEVA ventana de PowerShell** (la anterior debe seguir abierta)

#### 7.1. Navegar al frontend

```powershell
cd C:\PanelAdminSSH\frontend
```

#### 7.2. Crear archivo .env

Crea un archivo `.env` con:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

#### 7.3. Instalar dependencias

```powershell
npm install
```

#### 7.4. Compilar y servir

```powershell
npm run build
npm run preview
```

**Dejar esta ventana abierta también.**

---

### PASO 8: Acceder al Panel

1. Abre tu navegador
2. Ve a: `http://localhost:3000`
3. **Credenciales:**
   - Email: `admin@paneladminssh.com`
   - Password: `Mayte2024*#`

🎉 **¡Funciona!**

---

## 🔄 Iniciar el Panel Después

Si cierras las ventanas o reinicias tu PC, para volver a usar el panel:

### Método WSL2:

1. Abre **Ubuntu**
2. Inicia los servicios:
   ```bash
   sudo systemctl start adminssh-backend
   sudo systemctl start adminssh-frontend
   sudo systemctl start nginx
   ```
3. Ve a `http://localhost` en tu navegador

### Método Manual:

1. Abre PowerShell en `C:\PanelAdminSSH\backend`
2. Ejecuta: `npm run dev`
3. Abre OTRA PowerShell en `C:\PanelAdminSSH\frontend`
4. Ejecuta: `npm run preview`
5. Ve a `http://localhost:3000` en tu navegador

---

## ❌ Solución de Problemas

### Problema: "wsl --install" no funciona

**Solución:**

Habilita WSL manualmente:

1. Abre PowerShell como administrador
2. Ejecuta:
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. Reinicia tu PC
4. Descarga Ubuntu desde Microsoft Store
5. Abre Ubuntu y configura usuario/contraseña

### Problema: "Puerto 5000 o 3000 en uso"

**Causa:** Otro programa está usando ese puerto.

**Solución Windows:**

```powershell
# Ver qué usa el puerto 5000
netstat -ano | findstr :5000

# Matar el proceso (cambia PID por el número que viste)
taskkill /PID numero_del_proceso /F
```

### Problema: "Cannot connect to database"

**Causa:** PostgreSQL no está corriendo.

**Solución:**

1. Busca "Services" en Windows
2. Busca "postgresql-x64-XX"
3. Clic derecho → "Start"

### Problema: En WSL no puedo acceder a localhost

**Solución:**

En Ubuntu, verifica la IP de WSL:

```bash
hostname -I
```

Usa esa IP en lugar de localhost. Ejemplo: `http://172.20.10.5`

---

## 💡 Consejos

### Para Desarrolladores:

- Usa **Visual Studio Code** con la extensión "Remote - WSL"
- Puedes editar archivos desde Windows y ejecutar en Linux
- Los archivos de WSL están en: `\\wsl$\Ubuntu\home\tu-usuario\`

### Para Apagar Todo:

**WSL2:**
```bash
sudo systemctl stop adminssh-backend adminssh-frontend nginx
```

**Manual:**
- Cierra las ventanas de PowerShell donde corriste `npm run dev` y `npm run preview`

### Hacer Backup:

**WSL2:**
```bash
sudo -u postgres pg_dump paneladminssh > backup.sql
```

**Windows:**
- Usa pgAdmin → Clic derecho en la base de datos → "Backup"

---

## 📊 Resumen de Diferencias

| Característica | WSL2 | Manual |
|----------------|------|--------|
| **Dificultad** | Fácil | Media |
| **Instalación** | Automática | Manual |
| **Rendimiento** | Excelente | Bueno |
| **Compatibilidad** | 100% | 95% |
| **Mantenimiento** | Fácil | Requiere atención |
| **Recomendado para** | Principiantes | Desarrolladores |

---

## 🎓 ¿Qué Método Elegir?

### Elige WSL2 si:
- ✅ Eres principiante
- ✅ Quieres la forma más fácil
- ✅ No quieres complicarte
- ✅ Tienes Windows 10/11 actualizado

### Elige Manual si:
- ✅ Ya sabes programar
- ✅ Quieres entender cada paso
- ✅ Necesitas acceso directo a los archivos
- ✅ Tienes Windows más antiguo

---

## 📞 Soporte

Si algo no funciona:

- Telegram: @MrELkin
- WhatsApp: +573124132002
- GitHub Issues: https://github.com/mrelkin83/PanelAdminSSH/issues

---

## 🎯 Checklist Final

Después de instalar, verifica:

- [ ] Puedo acceder a `http://localhost` o `http://localhost:3000`
- [ ] Puedo hacer login con las credenciales
- [ ] Veo el dashboard del panel
- [ ] Puedo crear conexiones SSH de prueba

Si todos tienen ✅, **¡la instalación fue exitosa!**

---

**🎉 ¡Disfruta del Panel AdminSSH en tu PC Windows!**

---

*Desarrollado por @MrELkin*
*Guía para Windows - Versión 1.0*
*Diciembre 2024*
