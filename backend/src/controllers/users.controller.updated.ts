import { Request, Response } from 'express';
import prisma from '../config/database';
import { ADMRufuService } from '../services/admrufu.service';
import { encrypt, decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import { CreateUserPayload, RenewUserPayload, SSHConfig } from '../types';

export class UsersController {
  /**
   * Listar todos los usuarios SSH
   */
  static async list(req: Request, res: Response) {
    try {
      const { vpsId, status } = req.query;

      const where: any = {};

      if (vpsId) {
        where.vpsId = vpsId as string;
      }

      if (status === 'active') {
        where.isActive = true;
        where.isBlocked = false;
      } else if (status === 'blocked') {
        where.isBlocked = true;
      } else if (status === 'expired') {
        where.expiresAt = {
          lt: new Date(),
        };
      }

      const users = await prisma.sSHUser.findMany({
        where,
        include: {
          vps: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const usersData = users.map(user => {
        const { password, ...userData } = user;
        return {
          ...userData,
          daysRemaining: Math.ceil(
            (user.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        };
      });

      return res.json({
        success: true,
        data: usersData,
      });
    } catch (error: any) {
      logger.error(`List users error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to list users',
      });
    }
  }

  /**
   * Crear nuevo usuario SSH usando ADMRufu
   */
  static async create(req: Request, res: Response) {
    try {
      const data: CreateUserPayload = req.body;

      // Verificar que el VPS existe
      const vps = await prisma.vPS.findUnique({
        where: { id: data.vpsId },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await prisma.sSHUser.findUnique({
        where: {
          vpsId_username: {
            vpsId: data.vpsId,
            username: data.username,
          },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists on this VPS',
        });
      }

      // Preparar config SSH
      const sshConfig: SSHConfig = {
        host: vps.host,
        port: vps.port,
        username: vps.username,
        privateKey: vps.privateKey ? decrypt(vps.privateKey as string) : undefined,
      };

      // OPCIÓN 1: Intentar crear usuario usando el menú interactivo de ADMRufu
      logger.info('Intentando crear usuario usando menú interactivo de ADMRufu...');
      let result = await ADMRufuService.createSSHUser(
        sshConfig,
        data.username,
        data.password,
        data.days
      );

      // OPCIÓN 2: Si falla el menú interactivo, usar comandos directos del sistema
      if (!result.success) {
        logger.warn('Menú interactivo falló, usando comandos directos del sistema...');
        result = await ADMRufuService.createSSHUserDirect(
          sshConfig,
          data.username,
          data.password,
          data.days
        );
      }

      if (!result.success) {
        await prisma.actionLog.create({
          data: {
            adminId: req.user!.id,
            vpsId: vps.id,
            action: 'create_user',
            status: 'error',
            errorMessage: result.error || 'Failed to create user',
          },
        });

        return res.status(500).json({
          success: false,
          error: 'Failed to create user on VPS',
          details: result.error,
        });
      }

      // Calcular fecha de expiración
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.days);

      // Encriptar password
      const encryptedPassword = encrypt(data.password);

      // Guardar en base de datos
      const user = await prisma.sSHUser.create({
        data: {
          vpsId: data.vpsId,
          username: data.username,
          password: encryptedPassword,
          expiresAt,
          maxConnections: data.maxConnections,
          notes: data.notes,
        },
        include: {
          vps: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
        },
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          sshUserId: user.id,
          action: 'create_user',
          status: 'success',
          details: JSON.stringify({
            username: user.username,
            days: data.days,
            method: result.output ? 'interactive_menu' : 'direct_commands',
          }),
        },
      });

      logger.info(`User created: ${user.username} on VPS ${vps.name}`);

      const { password, ...userData } = user;

      return res.status(201).json({
        success: true,
        data: userData,
        message: 'User created successfully',
      });
    } catch (error: any) {
      logger.error(`Create user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }

  /**
   * Renovar usuario SSH
   */
  static async renew(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { days }: RenewUserPayload = req.body;

      const user = await prisma.sSHUser.findUnique({
        where: { id },
        include: { vps: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
        privateKey: decrypt(user.vps.privateKey as string),
      };

      const result = await ADMRufuService.renewSSHUser(
        sshConfig,
        user.username,
        days
      );

      if (!result.success) {
        await prisma.actionLog.create({
          data: {
            adminId: req.user!.id,
            vpsId: user.vpsId,
            sshUserId: user.id,
            action: 'renew_user',
            status: 'error',
            errorMessage: result.error,
          },
        });

        return res.status(500).json({
          success: false,
          error: 'Failed to renew user on VPS',
          details: result.error,
        });
      }

      // Actualizar fecha de expiración
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      const updatedUser = await prisma.sSHUser.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
          isActive: true,
        },
      });

      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'renew_user',
          status: 'success',
          details: JSON.stringify({ days }),
        },
      });

      logger.info(`User renewed: ${user.username} for ${days} days`);

      return res.json({
        success: true,
        data: {
          expiresAt: updatedUser.expiresAt,
        },
        message: 'User renewed successfully',
      });
    } catch (error: any) {
      logger.error(`Renew user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to renew user',
      });
    }
  }

  /**
   * Bloquear usuario SSH
   */
  static async block(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.sSHUser.findUnique({
        where: { id },
        include: { vps: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
        privateKey: decrypt(user.vps.privateKey as string),
      };

      const result = await ADMRufuService.blockSSHUser(sshConfig, user.username);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to block user on VPS',
          details: result.error,
        });
      }

      await prisma.sSHUser.update({
        where: { id },
        data: { isBlocked: true },
      });

      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'block_user',
          status: 'success',
        },
      });

      logger.info(`User blocked: ${user.username}`);

      return res.json({
        success: true,
        message: 'User blocked successfully',
      });
    } catch (error: any) {
      logger.error(`Block user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to block user',
      });
    }
  }

  /**
   * Desbloquear usuario SSH
   */
  static async unblock(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.sSHUser.findUnique({
        where: { id },
        include: { vps: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
        privateKey: decrypt(user.vps.privateKey as string),
      };

      const result = await ADMRufuService.unblockSSHUser(sshConfig, user.username);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to unblock user on VPS',
          details: result.error,
        });
      }

      await prisma.sSHUser.update({
        where: { id },
        data: { isBlocked: false },
      });

      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'unblock_user',
          status: 'success',
        },
      });

      logger.info(`User unblocked: ${user.username}`);

      return res.json({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (error: any) {
      logger.error(`Unblock user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to unblock user',
      });
    }
  }

  /**
   * Eliminar usuario SSH
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.sSHUser.findUnique({
        where: { id },
        include: { vps: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
        privateKey: decrypt(user.vps.privateKey as string),
      };

      const result = await ADMRufuService.deleteSSHUser(sshConfig, user.username);

      if (!result.success) {
        logger.warn(`Failed to delete user on VPS, but removing from DB: ${result.error}`);
      }

      await prisma.sSHUser.delete({
        where: { id },
      });

      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          action: 'delete_user',
          status: result.success ? 'success' : 'partial',
          details: JSON.stringify({ username: user.username }),
        },
      });

      logger.info(`User deleted: ${user.username}`);

      return res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error(`Delete user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }
  }

  /**
   * Obtener detalles de un usuario
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.sSHUser.findUnique({
        where: { id },
        include: {
          vps: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const { password, ...userData } = user;

      return res.json({
        success: true,
        data: {
          ...userData,
          daysRemaining: Math.ceil(
            (user.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        },
      });
    } catch (error: any) {
      logger.error(`Get user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }
}
