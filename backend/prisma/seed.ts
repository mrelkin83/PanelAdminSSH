import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Obtener credenciales de variables de entorno o usar por defecto
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@paneladminssh.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Mayte2024*#';
  const adminName = process.env.ADMIN_NAME || 'Administrador';

  // Crear admin
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'superadmin',
      isActive: true,
    },
  });

  console.log('✅ Admin creado:', {
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  console.log('\n📝 Credenciales de acceso:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n⚠️  Cambia la contraseña después del primer login\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
