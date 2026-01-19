/**
 * Admin VPS Routes - Gestión Avanzada de VPS
 *
 * Solo accesible para superadministradores
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { VPSController } from '../../controllers/vps.controller';
import { validateRequest } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * Agregar nuevo VPS
 * POST /api/admin/vps
 *
 * Configurar un nuevo servidor VPS al panel
 */
router.post(
  '/',
  validateRequest([
    body('name').notEmpty().withMessage('Nombre es requerido'),
    body('host').notEmpty().withMessage('Host/IP es requerido'),
    body('port').isInt({ min: 1, max: 65535 }).withMessage('Puerto inválido'),
    body('username').notEmpty().withMessage('Username es requerido'),
    // Validación flexible: password O privateKey
    body().custom((value) => {
      if (!value.password && !value.privateKey) {
        throw new Error('Se requiere password o privateKey para autenticación SSH');
      }
      return true;
    }),
  ]),
  VPSController.create
);

/**
 * Actualizar configuración de VPS
 * PUT /api/admin/vps/:id
 */
router.put(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.update
);

/**
 * Eliminar VPS del panel
 * DELETE /api/admin/vps/:id
 *
 * ⚠️ PRECAUCIÓN: Elimina el VPS y todos sus usuarios asociados
 */
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.delete
);

export default router;
