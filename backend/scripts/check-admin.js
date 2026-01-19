/**
 * Script para verificar el rol del administrador
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.admin.findFirst({
      where: { email: 'mr.elkin@hotmail.com' }
    });

    if (admin) {
      console.log('✅ Administrador encontrado:\n');
      console.log('📧 Email:', admin.email);
      console.log('👤 Nombre:', admin.name);
      console.log('🎖️  Rol:', admin.role);
      console.log('✔️  Activo:', admin.isActive);
      console.log('🆔 ID:', admin.id);

      if (admin.role !== 'superadmin') {
        console.log('\n⚠️  WARNING: El rol NO es superadmin!');
        console.log('Ejecuta: node scripts/update-admin.js');
      } else {
        console.log('\n✅ Todo correcto! El rol es superadmin.');
        console.log('\nSi no ves el menú Admin VPS:');
        console.log('1. Cierra sesión en el navegador');
        console.log('2. Vuelve a iniciar sesión');
      }
    } else {
      console.log('❌ No se encontró admin con email mr.elkin@hotmail.com');
      console.log('Ejecuta: node scripts/update-admin.js');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
