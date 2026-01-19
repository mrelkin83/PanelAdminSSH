# Prueba Real con VPS ADMRufu

## Ejecutar Prueba

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Editar configuración SSH

Abrir `test-interactive-menu.ts` y editar:

```typescript
const SSH_CONFIG = {
  host: '192.168.1.100',              // ← TU IP
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/home/user/.ssh/id_rsa', 'utf8'),  // ← TU CLAVE
};
```

### 3. Ejecutar

```bash
npx tsx test-interactive-menu.ts
```

## Qué verás

```
🔌 Conectando a 192.168.1.100:22...
✅ SSH conectado, abriendo shell...
✅ Shell abierto

[OUTPUT DEL VPS EN TIEMPO REAL]

📤 Enviando: "menu"

[MENÚ DE ADMRUFU]

📥 Recibido (XXX caracteres):
────────────────────────────────────────────────────────
[CONTENIDO DEL MENÚ]
────────────────────────────────────────────────────────

💾 Output completo guardado en: admrufu-output.txt
```

## Siguiente paso

Con el output capturado en `admrufu-output.txt`:

1. Identificar estructura del menú
2. Identificar opciones para crear usuario
3. Adaptar `admrufu-menu-only.service.ts`
4. Probar crear usuario real

## Código Clave

### Abrir sesión shell:

```typescript
const conn = new Client();

conn.on('ready', () => {
  conn.shell({ term: 'xterm' }, (err, stream) => {
    // stream = sesión shell interactiva

    stream.on('data', (data) => {
      // Capturar TODO el output
      output += data.toString('utf8');
    });
  });
});

conn.connect({
  host: '192.168.1.100',
  port: 22,
  username: 'root',
  privateKey: 'contenido de clave privada'
});
```

### Ejecutar comando en el menú:

```typescript
stream.write('menu\n');      // Ejecutar menú
// esperar...
stream.write('1\n');         // Seleccionar opción 1
// esperar...
stream.write('usuario1\n');  // Enviar username
```

### Navegar opciones:

```typescript
// Menú principal -> Opción 1
await sendCommand(session, '1', 2000);

// Submenú -> Opción 1
await sendCommand(session, '1', 2000);

// Enviar datos
await sendCommand(session, 'usuario1', 1500);
await sendCommand(session, 'password123', 1500);
await sendCommand(session, '30', 2000);
```

## Output Real Esperado

```
==============================================
        MENU PRINCIPAL ADMRufu
==============================================

[1] Gestión de Usuarios SSH
[2] Gestión de Usuarios TOKEN
[3] Monitor
[0] Salir

Seleccione una opción: _
```

## Validación

Después de ejecutar `test-interactive-menu.ts`:

✅ Debe conectarse al VPS
✅ Debe abrir shell
✅ Debe ejecutar `menu`
✅ Debe mostrar el menú de ADMRufu
✅ Debe guardar output en `admrufu-output.txt`

Si falla, revisar:
- IP correcta
- Puerto SSH abierto (22)
- Clave privada válida
- ADMRufu instalado en el VPS
