/**
 * Script para probar conexión SSH a un VPS
 * Uso: node scripts/test-ssh-connection.js
 */

const { Client } = require('ssh2');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testSSHConnection() {
  try {
    console.log('\n🔐 Prueba de Conexión SSH\n');
    console.log('===============================\n');

    const host = await question('Host (IP o dominio): ');
    const port = await question('Puerto SSH (default 22): ') || '22';
    const username = await question('Usuario SSH (default root): ') || 'root';

    console.log('\n¿Cómo te conectas?');
    console.log('1. Clave privada (archivo)');
    console.log('2. Password');
    const authMethod = await question('Opción (1 o 2): ');

    let sshConfig = {
      host: host,
      port: parseInt(port),
      username: username,
      readyTimeout: 10000,
    };

    if (authMethod === '1') {
      const keyPath = await question('Ruta a la clave privada (ej: ~/.ssh/id_rsa): ');
      const expandedPath = keyPath.replace('~', process.env.HOME || process.env.USERPROFILE);

      if (!fs.existsSync(expandedPath)) {
        console.log(`\n❌ ERROR: No se encuentra el archivo: ${expandedPath}`);
        rl.close();
        return;
      }

      sshConfig.privateKey = fs.readFileSync(expandedPath, 'utf8');
      console.log('✅ Clave privada cargada');
    } else {
      const password = await question('Password: ');
      sshConfig.password = password;
    }

    console.log('\n🔄 Intentando conectar...\n');

    const conn = new Client();

    conn.on('ready', () => {
      console.log('✅ ¡CONEXIÓN EXITOSA!\n');
      console.log('Detalles de la conexión:');
      console.log(`  Host: ${sshConfig.host}`);
      console.log(`  Puerto: ${sshConfig.port}`);
      console.log(`  Usuario: ${sshConfig.username}`);

      // Ejecutar un comando de prueba
      conn.exec('echo "Test OK" && uname -a', (err, stream) => {
        if (err) {
          console.log('⚠️  Error ejecutando comando:', err.message);
          conn.end();
          rl.close();
          return;
        }

        stream.on('data', (data) => {
          console.log('\n📊 Respuesta del servidor:');
          console.log(data.toString());
        });

        stream.on('close', () => {
          console.log('\n✅ Prueba completada exitosamente');
          console.log('\n💡 Ahora puedes usar estas credenciales en el panel web.');
          conn.end();
          rl.close();
        });
      });
    });

    conn.on('error', (err) => {
      console.log('\n❌ ERROR DE CONEXIÓN:\n');
      console.log(`Tipo: ${err.level || 'connection'}`);
      console.log(`Mensaje: ${err.message}`);

      console.log('\n🔍 Posibles soluciones:\n');

      if (err.message.includes('ECONNREFUSED')) {
        console.log('1. Verifica que el puerto SSH sea correcto (generalmente 22)');
        console.log('2. Verifica que el servidor SSH esté corriendo en el VPS');
        console.log('3. Verifica que el firewall permita conexiones SSH');
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('EHOSTUNREACH')) {
        console.log('1. Verifica que la IP o dominio sea correcto');
        console.log('2. Verifica que tengas conexión a internet');
        console.log('3. Verifica que el VPS esté encendido');
      } else if (err.message.includes('authentication')) {
        console.log('1. Verifica que el usuario sea correcto (generalmente "root")');
        console.log('2. Verifica que la clave SSH o password sean correctos');
        console.log('3. Asegúrate de que la clave pública esté en ~/.ssh/authorized_keys del VPS');
      } else if (err.message.includes('key')) {
        console.log('1. Verifica que la clave privada esté en formato correcto');
        console.log('2. Intenta con password en lugar de clave');
      }

      rl.close();
    });

    conn.connect(sshConfig);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
  }
}

testSSHConnection();
