/**
 * Admin Backup Routes - Sistema de Backups
 *
 * Funcionalidad avanzada de respaldo y restauración
 * Solo accesible para superadministradores
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { BackupController } from '../../controllers/backup.controller';
import { validateRequest } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * Listar todos los backups
 * GET /api/admin/backup
 */
router.get('/', BackupController.list);

/**
 * Crear nuevo backup
 * POST /api/admin/backup
 *
 * Tipos:
 * - full: Backup completo de todos los usuarios del VPS
 * - single_user: Backup de un usuario específico
 */
router.post(
  '/',
  validateRequest([
    body('vpsId').notEmpty().withMessage('VPS ID es requerido'),
    body('backupType')
      .isIn(['full', 'single_user'])
      .withMessage('Tipo de backup debe ser full o single_user'),
    body('sshUserId').optional().isString(),
    body('notes').optional().isString(),
  ]),
  BackupController.create
);

/**
 * Obtener detalles de un backup
 * GET /api/admin/backup/:id
 */
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  BackupController.getById
);

/**
 * Restaurar backup
 * POST /api/admin/backup/:id/restore
 *
 * ⚠️ PRECAUCIÓN: Sobrescribirá datos existentes
 */
router.post(
  '/:id/restore',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  BackupController.restore
);

/**
 * Eliminar backup
 * DELETE /api/admin/backup/:id
 */
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  BackupController.delete
);

export default router;
