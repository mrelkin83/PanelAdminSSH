/**
 * Admin Monitor Routes - Monitoreo Avanzado y Auditoría
 *
 * Funcionalidades avanzadas de análisis y logs
 * Solo accesible para superadministradores
 */

import { Router } from 'express';
import { MonitorController } from '../../controllers/monitor.controller';

const router = Router();

/**
 * Historial completo de conexiones
 * GET /api/admin/monitor/history
 *
 * Registro histórico de todas las conexiones SSH
 * Útil para auditoría y análisis
 */
router.get('/history', MonitorController.getConnectionHistory);

/**
 * Logs detallados de acciones
 * GET /api/admin/monitor/logs
 *
 * Registro de todas las acciones administrativas:
 * - Creación/eliminación de usuarios
 * - Cambios en VPS
 * - Renovaciones y bloqueos
 * - Backups y restauraciones
 */
router.get('/logs', MonitorController.getActionLogs);

export default router;
