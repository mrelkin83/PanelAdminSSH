import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { LoginPayload, RegisterPayload } from '../types';

export class AuthController {
  /**
   * Login de administrador
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginPayload = req.body;

      // Buscar admin por email
      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verificar si está activo
      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is disabled',
        });
      }

      // Verificar password
      const isValidPassword = await comparePassword(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Generar token
      const token = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });

      logger.info(`Admin logged in: ${admin.email}`);

      return res.json({
        success: true,
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
      });
    } catch (error: any) {
      logger.error(`Login error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  /**
   * Registro de nuevo administrador (opcional, puede estar deshabilitado)
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name }: RegisterPayload = req.body;

      // Verificar si ya existe
      const existingAdmin = await prisma.admin.findUnique({
        where: { email },
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Hashear password
      const hashedPassword = await hashPassword(password);

      // Crear admin
      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'admin', // Por defecto admin, no superadmin
        },
      });

      logger.info(`New admin registered: ${admin.email}`);

      return res.status(201).json({
        success: true,
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
        message: 'Admin registered successfully',
      });
    } catch (error: any) {
      logger.error(`Registration error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  /**
   * Obtener perfil del admin autenticado
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const adminId = req.user!.id;

      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found',
        });
      }

      return res.json({
        success: true,
        data: admin,
      });
    } catch (error: any) {
      logger.error(`Get profile error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }

  /**
   * Actualizar perfil del admin autenticado
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const adminId = req.user!.id;
      const { name, email } = req.body;

      // Validar datos
      if (!name && !email) {
        return res.status(400).json({
          success: false,
          error: 'No data provided to update',
        });
      }

      // Si se cambia el email, verificar que no exista
      if (email) {
        const existingAdmin = await prisma.admin.findFirst({
          where: {
            email,
            id: { not: adminId },
          },
        });

        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            error: 'Email already in use',
          });
        }
      }

      // Actualizar perfil
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;

      const updatedAdmin = await prisma.admin.update({
        where: { id: adminId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info(`Admin profile updated: ${updatedAdmin.email}`);

      return res.json({
        success: true,
        data: updatedAdmin,
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      logger.error(`Update profile error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * Cambiar contraseña del admin autenticado
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const adminId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      // Validar datos
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters',
        });
      }

      // Obtener admin actual
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found',
        });
      }

      // Verificar contraseña actual
      const isValidPassword = await comparePassword(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hashear nueva contraseña
      const hashedPassword = await hashPassword(newPassword);

      // Actualizar contraseña
      await prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedPassword },
      });

      logger.info(`Password changed for admin: ${admin.email}`);

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error(`Change password error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }
  }
}
