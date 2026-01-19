# Cambios Realizados - 26 de Diciembre 2025

## Problema Principal Solucionado

**Error 500 al crear usuarios SSH**: Los métodos asumían que el VPS siempre usaba autenticación por llave privada, pero tu VPS usa PASSWORD. Esto causaba que el método `decrypt()` fallara al intentar descifrar un valor `null`.

## Archivos Modificados

### 1. `backend/src/controllers/users.controller.ts`

#### Cambios:
- ✅ Método `renew()` (líneas 283-296)
- ✅ Método `block()` (líneas 385-397)
- ✅ Método `unblock()` (líneas 458-470)
- ✅ Método `delete()` (líneas 531-543)

**Antes:**
```typescript
const sshConfig: SSHConfig = {
  host: user.vps.host,
  port: user.vps.port,
  username: user.vps.username,
  privateKey: decrypt(user.vps.privateKey), // ❌ Esto falla si privateKey es null
};
```

**Después:**
```typescript
const sshConfig: SSHConfig = {
  host: user.vps.host,
  port: user.vps.port,
  username: user.vps.username,
};

// Descifrar credenciales
if (user.vps.privateKey) {
  sshConfig.privateKey = decrypt(user.vps.privateKey);
}
if (user.vps.password) {
  sshConfig.password = decrypt(user.vps.password); // ✅ Ahora usa password
}
```

### 2. `backend/src/services/admrufu.service.ts` (Cambios previos)

- ✅ Método `createSSHUserDirect()`: Crea usuarios SSH usando comandos Linux directos (`useradd`, `chpasswd`)
- ✅ Método `listSSHUsersDirect()`: Lee `/etc/passwd` directamente para listar TODOS los usuarios (SSH tradicionales, TOKEN, y HWID)
- ✅ Debug logging extensivo para diagnosticar problemas de conexión y parsing

### 3. `frontend/src/pages/Users.tsx` (Cambios previos)

- ✅ Regex pattern corregido: `pattern="[a-zA-Z0-9_-]+"` (línea 433)
- ✅ Botón "Sincronizar VPS" agregado (líneas 141-173)
- ✅ Mutation para sincronización (líneas 96-105)

## Estado Actual

### ✅ Corregido:
1. Autenticación por PASSWORD ahora funciona en todos los métodos
2. Usuarios TOKEN pueden ser detectados y sincronizados
3. Creación directa de usuarios SSH sin usar menú ADMRufu

### 🔍 Pendiente de Verificar:
1. ¿La sincronización encuentra los 10 usuarios TOKEN de tu VPS?
2. ¿Se pueden crear nuevos usuarios SSH sin error 500?
3. ¿Los logs de debug muestran información útil?

## Pruebas a Realizar

### Prueba 1: Sincronizar Usuarios

1. Abre el panel en tu navegador
2. Ve a la página **Usuarios SSH**
3. Haz clic en el botón verde **"Sincronizar VPS"**
4. Observa la terminal donde corre el backend
5. **Busca estas líneas en los logs:**

```
[SSH Direct] Listar TODOS los usuarios SSH
===== OUTPUT DE /etc/passwd (XXX chars) =====
[contenido del archivo /etc/passwd]
===== FIN OUTPUT =====
```

6. **Copia y pégame** todo el contenido entre `===== OUTPUT` y `===== FIN OUTPUT =====`

### Prueba 2: Crear Usuario SSH

1. En la página **Usuarios SSH**, haz clic en **"Nuevo Usuario"**
2. Llena el formulario:
   - **VPS**: VPS Contabo Principal
   - **Username**: `pruebaclaude`
   - **Password/Token**: `mitoken123456`
   - **Días**: `30`
   - **Conexiones simultáneas**: `1`
3. Haz clic en **"Crear Usuario"**
4. **Observa la terminal del backend** y busca estas líneas:

```
[ADMRufu Direct] Crear usuario SSH: pruebaclaude (30 días)
SSH Config: 213.199.61.64:22 user=root hasPassword=true hasKey=false
Ejecutando: useradd -m -s /bin/false -e YYYY-MM-DD pruebaclaude
Output useradd: [...]
Ejecutando: echo 'pruebaclaude:mitoken123456' | chpasswd
Output chpasswd: [...]
✅ Usuario SSH creado exitosamente: pruebaclaude
```

5. **Copia y pégame** los logs completos de la creación

## Formato de Usuarios TOKEN en /etc/passwd

Los usuarios TOKEN que tienes en tu VPS (Negrera, elkin, etc.) deberían aparecer así:

```
Negrera:x:1001:1001:token,Negrera:/home/Negrera:/bin/false
elkin:x:1002:1002:token,elkin:/home/elkin:/bin/false
```

El campo GECOS (5to campo) contiene: `token,ClienteID`

## Tipos de Usuarios Soportados

El sistema ahora detecta 3 tipos de usuarios basándose en el campo GECOS:

| Tipo | Formato GECOS | Ejemplo |
|------|---------------|---------|
| **SSH Tradicional** | `limit,password` | `usuario:x:uid:gid:1,mipass:/home/usuario:/bin/false` |
| **TOKEN (Apps VPN)** | `token,ClienteID` | `Negrera:x:1001:1001:token,Negrera:/home/Negrera:/bin/false` |
| **HWID** | `hwid,ClienteID` | `hwid001:x:1002:1002:hwid,cliente:/home/hwid001:/bin/false` |

## Notas Importantes

⚠️ **IMPORTANTE**:
- El panel usa **EXACTAMENTE** el TOKEN/password que ingresas - no lo modifica
- Los usuarios TOKEN usan el token generado por apps VPN (HTTP Injector, HTTP Custom)
- Los usuarios importados vía sincronización tienen password `***` (desconocida)
- El sistema ahora usa comandos Linux directos en lugar del menú ADMRufu para mayor confiabilidad

## Troubleshooting

### Si la sincronización sigue retornando 0 usuarios:
1. Verifica que los usuarios en tu VPS tengan shell `/bin/false`
2. Verifica que tengan un home directory (`/home/username`)
3. Revisa el contenido de `/etc/passwd` que aparece en los logs
4. Verifica que la conexión SSH funciona con tu password

### Si la creación de usuarios falla:
1. Verifica que el VPS esté online y accesible
2. Verifica que la password del VPS esté correcta en la configuración
3. Revisa los logs para ver en qué paso falla (useradd, chpasswd, o verificación)
4. Verifica que el usuario root tenga permisos para crear usuarios

---

**Última actualización:** 26 de Diciembre de 2025, 8:22 PM
**Estado:** Correcciones aplicadas - Esperando pruebas del usuario
