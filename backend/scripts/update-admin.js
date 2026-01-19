/**
 * Script simple para actualizar credenciales del administrador
 * Uso: node scripts/update-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const NEW_EMAIL = 'mr.elkin@hotmail.com';
const NEW_PASSWORD = 'Mayte2024*#';

async function updateAdminCredentials() {
  try {
    console.log('🔄 Actualizando credenciales del administrador...\n');

    // Hash del nuevo password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // Buscar el primer admin
    const existingAdmin = await prisma.admin.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!existingAdmin) {
      console.log('❌ No se encontró ningún administrador en la base de datos.');
      console.log('📝 Creando nuevo administrador...\n');

      // Crear nuevo admin
      const newAdmin = await prisma.admin.create({
        data: {
          email: NEW_EMAIL,
          password: hashedPassword,
          name: 'Administrator',
          role: 'superadmin',
          isActive: true,
        },
      });

      console.log('✅ Administrador creado exitosamente!\n');
      console.log('📧 Email:', newAdmin.email);
      console.log('🔑 Password: Mayte2024*#');
      console.log('👤 Rol:', newAdmin.role);
      console.log('🆔 ID:', newAdmin.id);
    } else {
      // Actualizar admin existente
      const updatedAdmin = await prisma.admin.update({
        where: { id: existingAdmin.id },
        data: {
          email: NEW_EMAIL,
          password: hashedPassword,
          role: 'superadmin',
          isActive: true,
        },
      });

      console.log('✅ Credenciales actualizadas exitosamente!\n');
      console.log('📧 Email anterior:', existingAdmin.email);
      console.log('📧 Email nuevo:', updatedAdmin.email);
      console.log('🔑 Password nuevo: Mayte2024*#');
      console.log('👤 Rol:', updatedAdmin.role);
      console.log('🆔 ID:', updatedAdmin.id);
    }

    console.log('\n🎉 Proceso completado. Ahora puedes iniciar sesión con:\n');
    console.log('   Email: mr.elkin@hotmail.com');
    console.log('   Password: Mayte2024*#\n');
  } catch (error) {
    console.error('❌ Error al actualizar credenciales:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
updateAdminCredentials()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
