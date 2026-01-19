import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { logger } from './utils/logger';
import { checkDatabaseConnection, closeDatabaseConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { ConnectionLimitService } from './services/connection-limit.service';

// Importar rutas legacy (compatibilidad hacia atrás)
import authRoutes from './routes/auth.routes';
import vpsRoutes from './routes/vps.routes';
import usersRoutes from './routes/users.routes';
import monitorRoutes from './routes/monitor.routes';
import backupRoutes from './routes/backup.routes';
import maintenanceRoutes from './routes/maintenance.routes';

// Importar nuevas rutas v1 (core) y admin
import coreRoutesV1 from './routes/v1/core.routes';
import adminRoutes from './routes/admin/admin.routes';

const app = express();

// ==================== MIDDLEWARE ====================

// Seguridad
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
});

app.use('/api', limiter);

// ==================== RUTAS ====================

// Health check
app.get('/health', (_req, res) => {
  return res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// ==================== API v1 - CORE ROUTES ====================
// Rutas principales - 7 funciones esenciales para operadores
app.use('/api/v1', coreRoutesV1);

// ==================== ADMIN ROUTES ====================
// Funciones avanzadas - Solo superadministradores
app.use('/api/admin', adminRoutes);

// ==================== LEGACY ROUTES (Compatibilidad) ====================
// Mantener rutas antiguas para compatibilidad hacia atrás
// TODO: Deprecar en versiones futuras
app.use('/api/auth', authRoutes);
app.use('/api/vps', vpsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Verificar conexión a base de datos
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Iniciar servidor
    const server = app.listen(config.PORT, () => {
      logger.info(`
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🚀 Admin SSH Panel Backend Server Started        │
│                                                     │
│   📡 Server: http://localhost:${config.PORT}            │
│   🌍 Environment: ${config.NODE_ENV}                     │
│   📊 Database: Connected                            │
│                                                     │
└─────────────────────────────────────────────────────┘
      `);

      // Iniciar verificación automática de límites cada 5 minutos
      ConnectionLimitService.startPeriodicCheck(5);
      logger.info('✅ Auto-check de límites de conexión iniciado (cada 5 minutos)');
    });

    // Manejo de señales de terminación
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Closing server gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await closeDatabaseConnection();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

export default app;
