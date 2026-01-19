import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener usuarios conectados
router.get('/connections', MonitorController.getConnections);

// Obtener estadísticas del dashboard
router.get('/stats', MonitorController.getStats);

// Obtener historial de conexiones
router.get('/connections/history', MonitorController.getConnectionHistory);

// Obtener logs de acciones
router.get('/logs', MonitorController.getActionLogs);

// Mantenimiento - Limpiar logs de VPS
router.post('/maintenance/clean-vps-logs', MonitorController.cleanVPSLogs);

// Mantenimiento - Reiniciar VPS
router.post('/maintenance/restart-vps', MonitorController.restartVPS);

// Mantenimiento - Limpiar logs de la API
router.post('/maintenance/clean-api-logs', MonitorController.cleanAPILogs);

export default router;
