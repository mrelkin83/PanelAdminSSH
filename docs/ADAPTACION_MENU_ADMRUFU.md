# Adaptación al Menú Interactivo de ADMRufu

## 🎯 Objetivo

Este documento explica cómo adaptar el servicio `ADMRufuService` para que funcione correctamente con el menú interactivo real de ADMRufu instalado en tus VPS.

## ⚠️ IMPORTANTE

ADMRufu NO tiene comandos CLI directos. Es un menú interactivo basado en shell que:

1. Muestra opciones numeradas
2. Espera input del usuario (stdin)
3. Muestra resultados en stdout
4. Navega entre submenús

## 📋 Pasos para Adaptar el Sistema

### 1. Conectarse al VPS y Explorar el Menú

Primero, conecta manualmente al VPS para entender la estructura del menú:

```bash
# Conectar al VPS
ssh root@IP_VPS

# Ejecutar el menú de ADMRufu
menu
# o
adm
```

### 2. Documentar la Estructura del Menú

Documenta la estructura completa del menú. Por ejemplo:

```
==============================================
        MENU PRINCIPAL ADMRufu
==============================================

[1] Gestión de Usuarios SSH
[2] Gestión de Usuarios TOKEN
[3] Gestión de Usuarios HWID
[4] Monitor de Conexiones
[5] Configuraciones
[0] Salir

Seleccione una opción:
```

Luego, al seleccionar la opción 1:

```
==============================================
      GESTIÓN DE USUARIOS SSH
==============================================

[1] Crear Usuario SSH
[2] Renovar Usuario
[3] Eliminar Usuario
[4] Bloquear Usuario
[5] Desbloquear Usuario
[6] Listar Usuarios
[0] Volver al menú principal

Seleccione una opción:
```

Y al seleccionar crear usuario:

```
==============================================
        CREAR USUARIO SSH
==============================================

Ingrese el nombre de usuario: _
```

```
Ingrese la contraseña: _
```

```
Ingrese los días de validez: _
```

```
Usuario 'usuario1' creado exitosamente!

Presione ENTER para continuar...
```

### 3. Identificar Patrones Clave

Identifica los patrones de texto que aparecen:

- **Prompts de input**: `Ingrese`, `Digite`, `Escriba`, `: _`, `:`
- **Mensajes de éxito**: `exitosamente`, `creado correctamente`, `SUCCESS`, `OK`
- **Mensajes de error**: `ERROR`, `error`, `fallo`, `no existe`, `ya existe`
- **Títulos de menú**: `MENU PRINCIPAL`, `====`, `[1]`, `[0]`

### 4. Modificar ADMRufuMenuParser

Edita `backend/src/services/admrufu.service.ts` en la clase `ADMRufuMenuParser`:

```typescript
class ADMRufuMenuParser {
  /**
   * Detecta si el menú principal está visible
   * ADAPTAR SEGÚN TU MENU REAL
   */
  static isMainMenuVisible(output: string): boolean {
    // Busca los textos exactos que aparecen en TU menú principal
    return (
      output.includes('MENU PRINCIPAL') ||           // Cambia esto
      output.includes('ADMRufu') ||                  // y esto
      output.includes('Seleccione una opción') ||    // y esto
      /\[0\]\s*Salir/i.test(output)                  // según lo que veas
    );
  }

  /**
   * Detecta si está esperando input
   * ADAPTAR SEGÚN TU MENU REAL
   */
  static isWaitingForInput(output: string): boolean {
    const lastLine = output.trim().split('\n').pop() || '';

    return (
      lastLine.includes('Ingrese') ||                // Textos exactos
      lastLine.includes('Digite') ||                 // que aparecen
      lastLine.includes('Escriba') ||                // cuando pide
      lastLine.includes('nombre de usuario:') ||     // datos al
      lastLine.includes('contraseña:') ||            // usuario
      lastLine.includes('días:') ||
      /:\s*_?\s*$/.test(lastLine) ||                 // Termina en ": _" o ":"
      /\>\s*$/.test(lastLine)                        // Termina en ">"
    );
  }

  /**
   * Detecta mensajes de éxito
   * ADAPTAR SEGÚN TU MENU REAL
   */
  static detectSuccess(output: string): boolean {
    const lastLines = output.split('\n').slice(-5).join('\n').toLowerCase();

    return (
      lastLines.includes('exitosamente') ||          // Palabras de éxito
      lastLines.includes('creado correctamente') ||  // que usa
      lastLines.includes('renovado') ||              // ADMRufu
      lastLines.includes('eliminado') ||
      lastLines.includes('bloqueado') ||
      lastLines.includes('desbloqueado') ||
      lastLines.includes('success') ||
      lastLines.includes('ok')
    );
  }

  /**
   * Detecta mensajes de error
   * ADAPTAR SEGÚN TU MENU REAL
   */
  static detectError(output: string): boolean {
    const lastLines = output.split('\n').slice(-5).join('\n').toLowerCase();

    return (
      lastLines.includes('error') ||
      lastLines.includes('fallo') ||
      lastLines.includes('no existe') ||
      lastLines.includes('ya existe') ||
      lastLines.includes('inválido') ||
      lastLines.includes('incorrecto') ||
      lastLines.includes('falló')
    );
  }
}
```

