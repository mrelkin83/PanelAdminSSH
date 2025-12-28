# Guía de Instalación - Panel AdminSSH

## Requisitos Previos

- VPS con Ubuntu 20.04 o superior
- Acceso root al servidor
- (Opcional) Dominios configurados apuntando a tu servidor

## Instalación Rápida

```bash
wget https://raw.githubusercontent.com/mrelkin83/PanelAdminSSH/main/install.sh -O install.sh && chmod +x install.sh && sudo ./install.sh
```

## Configuración de Dominios

Durante la instalación, el script te preguntará por los subdominios:

### Opción 1: Instalación Local (Sin Dominios)

Simplemente presiona **Enter** cuando te pregunte por los subdominios:

```
Ingresa el subdominio para el BACKEND (ej: api.tudominio.com) [localhost]:
> [Enter]

Ingresa el subdominio para el FRONTEND (ej: app.tudominio.com) [localhost]:
> [Enter]
```

**Acceso:**
- Frontend: `http://TU_IP:3000`
- Backend: `http://TU_IP:5000`

### Opción 2: Con Subdominios

Antes de instalar, configura los registros DNS:

| Subdominio | Tipo | Valor |
|------------|------|-------|
| `api.tudominio.com` | A | IP_DE_TU_VPS |
| `app.tudominio.com` | A | IP_DE_TU_VPS |

Luego, durante la instalación:

```
Ingresa el subdominio para el BACKEND (ej: api.tudominio.com) [localhost]:
> api.tudominio.com

Ingresa el subdominio para el FRONTEND (ej: app.tudominio.com) [localhost]:
> app.tudominio.com
```

**Acceso:**
- Frontend: `https://app.tudominio.com`
- Backend: `https://api.tudominio.com`

## Configuración SSL/HTTPS

Si configuraste subdominios, el instalador te preguntará si deseas instalar SSL:

```
¿Desea configurar SSL/HTTPS con Let's Encrypt? (s/n)
> s
```

Esto instalará automáticamente certificados SSL usando Let's Encrypt.

⚠️ **Importante:** Los registros DNS deben estar propagados antes de instalar SSL.

## Credenciales por Defecto

Si no configuras credenciales personalizadas durante la instalación:

- **Email:** admin@paneladminssh.com
- **Password:** Mayte2024*#

⚠️ **Cambia estas credenciales después del primer login**

## Comandos Útiles

### Ver logs
```bash
# Backend
journalctl -u adminssh-backend -f

# Frontend
journalctl -u adminssh-frontend -f
```

### Reiniciar servicios
```bash
# Backend
systemctl restart adminssh-backend

# Frontend
systemctl restart adminssh-frontend

# Nginx
systemctl restart nginx
```

### Verificar estado
```bash
# Servicios
systemctl status adminssh-backend
systemctl status adminssh-frontend

# Nginx
nginx -t
systemctl status nginx
```

## Renovación SSL

Los certificados SSL se renuevan automáticamente. Para renovar manualmente:

```bash
certbot renew
```

## Estructura de Instalación

```
/opt/panel-adminssh/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── .env
└── frontend/
    ├── dist/
    └── .env
```

## Configuración de Nginx

### Backend
- Archivo: `/etc/nginx/sites-available/adminssh-backend`
- Puerto interno: 5000
- Dominio/IP configurado durante instalación

### Frontend
- Archivo: `/etc/nginx/sites-available/adminssh-frontend`
- Puerto interno: 3000
- Dominio/IP configurado durante instalación

## Solución de Problemas

### El frontend no se conecta al backend

Verifica que el archivo `/opt/panel-adminssh/frontend/.env` tenga la URL correcta:

```bash
cat /opt/panel-adminssh/frontend/.env
```

Debe mostrar:
```
VITE_API_URL=https://api.tudominio.com/api/v1
```

### Error de conexión a PostgreSQL

Verifica las credenciales en `/opt/panel-adminssh/backend/.env`

### Nginx no inicia

```bash
# Verificar configuración
nginx -t

# Ver logs
journalctl -u nginx -f
```

## Actualización

Para actualizar el panel:

```bash
cd /opt/panel-adminssh
git pull
cd backend && npm install && npx prisma generate
cd ../frontend && npm install && npm run build
systemctl restart adminssh-backend adminssh-frontend
```

## Soporte

- **Telegram:** @MrELkin
- **WhatsApp:** +573124132002
- **GitHub:** https://github.com/mrelkin83/PanelAdminSSH

---

**Desarrollado por @MrELkin**
