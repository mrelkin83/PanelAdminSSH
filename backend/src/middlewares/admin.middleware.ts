/**
 * Admin Middleware - Control de Acceso para Funciones Avanzadas
 *
 * Solo usuarios con rol 'superadmin' pueden acceder a funciones administrativas
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
      });
    }

    // Verificar que el usuario tenga rol de superadmin
    if (user.role !== 'superadmin') {
      logger.warn(`Access denied to admin endpoint for user ${user.email} (role: ${user.role})`);

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren privilegios de administrador.',
        message: 'Esta función está disponible solo para superadministradores',
      });
    }

    return next();
  } catch (error: any) {
    logger.error(`Admin middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error en verificación de permisos',
    });
  }
};
