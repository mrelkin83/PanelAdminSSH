/**
 * Core API v1 Routes
 *
 * Rutas principales del panel - Solo las 7 funciones esenciales
 * Diseñado para operadores sin conocimientos técnicos
 */

import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Importar sub-rutas core
import coreUsersRoutes from './users.routes';
import coreMonitorRoutes from './monitor.routes';
import coreVpsRoutes from './vps.routes';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * FUNCIONES CORE DEL PANEL (7 operaciones principales)
 *
 * 1. NUEVO USUARIO           → POST   /api/v1/users
 * 2. ELIMINAR USUARIO        → DELETE /api/v1/users/:id
 * 3. RENOVAR USUARIO         → PUT    /api/v1/users/:id/renew
 * 4. BLOQUEAR/DESBLOQUEAR    → PUT    /api/v1/users/:id/block
 *                              PUT    /api/v1/users/:id/unblock
 * 6. DETALLES DE USUARIOS    → GET    /api/v1/users
 * 7. MONITOR DE CONECTADOS   → GET    /api/v1/monitor/connections
 */

router.use('/users', coreUsersRoutes);
router.use('/monitor', coreMonitorRoutes);
router.use('/vps', coreVpsRoutes);

export default router;
