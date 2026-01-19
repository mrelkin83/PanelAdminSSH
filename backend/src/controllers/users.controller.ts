import { Request, Response } from 'express';
import prisma from '../config/database';
import { SSHDirectService } from '../services/ssh-direct.service';
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

      // No enviar passwords en la respuesta
      const usersData = users.map(user => {
        const { password, ...userData } = user;

        // Calcular días restantes correctamente (comparando fechas completas, no horas)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Inicio del día actual
        const expiresDate = new Date(user.expiresAt);
        expiresDate.setHours(23, 59, 59, 999); // Final del día de expiración
        const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...userData,
          daysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
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
   * Crear nuevo usuario SSH
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

      // Verificar si el usuario ya existe en este VPS
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
      };

      // Descifrar credenciales
      if (vps.privateKey) {
        sshConfig.privateKey = decrypt(vps.privateKey);
      }
      if (vps.password) {
        sshConfig.password = decrypt(vps.password);
      }

      // Calcular fecha de expiración (corregido: usar setDate para días completos)
      const expiresAt = new Date();
      expiresAt.setHours(0, 0, 0, 0); // Resetear a medianoche
      expiresAt.setDate(expiresAt.getDate() + data.days); // Sumar días completos
      expiresAt.setHours(23, 59, 59, 999); // Fin del día de expiración

      // Crear usuario usando comandos Linux directos (permite nombres hexadecimales)
      const result = await SSHDirectService.createUser(
        sshConfig,
        data.username,
        data.password,
        expiresAt
      );

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
          error: result.error || 'Failed to create user on VPS',
        });
      }

      // Encriptar password
      const encryptedPassword = encrypt(data.password);

      // Guardar en base de datos
      const user = await prisma.sSHUser.create({
        data: {
          vpsId: data.vpsId,
          username: data.username,
          alias: data.alias,
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
          }),
        },
      });

      logger.info(`User created: ${user.username} on VPS ${vps.name}`);

      const { password, ...userData } = user;

      return res.status(201).json({
        success: true,
        data: {
          ...userData,
          
        },
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
   * Crear usuario SSH en múltiples VPS
   */
  static async createMultiple(req: Request, res: Response) {
    try {
      const { vpsIds, username, password, days, maxConnections, notes }: {
        vpsIds: string[] | 'all';
        username: string;
        password: string;
        days: number;
        maxConnections?: number;
        notes?: string;
      } = req.body;

      // Obtener VPS a procesar
      let targetVPS;
      if (vpsIds === 'all') {
        targetVPS = await prisma.vPS.findMany({ where: { isActive: true } });
      } else {
        targetVPS = await prisma.vPS.findMany({ where: { id: { in: vpsIds } } });
      }

      if (targetVPS.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No VPS found',
        });
      }

      const results = [];
      const errors = [];

      // Crear usuario en cada VPS
      for (const vps of targetVPS) {
        try {
          // Verificar si el usuario ya existe en este VPS
          const existingUser = await prisma.sSHUser.findUnique({
            where: {
              vpsId_username: {
                vpsId: vps.id,
                username: username,
              },
            },
          });

          if (existingUser) {
            errors.push({
              vpsId: vps.id,
              vpsName: vps.name,
              error: 'User already exists on this VPS',
            });
            continue;
          }

          const sshConfig: SSHConfig = {
            host: vps.host,
            port: vps.port,
            username: vps.username,
          };

          if (vps.privateKey) {
            sshConfig.privateKey = decrypt(vps.privateKey);
          }
          if (vps.password) {
            sshConfig.password = decrypt(vps.password);
          }

          // Calcular fecha de expiración (corregido: usar setDate para días completos)
          const expiresAt = new Date();
          expiresAt.setHours(0, 0, 0, 0); // Resetear a medianoche
          expiresAt.setDate(expiresAt.getDate() + days); // Sumar días completos
          expiresAt.setHours(23, 59, 59, 999); // Fin del día de expiración

          // Crear usuario usando comandos Linux directos
          const result = await SSHDirectService.createUser(
            sshConfig,
            username,
            password,
            expiresAt
          );

          if (!result.success) {
            errors.push({
              vpsId: vps.id,
              vpsName: vps.name,
              error: result.error || 'Failed to create user on VPS',
            });
            continue;
          }

          // Guardar en base de datos

          const createdUser = await prisma.sSHUser.create({
            data: {
              vpsId: vps.id,
              username,
              password: encrypt(password),
              expiresAt,
              maxConnections,
              notes,
            },
          });

          // Registrar acción
          await prisma.actionLog.create({
            data: {
              adminId: req.user!.id,
              vpsId: vps.id,
              sshUserId: createdUser.id,
              action: 'create_user_multiple',
              status: 'success',
              details: JSON.stringify({ username, days, vpsName: vps.name }),
            },
          });

          results.push({
            vpsId: vps.id,
            vpsName: vps.name,
            userId: createdUser.id,
            success: true,
          });

          logger.info(`User created on ${vps.name}: ${username}`);
        } catch (error: any) {
          errors.push({
            vpsId: vps.id,
            vpsName: vps.name,
            error: error.message,
          });
          logger.error(`Error creating user on ${vps.name}: ${error.message}`);
        }
      }

      return res.status(results.length > 0 ? 201 : 500).json({
        success: results.length > 0,
        data: {
          created: results.length,
          failed: errors.length,
          total: targetVPS.length,
          results,
          errors,
        },
        message: `Usuario creado en ${results.length}/${targetVPS.length} VPS`,
      });
    } catch (error: any) {
      logger.error(`Create multiple users error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to create users',
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

      // Calcular días restantes correctamente (comparando fechas completas, no horas)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Inicio del día actual
      const expiresDate = new Date(user.expiresAt);
      expiresDate.setHours(23, 59, 59, 999); // Final del día de expiración
      const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return res.json({
        success: true,
        data: {
          ...userData,
          daysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
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

  /**
   * Renovar usuario SSH
   */
  static async renew(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { days, fromToday = true }: RenewUserPayload & { fromToday?: boolean } = req.body;

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

      // Preparar config SSH
      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
      };

      // Descifrar credenciales
      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      // Actualizar fecha de expiración (corregido: usar setDate para días completos)
      let newExpiresAt: Date;

      if (fromToday) {
        // Renovar desde hoy
        newExpiresAt = new Date();
        newExpiresAt.setHours(0, 0, 0, 0);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
        newExpiresAt.setHours(23, 59, 59, 999);
      } else {
        // Renovar desde fecha de expiración actual
        newExpiresAt = new Date(user.expiresAt);
        newExpiresAt.setHours(0, 0, 0, 0);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
        newExpiresAt.setHours(23, 59, 59, 999);
      }

      // Renovar en el VPS remoto usando comandos directos
      const result = await SSHDirectService.updateExpiration(
        sshConfig,
        user.username,
        newExpiresAt
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

      const updatedUser = await prisma.sSHUser.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
          isActive: true,
        },
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'renew_user',
          status: 'success',
          details: JSON.stringify({ days, fromToday }),
        },
      });

      logger.info(`User renewed: ${user.username} for ${days} days (from ${fromToday ? 'today' : 'expiration'})`);

      return res.json({
        success: true,
        data: {
          expiresAt: updatedUser.expiresAt,
          fromToday,
        },
        message: `User renewed successfully for ${days} days from ${fromToday ? 'today' : 'current expiration'}`,
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
      };

      // Descifrar credenciales
      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      const result = await SSHDirectService.blockUser(sshConfig, user.username);

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
      };

      // Descifrar credenciales
      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      const result = await SSHDirectService.unblockUser(sshConfig, user.username);

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
   * Editar usuario SSH
   * Permite cambiar: password, expiración, límite de conexiones, notas
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { password, expiresAt, maxConnections, notes } = req.body;

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
      };

      // Descifrar credenciales del VPS
      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      const updateData: any = {};
      const sshOperations: string[] = [];

      // Cambiar contraseña si se proporciona
      if (password) {
        const { SSHService } = await import('../services/ssh.service');
        const result = await SSHService.executeCommand(
          sshConfig,
          `echo "${user.username}:${password}" | chpasswd`
        );

        if (result.success) {
          updateData.password = encrypt(password);
          sshOperations.push('password_changed');
          logger.info(`Password changed for user: ${user.username}`);
        } else {
          logger.error(`Failed to change password: ${result.stderr}`);
          return res.status(500).json({
            success: false,
            error: 'Failed to change password on VPS',
            details: result.stderr,
          });
        }
      }

      // Cambiar fecha de expiración si se proporciona
      if (expiresAt) {
        const newExpiryDate = new Date(expiresAt);
        const formattedDate = newExpiryDate.toISOString().split('T')[0];

        const { SSHService } = await import('../services/ssh.service');
        const result = await SSHService.executeCommand(
          sshConfig,
          `chage -E ${formattedDate} ${user.username}`
        );

        if (result.success) {
          updateData.expiresAt = newExpiryDate;
          sshOperations.push('expiry_changed');
          logger.info(`Expiry date changed for user: ${user.username}`);
        } else {
          logger.error(`Failed to change expiry date: ${result.stderr}`);
          return res.status(500).json({
            success: false,
            error: 'Failed to change expiry date on VPS',
            details: result.stderr,
          });
        }
      }

      // Actualizar límite de conexiones (solo en DB)
      if (maxConnections !== undefined) {
        updateData.maxConnections = maxConnections;
        sshOperations.push('max_connections_changed');
      }

      // Actualizar notas (solo en DB)
      if (notes !== undefined) {
        updateData.notes = notes;
        sshOperations.push('notes_changed');
      }

      // Actualizar en la base de datos
      const updatedUser = await prisma.sSHUser.update({
        where: { id },
        data: updateData,
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'update_user',
          status: 'success',
          details: JSON.stringify({
            username: user.username,
            operations: sshOperations,
          }),
        },
      });

      logger.info(`User updated: ${user.username} (${sshOperations.join(', ')})`);

      // No enviar password en la respuesta
      const { password: _, ...userData } = updatedUser;

      return res.json({
        success: true,
        data: userData,
        message: 'User updated successfully',
      });
    } catch (error: any) {
      logger.error(`Update user error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user',
        details: error.message,
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
      };

      // Descifrar credenciales
      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      const result = await SSHDirectService.deleteUser(sshConfig, user.username);

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
}
