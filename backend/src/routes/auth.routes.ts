import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();

// Login
router.post(
  '/login',
  validateRequest([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  AuthController.login
);

// Register (puede estar deshabilitado en producción)
router.post(
  '/register',
  validateRequest([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ]),
  AuthController.register
);

// Get profile (requiere autenticación)
router.get('/profile', authMiddleware, AuthController.getProfile);

// Update profile (requiere autenticación)
router.put(
  '/profile',
  authMiddleware,
  validateRequest([
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ]),
  AuthController.updateProfile
);

// Change password (requiere autenticación)
router.post(
  '/change-password',
  authMiddleware,
  validateRequest([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  AuthController.changePassword
);

export default router;
