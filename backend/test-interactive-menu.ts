/**
 * Script de prueba para validar interacción con menú ADMRufu
 *
 * USO:
 * 1. Editar las credenciales SSH abajo
 * 2. npm install ssh2
 * 3. npx tsx test-interactive-menu.ts
 */

import { Client, ClientChannel } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

// ==================== CONFIGURACIÓN ====================
// EDITAR ESTOS VALORES:

const SSH_CONFIG = {
  host: '213.199.61.64',           // Ejemplo: '192.168.1.100'
  port: 22,
  username: 'root',
  password: 'M@ytE.2024*#Teo.2017',
};

// ==================== CÓDIGO DE PRUEBA ====================

interface ShellSession {
  stream: ClientChannel;
  output: string;
}

/**
 * 1. ABRIR SESIÓN SHELL INTERACTIVA
 */
function openShellSession(config: typeof SSH_CONFIG): Promise<ShellSession> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    console.log(`\n🔌 Conectando a ${config.host}:${config.port}...`);

    conn.on('ready', () => {
      console.log('✅ SSH conectado, abriendo shell...');

      conn.shell({ term: 'xterm' }, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        console.log('✅ Shell abierto\n');

        // Capturar TODO el output
        stream.on('data', (data: Buffer) => {
          const text = data.toString('utf8');
          output += text;

          // Mostrar en consola en tiempo real
          process.stdout.write(text);
        });

        stream.stderr.on('data', (data: Buffer) => {
          console.error('STDERR:', data.toString('utf8'));
        });

        stream.on('close', () => {
          console.log('\n\n🔌 Stream cerrado');
          conn.end();
        });

        // Esperar 1 segundo a que aparezca el prompt
        setTimeout(() => {
          resolve({ stream, output });
        }, 1000);
      });
    });

    conn.on('error', (err: Error) => {
      console.error('❌ Error de conexión SSH:', err.message);
      reject(err);
    });

    conn.connect(config);
  });
}

/**
 * 2. ENVIAR COMANDO Y ESPERAR RESPUESTA
 */
function sendCommand(
  session: ShellSession,
  command: string,
  waitMs: number = 2000
): Promise<string> {
  return new Promise((resolve) => {
    const outputBefore = session.output.length;

    console.log(`\n📤 Enviando: "${command}"`);
    session.stream.write(command + '\n');

    // Esperar respuesta
    setTimeout(() => {
      const newOutput = session.output.substring(outputBefore);
      console.log(`\n📥 Recibido (${newOutput.length} caracteres):\n`);
      console.log('─'.repeat(60));
      console.log(newOutput);
      console.log('─'.repeat(60));
      resolve(newOutput);
    }, waitMs);
  });
}

/**
 * 3. CERRAR SESIÓN
 */
function closeSession(session: ShellSession): void {
  console.log('\n🔒 Cerrando sesión...');
  session.stream.write('exit\n');
  session.stream.end();
}

/**
 * FUNCIÓN PRINCIPAL DE PRUEBA
 */
async function testADMRufuMenu() {
  let session: ShellSession | null = null;

  try {
    // Paso 1: Abrir sesión
    session = await openShellSession(SSH_CONFIG);

    console.log('\n' + '='.repeat(60));
    console.log('PRUEBA 1: EJECUTAR MENÚ ADMRUFU');
    console.log('='.repeat(60));

    // Paso 2: Ejecutar comando 'menu'
    await sendCommand(session, 'menu', 3000);

    console.log('\n' + '='.repeat(60));
    console.log('PRUEBA 2: SELECCIONAR OPCIÓN DEL MENÚ');
    console.log('='.repeat(60));
    console.log('⚠️  REVISA EL OUTPUT ARRIBA');
    console.log('⚠️  Identifica qué número corresponde a "Listar Usuarios" o similar');
    console.log('\n💡 Para continuar la prueba, edita este script y:');
    console.log('   1. Descomentar la siguiente línea');
    console.log('   2. Cambiar el número por la opción correcta');
    console.log('   3. Re-ejecutar el script\n');

    // DESCOMENTAR Y AJUSTAR EL NÚMERO DE OPCIÓN:
    // await sendCommand(session, '1', 3000);  // Ejemplo: opción 1

    console.log('\n' + '='.repeat(60));
    console.log('ANÁLISIS DEL OUTPUT:');
    console.log('='.repeat(60));

    // Análisis básico
    const fullOutput = session.output;

    console.log(`\n📊 Total de caracteres capturados: ${fullOutput.length}`);
    console.log(`📊 Total de líneas: ${fullOutput.split('\n').length}`);

    // Buscar patrones comunes
    const patterns = [
      'MENU',
      'menu',
      'ADMRufu',
      'Seleccione',
      'Digite',
      'Ingrese',
      'Escriba',
      '[1]',
      '[2]',
      '[0]',
    ];

    console.log('\n🔍 Patrones encontrados:');
    patterns.forEach(pattern => {
      if (fullOutput.includes(pattern)) {
        const count = (fullOutput.match(new RegExp(pattern, 'g')) || []).length;
        console.log(`   ✓ "${pattern}" (${count} veces)`);
      } else {
        console.log(`   ✗ "${pattern}" no encontrado`);
      }
    });

    // Últimas 20 líneas del output
    console.log('\n📄 Últimas 20 líneas del output:');
    console.log('─'.repeat(60));
    const lines = fullOutput.split('\n').filter(l => l.trim());
    const last20 = lines.slice(-20);
    last20.forEach((line, i) => {
      console.log(`${String(lines.length - 20 + i).padStart(4, ' ')} | ${line}`);
    });
    console.log('─'.repeat(60));

    // Guardar output completo en archivo
    const outputFile = path.join(__dirname, 'admrufu-output.txt');
    fs.writeFileSync(outputFile, fullOutput, 'utf8');
    console.log(`\n💾 Output completo guardado en: ${outputFile}`);

    // Esperar antes de cerrar
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    if (session) {
      closeSession(session);
    }
  }
}

// ==================== EJECUCIÓN ====================

console.log('\n' + '='.repeat(60));
console.log('  PRUEBA DE INTERACCIÓN CON MENÚ ADMRUFU');
console.log('='.repeat(60));

// Validar configuración
if (SSH_CONFIG.host === 'TU_IP_VPS') {
  console.error('\n❌ ERROR: Debes editar SSH_CONFIG en este archivo');
  console.error('   Cambia "TU_IP_VPS" por la IP real de tu VPS');
  console.error('   Cambia la ruta de la clave privada\n');
  process.exit(1);
}

// Ejecutar prueba
testADMRufuMenu()
  .then(() => {
    console.log('\n✅ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Prueba falló:', error);
    process.exit(1);
  });
