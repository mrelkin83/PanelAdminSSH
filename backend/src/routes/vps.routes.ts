import { Router } from 'express';
import { body, param } from 'express-validator';
import { VPSController } from '../controllers/vps.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Listar VPS
router.get('/', VPSController.list);

// Crear VPS
router.post(
  '/',
  validateRequest([
    body('name').notEmpty().withMessage('Name is required'),
    body('host').notEmpty().withMessage('Host is required'),
    body('port').isInt({ min: 1, max: 65535 }).withMessage('Valid port is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('privateKey').optional(),
    body('password').optional(),
    body().custom((_value, { req }) => {
      if (!req.body.privateKey && !req.body.password) {
        throw new Error('Either privateKey or password is required');
      }
      return true;
    }),
  ]),
  VPSController.create
);

// Obtener detalles de VPS
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.getById
);

// Actualizar VPS
router.put(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.update
);

// Eliminar VPS
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.delete
);

// Verificar estado del VPS
router.get(
  '/:id/status',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.checkStatus
);

// Sincronizar usuarios desde VPS
router.post(
  '/:id/sync',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.syncUsers
);

// Obtener métricas de monitoreo
router.get(
  '/:id/metrics',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.getMetrics
);

// Reiniciar VPS
router.post(
  '/:id/restart',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.restart
);

// Limpiar logs del VPS
router.post(
  '/:id/clear-logs',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  VPSController.clearLogs
);

export default router;
