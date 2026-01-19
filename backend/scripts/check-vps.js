/**
 * Script para verificar VPS en la base de datos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVPS() {
  try {
    console.log('🔍 Verificando VPS en la base de datos...\n');

    // Contar VPS
    const count = await prisma.vPS.count();
    console.log(`📊 Total de VPS en DB: ${count}\n`);

    // Listar todos los VPS
    const vpsList = await prisma.vPS.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        status: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            sshUsers: true,
            connections: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (vpsList.length === 0) {
      console.log('❌ No hay VPS en la base de datos\n');
    } else {
      console.log('✅ VPS encontrados:\n');
      vpsList.forEach((vps, index) => {
        console.log(`${index + 1}. ${vps.name}`);
        console.log(`   ID: ${vps.id}`);
        console.log(`   Host: ${vps.host}:${vps.port}`);
        console.log(`   Usuario: ${vps.username}`);
        console.log(`   Estado: ${vps.status}`);
        console.log(`   Activo: ${vps.isActive}`);
        console.log(`   Usuarios SSH: ${vps._count.sshUsers}`);
        console.log(`   Conexiones: ${vps._count.connections}`);
        console.log(`   Creado: ${vps.createdAt}`);
        console.log('');
      });
    }

    // Verificar logs de acciones
    console.log('📝 Últimas acciones de VPS:\n');
    const actions = await prisma.actionLog.findMany({
      where: {
        action: {
          in: ['create_vps', 'delete_vps', 'update_vps'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        admin: {
          select: {
            email: true,
          },
        },
      },
    });

    actions.forEach((action) => {
      console.log(`- ${action.action} (${action.status})`);
      console.log(`  Admin: ${action.admin.email}`);
      console.log(`  Fecha: ${action.createdAt}`);
      if (action.details) {
        console.log(`  Detalles: ${action.details}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVPS();
