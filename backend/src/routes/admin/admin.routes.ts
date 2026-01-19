/**
 * Admin API Routes - Funciones Avanzadas
 *
 * Rutas administrativas ocultas para superadministradores
 * Requiere rol 'superadmin' para acceder
 *
 * CARACTERÍSTICAS AVANZADAS:
 * - Gestión completa de VPS (crear, editar, eliminar)
 * - Sistema de backups y restauración
 * - Historial de conexiones y auditoría
 * - Logs detallados de acciones
 * - Configuraciones internas del sistema
 */

import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';

// Importar rutas administrativas
import adminVpsRoutes from './vps.routes';
import adminBackupRoutes from './backup.routes';
import adminMonitorRoutes from './monitor.routes';

const router = Router();

// Todas las rutas requieren autenticación + rol superadmin
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * FUNCIONES ADMINISTRATIVAS (OCULTAS)
 *
 * VPS Management:
 * - POST   /api/admin/vps           → Agregar nuevo VPS
 * - PUT    /api/admin/vps/:id       → Editar configuración VPS
 * - DELETE /api/admin/vps/:id       → Eliminar VPS
 *
 * Backup System:
 * - GET    /api/admin/backup        → Listar backups
 * - POST   /api/admin/backup        → Crear backup
 * - POST   /api/admin/backup/:id/restore → Restaurar backup
 * - DELETE /api/admin/backup/:id    → Eliminar backup
 *
 * Advanced Monitoring:
 * - GET    /api/admin/monitor/history → Historial de conexiones
 * - GET    /api/admin/monitor/logs    → Logs de acciones
 */

router.use('/vps', adminVpsRoutes);
router.use('/backup', adminBackupRoutes);
router.use('/monitor', adminMonitorRoutes);

export default router;
