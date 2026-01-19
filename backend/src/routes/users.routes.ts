import { Router } from 'express';
import { body, param } from 'express-validator';
import { UsersController } from '../controllers/users.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Listar usuarios SSH
router.get('/', UsersController.list);

// Crear usuario SSH
router.post(
  '/',
  validateRequest([
    body('vpsId').notEmpty().withMessage('VPS ID is required'),
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 32 })
      .withMessage('Username must be between 3 and 32 characters')
      .matches(/^[a-z0-9_-]+$/)
      .withMessage('Username can contain lowercase letters, numbers, hyphens, and underscores'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ]),
  UsersController.create
);

// Crear usuario SSH en múltiples VPS
router.post(
  '/create-multiple',
  validateRequest([
    body('vpsIds').custom((value) => {
      if (value === 'all') return true;
      if (Array.isArray(value) && value.length > 0) return true;
      throw new Error('vpsIds must be "all" or an array of VPS IDs');
    }),
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 32 })
      .withMessage('Username must be between 3 and 32 characters')
      .matches(/^[a-z0-9_-]+$/)
      .withMessage('Username can contain lowercase letters, numbers, hyphens, and underscores'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ]),
  UsersController.createMultiple
);

// Obtener detalles de usuario
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  UsersController.getById
);

// Editar usuario (password, expiración, límite, notas)
router.put(
  '/:id',
  validateRequest([
    param('id').isString().withMessage('Valid ID is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('expiresAt').optional().isISO8601().withMessage('Valid expiration date is required'),
    body('maxConnections').optional().isInt({ min: 1 }).withMessage('Max connections must be a positive number'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ]),
  UsersController.update
);

// Renovar usuario
router.put(
  '/:id/renew',
  validateRequest([
    param('id').isString().withMessage('Valid ID is required'),
    body('days')
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ]),
  UsersController.renew
);

// Bloquear usuario
router.put(
  '/:id/block',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  UsersController.block
);

// Desbloquear usuario
router.put(
  '/:id/unblock',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  UsersController.unblock
);

// Eliminar usuario
router.delete(
  '/:id',
  validateRequest([param('id').isString().withMessage('Valid ID is required')]),
  UsersController.delete
);

export default router;
