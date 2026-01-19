# Cómo Funciona la Creación de Usuarios SSH

## ¿Qué es el TOKEN?

El **TOKEN** es la contraseña SSH que usa la **app VPN en el teléfono** para conectarse al servidor.

### Flujo de Creación de Usuario (Apps VPN)

1. **Usuario abre su app VPN en el teléfono** (HTTP Injector, HTTP Custom, etc.)
   - La app **genera un TOKEN** automáticamente
   - Usuario **copia ese TOKEN** de la app

2. **Usuario completa el formulario en el panel:**
   - Selecciona VPS
   - Ingresa **username** (nombre de usuario para el SSH)
   - Ingresa **password/TOKEN** (el TOKEN copiado de la app VPN)
   - Ingresa **días de validez**

3. **El panel se conecta al VPS remoto vía SSH**
   - Usa las credenciales del VPS (root)
   - Ejecuta comandos directos de Linux

4. **El panel crea el usuario SSH directamente:**
   - Crea la cuenta SSH con el username proporcionado
   - **Usa el TOKEN EXACTO que ingresaste** como contraseña
   - Configura la fecha de expiración
   - NO genera ningún token aleatorio

5. **El panel guarda los datos en la base de datos:**
   - Username
   - Password/TOKEN (el que ingresaste, encriptado)
   - Fecha de expiración
   - VPS asociado

## Datos Retornados por ADMRufu

Cuando ADMRufu crea un usuario exitosamente, retorna:

```
┌─────────────────────────────────────┐
│  USUARIO GENERADO CON EXITO!        │
├─────────────────────────────────────┤
│  IP DEL SERVIDOR: 213.199.61.64     │
│  NOMBRE ID: usuario001              │
│  TOKEN: xK9mP2nQ8vL5                │
│  EXPIRA EN: 15/01/2025              │
└─────────────────────────────────────┘
```

### Desglose de Campos:

- **IP DEL SERVIDOR**: IP del VPS donde se creó el usuario
- **NOMBRE ID**: Username del usuario SSH creado
- **TOKEN**: ⚠️ **Esta es la CONTRASEÑA SSH del usuario** ⚠️
- **EXPIRA EN**: Fecha en que el usuario dejará de tener acceso

## ¿Cómo se Conecta el Cliente?

El cliente SSH usará:

```bash
# Método de conexión SSH
ssh usuario001@213.199.61.64
Password: xK9mP2nQ8vL5  # <-- El TOKEN generado por ADMRufu
```

## ¿Hay Dos Contraseñas?

**NO.** Solo hay UNA contraseña: el TOKEN de la app VPN.

| Campo | Descripción |
|-------|-------------|
| **PASSWORD/TOKEN** (formulario) | El TOKEN de la app VPN que copias y pegas |

El panel usa **exactamente el TOKEN que ingresas** como la contraseña SSH. No genera ningún token adicional.

## Ejemplo Completo (Apps VPN)

### 1. Cliente Abre App VPN en su Teléfono

```
App VPN (HTTP Injector, HTTP Custom, etc.)
TOKEN Generado: XyZ7@kL9!mN2  ← Cliente copia este TOKEN
```

### 2. Crear Usuario en el Panel

```
VPS: VPS Contabo Principal
Username: cliente001
Password: XyZ7@kL9!mN2  ← Pega el TOKEN de la app VPN
Días: 30
```

### 3. Panel Confirma

```
✅ Usuario creado exitosamente!
   Servidor: 213.199.61.64
   Usuario: cliente001
   Token: XyZ7@kL9!mN2  ← El MISMO token que ingresaste
   Expira: 25/01/2025
```

### 4. Cliente Configura su App VPN

El cliente YA tiene el TOKEN en su app, solo necesita:

```
App VPN - Configuración:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Servidor: 213.199.61.64
Usuario SSH: cliente001
Token: XyZ7@kL9!mN2  ← Ya está en la app
Válido hasta: 25/01/2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Clic en CONECTAR
```

## Notas Importantes

⚠️ **IMPORTANTE**:
- El panel usa **EXACTAMENTE** el TOKEN que ingresas - no lo modifica ni genera uno nuevo
- El TOKEN que ingresas en el formulario es la contraseña SSH del usuario
- Este sistema está diseñado para **apps VPN** que generan sus propios tokens
- El cliente debe usar el MISMO TOKEN de su app VPN para conectarse

## Tipos de Usuarios Soportados

El sistema soporta **DOS tipos de usuarios**:

