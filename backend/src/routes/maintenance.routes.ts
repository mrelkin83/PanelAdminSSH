import { Router } from 'express';
import { body, query } from 'express-validator';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Verificar usuarios expirados
router.post('/check-expired', MaintenanceController.checkExpired);

// Verificar límites de conexiones
router.post('/check-limits', MaintenanceController.checkConnectionLimits);

// Limpiar logs de la API
router.post(
  '/clean-logs',
  validateRequest([
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  ]),
  MaintenanceController.cleanApiLogs
);

// Optimizar base de datos
router.post('/optimize-db', MaintenanceController.optimizeDatabase);

// Obtener estadísticas del sistema
router.get('/stats', MaintenanceController.getSystemStats);

// Configurar verificación automática
router.post(
  '/auto-check',
  validateRequest([
    body('enabled').isBoolean().withMessage('Enabled must be boolean'),
    body('intervalMinutes').optional().isInt({ min: 1, max: 60 }).withMessage('Interval must be between 1 and 60'),
  ]),
  MaintenanceController.configAutoCheck
);

export default router;
