/**
 * Core Users Routes - Gestión de Usuarios SSH
 *
 * Solo operaciones esenciales para operadores del panel
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { UsersController } from '../../controllers/users.controller';
import { validateRequest } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * Función 6: DETALLES DE TODOS LOS USUARIOS
 * GET /api/v1/users
 *
 * Lista todos los usuarios SSH con información básica
 */
router.get('/', UsersController.list);

/**
 * Función 1: NUEVO USUARIO
 * POST /api/v1/users
 *
 * Crea un nuevo usuario SSH en el VPS seleccionado
 */
router.post(
  '/',
  validateRequest([
    body('vpsId').notEmpty().withMessage('VPS ID es requerido'),
    body('username')
      .notEmpty()
      .withMessage('Username es requerido')
      .isLength({ min: 3, max: 32 })
      .withMessage('Username debe tener entre 3 y 32 caracteres')
      .matches(/^[a-z0-9_-]+$/)
      .withMessage('Username puede contener letras minúsculas, números, guiones y guiones bajos'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password debe tener al menos 6 caracteres'),
    body('days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Días debe estar entre 1 y 365'),
  ]),
  UsersController.create
);

/**
 * Obtener detalles de un usuario específico
 * GET /api/v1/users/:id
 */
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  UsersController.getById
);

/**
 * Función 3: RENOVAR USUARIO
 * PUT /api/v1/users/:id/renew
 *
 * Renueva la fecha de expiración de un usuario existente
 */
router.put(
  '/:id/renew',
  validateRequest([
    param('id').isString().withMessage('ID válido es requerido'),
    body('days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Días debe estar entre 1 y 365'),
  ]),
  UsersController.renew
);

/**
 * Función 4: BLOQUEAR USUARIO
 * PUT /api/v1/users/:id/block
 *
 * Bloquea temporalmente un usuario SSH
 */
router.put(
  '/:id/block',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  UsersController.block
);

/**
 * Función 4: DESBLOQUEAR USUARIO
 * PUT /api/v1/users/:id/unblock
 *
 * Desbloquea un usuario SSH previamente bloqueado
 */
router.put(
  '/:id/unblock',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  UsersController.unblock
);

/**
 * Función 2: ELIMINAR USUARIO
 * DELETE /api/v1/users/:id
 *
 * Elimina permanentemente un usuario SSH del VPS
 */
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  UsersController.delete
);

export default router;
