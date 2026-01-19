import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { BackupPayload } from '../types';

export class BackupController {
  /**
   * Crear backup de usuarios
   */
  static async create(req: Request, res: Response) {
    try {
      const data: BackupPayload = req.body;

      // Verificar VPS
      const vps = await prisma.vPS.findUnique({
        where: { id: data.vpsId },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
      }

      let backupData: any = {};

      if (data.backupType === 'full') {
        // Backup completo de todos los usuarios del VPS
        const users = await prisma.sSHUser.findMany({
          where: { vpsId: data.vpsId },
        });

        backupData = {
          type: 'full',
          vpsId: data.vpsId,
          vpsName: vps.name,
          users: users.map(u => ({
            username: u.username,
            password: u.password,
            expiresAt: u.expiresAt,
            maxConnections: u.maxConnections,
            notes: u.notes,
          })),
          timestamp: new Date().toISOString(),
        };
      } else if (data.backupType === 'single_user' && data.sshUserId) {
        // Backup de un solo usuario
        const user = await prisma.sSHUser.findUnique({
          where: { id: data.sshUserId },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        backupData = {
          type: 'single_user',
          vpsId: data.vpsId,
          vpsName: vps.name,
          user: {
            username: user.username,
            password: user.password,
            expiresAt: user.expiresAt,
            maxConnections: user.maxConnections,
            notes: user.notes,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Guardar backup
      const backup = await prisma.backup.create({
        data: {
          vpsId: data.vpsId,
          sshUserId: data.sshUserId,
          adminId: req.user!.id,
          backupData: JSON.stringify(backupData),
          backupType: data.backupType,
          notes: data.notes,
        },
      });

      logger.info(`Backup created: ${backup.id} (${data.backupType})`);

      return res.status(201).json({
        success: true,
        data: {
          id: backup.id,
          backupType: backup.backupType,
          createdAt: backup.createdAt,
        },
        message: 'Backup created successfully',
      });
    } catch (error: any) {
      logger.error(`Create backup error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to create backup',
      });
    }
  }

  /**
   * Listar backups
   */
  static async list(req: Request, res: Response) {
    try {
      const { vpsId } = req.query;

      const where: any = {};

      if (vpsId) {
        where.vpsId = vpsId as string;
      }

      const backups = await prisma.backup.findMany({
        where,
        include: {
          vps: {
            select: {
              name: true,
            },
          },
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.json({
        success: true,
        data: backups,
      });
    } catch (error: any) {
      logger.error(`List backups error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to list backups',
      });
    }
  }

  /**
   * Obtener detalles de un backup
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
        include: {
          vps: true,
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          error: 'Backup not found',
        });
      }

      return res.json({
        success: true,
        data: backup,
      });
    } catch (error: any) {
      logger.error(`Get backup error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get backup',
      });
    }
  }

  /**
   * Restaurar backup
   */
  static async restore(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
        include: { vps: true },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          error: 'Backup not found',
        });
      }

      // TODO: Implementar restauración usando SSHService

      await prisma.backup.update({
        where: { id },
        data: {
          restoredAt: new Date(),
        },
      });

      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: backup.vpsId,
          action: 'restore_backup',
          status: 'success',
          details: JSON.stringify({ backupId: backup.id }),
        },
      });

      logger.info(`Backup restored: ${backup.id}`);

      return res.json({
        success: true,
        message: 'Backup restored successfully',
      });
    } catch (error: any) {
      logger.error(`Restore backup error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to restore backup',
      });
    }
  }

  /**
   * Eliminar backup
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.backup.delete({
        where: { id },
      });

      logger.info(`Backup deleted: ${id}`);

      return res.json({
        success: true,
        message: 'Backup deleted successfully',
      });
    } catch (error: any) {
      logger.error(`Delete backup error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete backup',
      });
    }
  }
}
