# 🚀 Guía de Instalación - Panel AdminSSH
## Para Súper Principiantes

Esta guía te ayudará a instalar el Panel AdminSSH paso a paso, **sin necesidad de conocimientos técnicos previos**.

---

## 📋 ¿Qué Necesitas Antes de Empezar?

### 1. Un Servidor VPS (Computadora en la nube)
- ✅ Un servidor Ubuntu 20.04 o superior
- ✅ Acceso como usuario **root** (administrador del servidor)
- ✅ Conexión a internet

**¿Dónde conseguir un VPS?** Proveedores populares:
- Contabo (económico)
- DigitalOcean
- Vultr
- Linode

### 2. Programa para Conectarte al Servidor

Necesitas un programa llamado **cliente SSH** para conectarte a tu servidor:

**Windows:**
- PuTTY (descargar de: https://www.putty.org/)
- O usa PowerShell (viene incluido en Windows)

**Mac/Linux:**
- Terminal (ya viene incluido en tu sistema)

### 3. Datos de Acceso a tu VPS

Tu proveedor de VPS te habrá dado:
- 📍 **Dirección IP** (ejemplo: `213.199.61.64`)
- 👤 **Usuario:** `root`
- 🔑 **Contraseña:** (la que te enviaron por email)

---

## 🔌 PASO 1: Conectarte a tu Servidor

### En Windows (usando PuTTY):

1. **Abre PuTTY**
2. En "Host Name" escribe la **IP de tu servidor**
3. Asegúrate que "Port" sea **22**
4. Clic en **"Open"**
5. Si aparece una alerta de seguridad, clic en **"Yes"**
6. Te pedirá:
   - **login as:** escribe `root` y presiona Enter
   - **password:** escribe tu contraseña (no se verá mientras escribes, es normal)
7. ¡Listo! Ahora estás dentro de tu servidor

### En Mac/Linux (usando Terminal):

1. **Abre Terminal**
2. Escribe este comando (cambia la IP por la tuya):
   ```bash
   ssh root@213.199.61.64
   ```
3. Si pregunta "Are you sure?", escribe `yes` y Enter
4. Escribe tu contraseña cuando te la pida
5. ¡Listo! Estás conectado

**💡 Consejo:** Cuando estés conectado, verás algo como:
```
root@vmi2949230:~#
```
Esto significa que estás dentro del servidor y listo para trabajar.

---

## 🧹 PASO 2: Limpiar Instalaciones Anteriores (Si las hay)

**¿Por qué?** Si ya intentaste instalar antes, es mejor empezar limpio.

**¿Qué hace?** Elimina archivos viejos para evitar conflictos.

**Copia y pega** este bloque completo en tu terminal:

```bash
sudo systemctl stop adminssh-backend adminssh-frontend nginx 2>/dev/null
sudo systemctl disable adminssh-backend adminssh-frontend 2>/dev/null
sudo rm -rf /opt/panel-adminssh*
sudo rm -f /etc/systemd/system/adminssh-*.service
sudo rm -f /etc/nginx/sites-available/adminssh-*
sudo rm -f /etc/nginx/sites-enabled/adminssh-*
sudo rm -f install.sh
sudo -u postgres psql -c "DROP DATABASE IF EXISTS paneladminssh;" 2>/dev/null
sudo -u postgres psql -c "DROP USER IF EXISTS adminssh;" 2>/dev/null
sudo systemctl daemon-reload
```

**Resultado esperado:** Verás varios mensajes, algunos pueden decir "error" si no había nada instalado. **Eso es normal**, ignóralos.

---

## 📥 PASO 3: Descargar el Instalador

**¿Qué hace?** Descarga el programa instalador desde GitHub.

**Copia y pega** este comando:

```bash
wget https://raw.githubusercontent.com/mrelkin83/PanelAdminSSH/main/install.sh -O install.sh
```

**Resultado esperado:**
```
install.sh          100%[===================>]  12.34K  --.-KB/s    in 0.001s
```

Si ves esto, ✅ **¡Perfecto!** El instalador se descargó correctamente.

---

## 🔓 PASO 4: Dar Permisos al Instalador

**¿Qué hace?** Le da permiso al archivo para poder ejecutarse.

**Copia y pega:**

```bash
chmod +x install.sh
```

**Resultado esperado:** No muestra nada. Si no hay errores, está bien.

---

## ▶️ PASO 5: Ejecutar el Instalador

**¿Qué hace?** Inicia la instalación automática del panel.

**Copia y pega:**

```bash
sudo ./install.sh
```

**¡IMPORTANTE!** El instalador te hará **2 preguntas**. Aquí te explico qué responder:

---

### 📝 Pregunta 1: Subdominios

Verás esto:

```
[Panel AdminSSH] ════════════════════════════════════════════════════════
[Panel AdminSSH]   CONFIGURACIÓN DE SUBDOMINIOS
[Panel AdminSSH] ════════════════════════════════════════════════════════

[Panel AdminSSH] Si tienes subdominios configurados, ingrésalos aquí.
[Panel AdminSSH] Si no, presiona Enter para usar localhost (solo IP:puerto)

[Panel AdminSSH] Subdominio para el BACKEND API (ej: api.tudominio.com):
>
```

**¿Qué hacer?**

**OPCIÓN A - Instalación Simple (Recomendado para principiantes):**
- Simplemente presiona **Enter** (sin escribir nada)
- Presiona **Enter** de nuevo cuando pregunte por el frontend
- Usarás la **IP del servidor** para acceder

**OPCIÓN B - Con Subdominio (Requiere dominio propio):**
- Solo si tienes un dominio y sabes configurar DNS
- Ejemplo: `api.midominio.com`

**💡 Para principiantes:** Elige OPCIÓN A (solo presiona Enter)

---

### 🔐 Pregunta 2: SSL/HTTPS

Si elegiste subdominios (OPCIÓN B), verá:

```
[Panel AdminSSH] ¿Deseas instalar certificados SSL con Let's Encrypt? (s/n)
>
```

**Para principiantes:** Escribe `n` y presiona Enter

**Nota:** Si solo presionaste Enter en la pregunta anterior (OPCIÓN A), NO verás esta pregunta.

---

## ⏳ PASO 6: Esperar que Termine la Instalación

El instalador hará automáticamente:

1. ✅ Actualizar el sistema
2. ✅ Instalar Node.js
3. ✅ Instalar PostgreSQL (base de datos)
4. ✅ Configurar la base de datos
5. ✅ Descargar el código del panel
6. ✅ Instalar dependencias del backend (servidor)
7. ✅ Instalar dependencias del frontend (interfaz web)
8. ✅ Compilar el frontend
9. ✅ Crear servicios automáticos
10. ✅ Configurar Nginx (servidor web)

**Tiempo estimado:** 5-10 minutos

**💡 Verás mucho texto pasando.** Esto es normal. No cierres la ventana.

---

## ✅ PASO 7: Verificar que Todo Funcionó

Al final, verás un mensaje como este:

```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         ✓ Panel AdminSSH Instalado Exitosamente      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

✓ Instalación completada!

Información de acceso:
  URL Frontend: http://TU_IP:3000
  URL Backend:  http://TU_IP:5000

Credenciales de administrador:
  Email:    admin@paneladminssh.com
  Password: Mayte2024*#
```

**¡GUARDA ESTAS CREDENCIALES!** Las necesitarás para entrar.

---

## 🌐 PASO 8: Acceder al Panel

### 1. Abre tu Navegador Web

Puede ser:
- Google Chrome
- Firefox
- Edge
- Safari

### 2. En la Barra de Direcciones

Escribe la dirección que te mostró el instalador.

Si elegiste instalación simple (localhost):
```
http://TU_IP_DEL_VPS
```

**Ejemplo real:**
```
http://213.199.61.64
```

**💡 IMPORTANTE:**
- Usa `http://` (NO `https://`)
- NO agregues `www`
- Usa la IP que te dio tu proveedor de VPS

### 3. Iniciar Sesión

Verás una pantalla de login. Ingresa:

- **Email:** `admin@paneladminssh.com`
- **Contraseña:** `Mayte2024*#`

### 4. ¡Listo!

Si todo salió bien, verás el **Dashboard** del panel.

---

## 🔧 Comandos Útiles para el Futuro

### Ver si los servicios están funcionando:

```bash
systemctl status adminssh-backend
systemctl status adminssh-frontend
systemctl status nginx
```

### Reiniciar un servicio si algo falla:

```bash
systemctl restart adminssh-backend
systemctl restart adminssh-frontend
systemctl restart nginx
```

### Ver los logs (mensajes de error):

```bash
journalctl -u adminssh-backend -f
journalctl -u adminssh-frontend -f
```

(Presiona `Ctrl + C` para salir de los logs)

---

## ❌ Solución de Problemas Comunes

### Problema 1: "No puedo acceder a http://MI_IP"

**Causas posibles:**
1. El firewall está bloqueando el puerto 80

**Solución:**
```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

2. Nginx no está corriendo

**Solución:**
```bash
systemctl status nginx
systemctl start nginx
```

### Problema 2: "La página dice 'Cannot connect'"

**Causas posibles:**
1. Los servicios no están corriendo

**Solución:**
```bash
systemctl start adminssh-backend
systemctl start adminssh-frontend
systemctl start nginx
```

### Problema 3: "Olvidé mi contraseña"

**Solución:**
La contraseña por defecto es: `Mayte2024*#`
El email es: `admin@paneladminssh.com`

Si la cambiaste y la olvidaste, necesitarás reinstalar.

### Problema 4: "Puerto 80 en uso"

**Causas:** Otro servicio está usando el puerto 80

**Solución:**
```bash
# Ver qué está usando el puerto 80
sudo lsof -i :80

# Si es python.80.service
systemctl stop python.80.service
systemctl disable python.80.service

# Luego reinicia nginx
systemctl start nginx
```

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:

1. **Revisa los logs:** Usa los comandos de la sección "Ver los logs"
2. **Contacta al soporte:**
   - Telegram: @MrELkin
   - WhatsApp: +573124132002

---

## 🔄 ¿Cómo Actualizar el Panel?

Cuando haya actualizaciones disponibles:

```bash
cd /opt/panel-adminssh

# Backend
cd backend
git pull
npm install
npx prisma generate
systemctl restart adminssh-backend

# Frontend
cd ../frontend
git pull
npm install
npm run build
systemctl restart adminssh-frontend
```

---

## 🗑️ ¿Cómo Desinstalar Completamente?

Si quieres eliminar todo:

```bash
sudo systemctl stop adminssh-backend adminssh-frontend nginx
sudo systemctl disable adminssh-backend adminssh-frontend
sudo rm -rf /opt/panel-adminssh*
sudo rm -f /etc/systemd/system/adminssh-*.service
sudo rm -f /etc/nginx/sites-available/adminssh-*
sudo rm -f /etc/nginx/sites-enabled/adminssh-*
sudo -u postgres psql -c "DROP DATABASE IF EXISTS paneladminssh;"
sudo -u postgres psql -c "DROP USER IF EXISTS adminssh;"
sudo systemctl daemon-reload
```

---

## 📚 Glosario de Términos

**VPS:** Servidor virtual privado. Una computadora en la nube que rentas.

**SSH:** Forma segura de conectarte a tu servidor remotamente.

**IP:** Dirección única de tu servidor en internet (ejemplo: 213.199.61.64)

**Puerto:** Canal de comunicación (ejemplo: puerto 80 para web)

**Nginx:** Servidor web que maneja las conexiones HTTP

**Backend:** Parte del programa que maneja la lógica y base de datos

**Frontend:** Parte del programa que ves en el navegador (interfaz)

**PostgreSQL:** Sistema de base de datos donde se guarda la información

**Systemd:** Sistema que mantiene los programas corriendo automáticamente

**SSL/HTTPS:** Protocolo de seguridad para conexiones encriptadas

**Subdominio:** Extensión de un dominio (ejemplo: api.midominio.com)

---

## ✅ Checklist Final

Después de instalar, verifica:

- [ ] Puedo acceder a `http://MI_IP` en el navegador
- [ ] Puedo hacer login con las credenciales
- [ ] Veo el dashboard del panel
- [ ] Los servicios están corriendo:
  ```bash
  systemctl status adminssh-backend  # debe decir "active (running)"
  systemctl status adminssh-frontend # debe decir "active (running)"
  systemctl status nginx             # debe decir "active (running)"
  ```

Si todos tienen ✅, **¡felicitaciones! La instalación fue exitosa.**

---

**🎉 ¡Disfruta de tu Panel AdminSSH!**

---

*Desarrollado por @MrELkin*
*Versión de la guía: 1.0*
*Fecha: Diciembre 2024*