### 1. Usuarios SSH Tradicionales

Formato en `/etc/passwd`:
```
username:x:uid:gid:limit,password:/home/username:/bin/false
                    ^^^^^^^^^^^^^^
                    GECOS: "limit,password"
```

- **limit**: Número máximo de conexiones simultáneas
- **password**: Contraseña del usuario (para referencia)

### 2. Usuarios TOKEN (Apps VPN)

Formato en `/etc/passwd`:
```
username:x:uid:gid:token,ClienteID:/home/username:/bin/false
                    ^^^^^^^^^^^^^^
                    GECOS: "token,ClienteID"
```

- **token**: Indica que es un usuario TOKEN
- **ClienteID**: Nombre del cliente (ej: "Negrera", "elkin")

**Ejemplo real:**
```
Negrera:x:1001:1001:token,Negrera:/home/Negrera:/bin/false
```

Este usuario se muestra en ADMRufu como:
```
-ID: Negrera
TOKEN: [hash generado]
```

## Sincronización de Usuarios Existentes

El panel puede **importar AMBOS tipos de usuarios** que ya existen en el VPS a la base de datos.

### ¿Cómo funciona?

El sistema usa **comandos Linux directos** (NO el menú ADMRufu) para leer TODOS los usuarios:

```bash
# 1. Listar TODOS los usuarios SSH (tradicionales + TOKEN + HWID)
cat /etc/passwd | grep 'home' | grep 'false' | grep -v 'syslog' | grep -v '::/' | sort

# 2. Para cada usuario, obtener:
# - Fecha de expiración
chage -l username | sed -n '4p' | awk -F ': ' '{print $2}'

# - Estado (bloqueado/desbloqueado)
passwd --status username | cut -d ' ' -f2'  # P = unlocked, L = locked

# - Tipo de usuario y datos (del campo GECOS en /etc/passwd)
# Formatos posibles:
#   SSH tradicional: username:x:uid:gid:limit,password:home:shell
#   Usuario TOKEN:   username:x:uid:gid:token,ClienteID:home:shell
#   Usuario HWID:    username:x:uid:gid:hwid,ClienteID:home:shell
```

### Botón "Sincronizar VPS"

En la página de **Usuarios SSH**, el botón verde **"Sincronizar VPS"**:

1. Se conecta al VPS vía SSH
2. Lee `/etc/passwd` directamente
3. Para cada usuario encontrado:
   - Si **YA EXISTE** en la BD → Actualiza estado (activo/bloqueado/expiración)
   - Si **NO EXISTE** en la BD → Lo importa como nuevo usuario
4. Retorna: `{imported: X, skipped: Y, total: Z}`

**Nota:** Las contraseñas de usuarios importados no se conocen (se guarda `***`), solo se sincronizan los metadatos.

## Troubleshooting

### Error: "No se recibió confirmación de creación exitosa"

**Causas:**
1. Timeout muy corto - El menú ADMRufu no tuvo tiempo de responder
2. VPS no responde o está lento
3. Problema de conexión SSH

**Solución:**
- ✅ YA CORREGIDO: Se usa método directo `createSSHUserDirect()` que no usa menú ADMRufu
- ✅ YA CORREGIDO: Usa comandos Linux directos: `useradd` y `chpasswd`
- Verifica que el VPS esté respondiendo correctamente
- Revisa los logs del backend para ver errores SSH

### La sincronización falla o no encuentra usuarios

**Causas:**
1. Los usuarios no tienen home directory
2. Los usuarios usan shell diferente a `/bin/false`
3. Problema de permisos SSH

**Solución:**
- ✅ YA CORREGIDO: Se usa método directo `listSSHUsersDirect()` que lee `/etc/passwd`
- ✅ YA CORREGIDO: Soporta usuarios SSH tradicionales Y usuarios TOKEN/HWID
- Verifica que los usuarios tengan formato válido:
  - SSH: `username:x:uid:gid:limit,password:/home/username:/bin/false`
  - TOKEN: `username:x:uid:gid:token,ClienteID:/home/username:/bin/false`
- Revisa los logs del backend (modo debug) para ver el output de los comandos

### El usuario no puede conectarse

**Verifica:**
1. ¿Está usando el TOKEN (no la password del panel)?
2. ¿El usuario no ha expirado?
3. ¿El usuario no está bloqueado?
4. ¿El VPS está activo y respondiendo?

---

**Última actualización:** 26 de Diciembre de 2025
**Versión del Panel:** 1.0.0