### 5. Modificar la Función createSSHUser

Esta es la función más crítica. Adapta la secuencia de opciones:

```typescript
static async createSSHUser(
  sshConfig: SSHConfig,
  username: string,
  password: string,
  days: number
): Promise<{ success: boolean; output: string; error?: string }> {
  let session: ShellSession | null = null;

  try {
    logger.info(`Creando usuario SSH: ${username}`);

    // Abrir sesión shell
    session = await SSHInteractiveService.openShellSession(sshConfig);

    // Iniciar menú
    await this.startMenu(session);

    // AQUÍ ADAPTAS SEGÚN LA ESTRUCTURA REAL DE TU MENU

    // Ejemplo 1: Si el menú tiene esta estructura:
    // [1] Gestión de Usuarios SSH -> [1] Crear Usuario

    logger.debug('Navegando al menú de gestión de usuarios...');
    await this.selectMenuOption(session, '1');  // Gestión de Usuarios SSH
    await new Promise(resolve => setTimeout(resolve, 1500));

    logger.debug('Seleccionando crear usuario...');
    await this.selectMenuOption(session, '1');  // Crear Usuario
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Ejemplo 2: Si el menú es diferente, ajusta los números:
    // await this.selectMenuOption(session, '2');  // Otra opción
    // await this.selectMenuOption(session, '3');  // Otra opción

    // Enviar nombre de usuario
    logger.debug(`Enviando username: ${username}`);
    await SSHInteractiveService.sendCommand(session, username, undefined, 2000);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enviar password
    logger.debug('Enviando password...');
    await SSHInteractiveService.sendCommand(session, password, undefined, 2000);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enviar días
    logger.debug(`Enviando días: ${days}`);
    await SSHInteractiveService.sendCommand(session, days.toString(), undefined, 2000);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Si hay confirmación adicional, presionar ENTER
    await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

    // Verificar resultado
    const success = ADMRufuMenuParser.detectSuccess(session.output);
    const hasError = ADMRufuMenuParser.detectError(session.output);

    if (hasError) {
      const lines = session.output.split('\n');
      const errorLine = lines.find(line =>
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('fallo')
      );

      logger.error(`Error detectado: ${errorLine}`);
      return {
        success: false,
        output: session.output,
        error: errorLine || 'Error desconocido',
      };
    }

    // Salir del menú
    await this.exitMenu(session);

    logger.info(`Usuario creado: ${success ? 'SUCCESS' : 'UNKNOWN'}`);
    return {
      success,
      output: session.output,
    };
  } catch (error: any) {
    logger.error(`Error en createSSHUser: ${error.message}`);
    return {
      success: false,
      output: session?.output || '',
      error: error.message,
    };
  } finally {
    if (session) {
      SSHInteractiveService.closeSession(session);
    }
  }
}
```

### 6. Probar Manualmente

Crea un script de prueba para validar:

```typescript
// backend/test-admrufu.ts
import { SSHInteractiveService } from './src/services/ssh-interactive.service';
import { ADMRufuService } from './src/services/admrufu.service';
import { SSHConfig } from './src/types';
import * as fs from 'fs';

async function testADMRufu() {
  const sshConfig: SSHConfig = {
    host: 'TU_IP_VPS',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('/path/to/private/key', 'utf8'),
  };

  console.log('1. Probando conexión SSH...');
  const connected = await SSHInteractiveService.testConnection(sshConfig);
  console.log(`Conexión: ${connected ? 'OK' : 'FAIL'}`);

  if (!connected) return;

  console.log('\n2. Verificando ADMRufu instalado...');
  const hasADMRufu = await SSHInteractiveService.checkADMRufuInstalled(sshConfig);
  console.log(`ADMRufu: ${hasADMRufu ? 'INSTALADO' : 'NO INSTALADO'}`);

  if (!hasADMRufu) return;

  console.log('\n3. Obteniendo versión...');
  const version = await SSHInteractiveService.getADMRufuVersion(sshConfig);
  console.log(`Versión: ${version}`);

  console.log('\n4. Creando usuario de prueba...');
  const result = await ADMRufuService.createSSHUser(
    sshConfig,
    'test_user_' + Date.now(),
    'test_pass_123',
    7
  );

  console.log(`\nResultado: ${result.success ? 'SUCCESS' : 'FAIL'}`);
  console.log(`\nOutput completo:\n${result.output}`);

  if (!result.success) {
    console.log(`\nError: ${result.error}`);
  }
}

testADMRufu();
```

Ejecutar:

```bash
cd backend
npx tsx test-admrufu.ts
```

### 7. Debugging: Ver el Output Completo

Agrega logs detallados para ver exactamente qué recibe del menú:

