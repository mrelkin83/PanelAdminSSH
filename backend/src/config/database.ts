import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

// Manejo de eventos de Prisma
prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error:', e);
});

// Middleware para logging de queries lentas
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  const duration = after - before;
  if (duration > 1000) {
    logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
  }

  return result;
});

export default prisma;

// Función para verificar conexión
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

// Función para cerrar conexión
export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}
