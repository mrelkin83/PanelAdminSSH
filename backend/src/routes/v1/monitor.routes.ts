/**
 * Core Monitor Routes - Monitoreo de Usuarios
 *
 * Solo operaciones esenciales de monitoreo para operadores
 */

import { Router } from 'express';
import { MonitorController } from '../../controllers/monitor.controller';

const router = Router();

/**
 * Función 7: MONITOR DE USUARIOS CONECTADOS
 * GET /api/v1/monitor/connections
 *
 * Muestra todos los usuarios SSH actualmente conectados en tiempo real
 */
router.get('/connections', MonitorController.getConnections);

/**
 * Estadísticas básicas del dashboard
 * GET /api/v1/monitor/stats
 *
 * Resumen simple: total usuarios, activos, expirados, conectados
 */
router.get('/stats', MonitorController.getStats);

/**
 * Historial de conexiones
 * GET /api/v1/monitor/connections/history
 */
router.get('/connections/history', MonitorController.getConnectionHistory);

/**
 * Logs de acciones
 * GET /api/v1/monitor/logs
 */
router.get('/logs', MonitorController.getActionLogs);

/**
 * Mantenimiento - Limpiar logs de VPS
 * POST /api/v1/monitor/maintenance/clean-vps-logs
 */
router.post('/maintenance/clean-vps-logs', MonitorController.cleanVPSLogs);

/**
 * Mantenimiento - Reiniciar VPS
 * POST /api/v1/monitor/maintenance/restart-vps
 */
router.post('/maintenance/restart-vps', MonitorController.restartVPS);

/**
 * Mantenimiento - Limpiar logs de la API
 * POST /api/v1/monitor/maintenance/clean-api-logs
 */
router.post('/maintenance/clean-api-logs', MonitorController.cleanAPILogs);

export default router;