```typescript
// En admrufu.service.ts, en createSSHUser

logger.debug('=== OUTPUT COMPLETO ===');
logger.debug(session.output);
logger.debug('=== FIN OUTPUT ===');

// También puedes guardar en archivo
fs.writeFileSync(
  '/tmp/admrufu-output.txt',
  session.output,
  'utf8'
);
```

### 8. Método Alternativo: Comandos Directos

Si el menú interactivo es demasiado complejo o inestable, usa comandos directos del sistema:

```typescript
// Este método NO usa el menú de ADMRufu
// Crea usuarios directamente con comandos Linux
static async createSSHUserDirect(
  sshConfig: SSHConfig,
  username: string,
  password: string,
  days: number
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const command = `
    useradd -M -s /bin/false -e $(date -d "+${days} days" +%Y-%m-%d) ${username} &&
    echo "${username}:${password}" | chpasswd &&
    echo "Usuario creado exitosamente"
  `;

  const result = await SSHInteractiveService.executeCommand(sshConfig, command.trim());

  return {
    success: result.success && result.stdout.includes('exitosamente'),
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
```

## 🔍 Ejemplo Real de Debugging

### Paso 1: Conectar y capturar output

```bash
ssh root@IP_VPS
menu

# Copiar TODO el texto que aparece
# Guardar en archivo menu-structure.txt
```

### Paso 2: Analizar patrones

```
Buscar:
- ¿Cómo se ve el menú principal?
- ¿Qué números corresponden a "Crear Usuario"?
- ¿Qué texto aparece cuando pide username?
- ¿Qué texto aparece cuando pide password?
- ¿Qué texto aparece cuando pide días?
- ¿Qué texto aparece cuando el usuario se crea exitosamente?
- ¿Qué texto aparece cuando hay un error?
```

### Paso 3: Ajustar código

Basándote en los patrones encontrados, ajusta:

1. `ADMRufuMenuParser.isMainMenuVisible()`
2. `ADMRufuMenuParser.isWaitingForInput()`
3. `ADMRufuMenuParser.detectSuccess()`
4. `ADMRufuMenuParser.detectError()`
5. Secuencia de opciones en `createSSHUser()`

## 🛠️ Herramientas de Debugging

### 1. Script para capturar el menú

```typescript
// capture-menu.ts
async function captureMenu() {
  const session = await SSHInteractiveService.openShellSession(sshConfig);

  await SSHInteractiveService.sendCommand(session, 'menu', undefined, 2000);

  console.log('=== MENU OUTPUT ===');
  console.log(session.output);
  console.log('=== END ===');

  fs.writeFileSync('menu-capture.txt', session.output);

  SSHInteractiveService.closeSession(session);
}
```

### 2. Logger mejorado

```typescript
// Agrega esto al principio de createSSHUser
const debugLog = (step: string, output: string) => {
  logger.debug(`[STEP] ${step}`);
  logger.debug(`[OUTPUT] ${output.split('\n').slice(-5).join('\n')}`);
};

debugLog('Después de abrir menú', session.output);
debugLog('Después de opción 1', session.output);
debugLog('Después de username', session.output);
// etc...
```

## ✅ Checklist de Adaptación

- [ ] Documenté la estructura completa del menú ADMRufu
- [ ] Identifiqué las opciones exactas para crear usuario
- [ ] Identifiqué los prompts de input (username, password, días)
- [ ] Identifiqué mensajes de éxito
- [ ] Identifiqué mensajes de error
- [ ] Actualicé `ADMRufuMenuParser.isMainMenuVisible()`
- [ ] Actualicé `ADMRufuMenuParser.isWaitingForInput()`
- [ ] Actualicé `ADMRufuMenuParser.detectSuccess()`
- [ ] Actualicé `ADMRufuMenuParser.detectError()`
- [ ] Actualicé la secuencia de opciones en `createSSHUser()`
- [ ] Probé crear usuario con script de prueba
- [ ] Verifiqué que el usuario se creó en el VPS
- [ ] Probé listar usuarios
- [ ] Probé renovar usuario
- [ ] Probé bloquear/desbloquear usuario
- [ ] Probé eliminar usuario

## 🎯 Resultado Esperado

Después de adaptar correctamente:

```typescript
const result = await ADMRufuService.createSSHUser(
  sshConfig,
  'usuario1',
  'pass123',
  30
);

// result.success === true
// Usuario creado en el VPS
// Visible en: ssh usuario1@IP_VPS
```

## 📞 Siguiente Paso

Una vez adaptado el servicio ADMRufu:

1. Reemplaza `users.controller.ts` con `users.controller.updated.ts`
2. Reemplaza `vps.controller.ts` con `vps.controller.updated.ts`
3. Actualiza imports en los archivos de rutas
4. Reinicia el backend
5. Prueba crear un usuario desde la API

```bash
# Test API
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vpsId": "VPS_ID",
    "username": "test1",
    "password": "pass123",
    "days": 30
  }'
```
