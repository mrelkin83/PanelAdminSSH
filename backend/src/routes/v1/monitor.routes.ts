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

export default router;
