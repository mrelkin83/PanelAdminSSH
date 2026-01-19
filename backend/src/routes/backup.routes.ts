import { Router } from 'express';
import { body, param } from 'express-validator';
import { BackupController } from '../controllers/backup.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Listar backups
router.get('/', BackupController.list);

// Crear backup
router.post(
  '/',
  validateRequest([
    body('vpsId').notEmpty().withMessage('VPS ID is required'),
    body('backupType')
      .isIn(['full', 'single_user'])
      .withMessage('Backup type must be full or single_user'),
  ]),
  BackupController.create
);

// Obtener detalles de backup
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  BackupController.getById
);

// Restaurar backup
router.post(
  '/:id/restore',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  BackupController.restore
);

// Eliminar backup
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  BackupController.delete
);

export default router;
