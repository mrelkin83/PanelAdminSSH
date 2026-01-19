import { Request, Response } from 'express';
import prisma from '../config/database';
import { SSHInteractiveService } from '../services/ssh-interactive.service';
import { ADMRufuService } from '../services/admrufu.service';
import { VPSMonitoringService } from '../services/vps-monitoring.service';
import { MaintenanceService } from '../services/maintenance.service';
import { encrypt, decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import { VPSPayload, SSHConfig } from '../types';

export class VPSController {
  /**
   * Listar todos los VPS
   */
  static async list(_req: Request, res: Response) {
    try {
      const vps = await prisma.vPS.findMany({
        select: {
          id: true,
          name: true,
          host: true,
          port: true,
          username: true,
          location: true,
          provider: true,
          isActive: true,
          status: true,
          version: true,
          lastCheckAt: true,
          createdAt: true,
          _count: {
            select: {
              sshUsers: true,
              connections: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.json({
        success: true,
        data: vps,
      });
    } catch (error: any) {
      logger.error(`List VPS error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to list VPS',
      });
    }
  }

  /**
   * Agregar nuevo VPS
   */
  static async create(req: Request, res: Response) {
    try {
      const data: VPSPayload & { skipValidation?: boolean } = req.body;

      // Encriptar credenciales antes de guardar
      const encryptedKey = data.privateKey ? encrypt(data.privateKey) : null;
      const encryptedPassword = data.password ? encrypt(data.password) : null;

      // Configurar SSH
      const sshConfig: SSHConfig = {
        host: data.host,
        port: data.port,
        username: data.username,
      };

      if (data.privateKey) {
        sshConfig.privateKey = data.privateKey;
      }
      if (data.password) {
        sshConfig.password = data.password;
      }

      let vpsStatus = 'unknown';
      let vpsVersion: string | null = null;
      let connectionWarnings: string[] = [];

      // Verificar conexión SSH (opcional si skipValidation = true)
      if (!data.skipValidation) {
        logger.info(`Testing SSH connection to ${data.host}:${data.port}...`);
        const connectionTest = await SSHInteractiveService.testConnection(sshConfig);

        if (!connectionTest.success) {
          logger.warn(`SSH connection test failed: ${connectionTest.error}`);
          logger.warn(`Details: ${JSON.stringify(connectionTest.details)}`);

          return res.status(400).json({
            success: false,
            error: 'Failed to connect to VPS via SSH',
            message: connectionTest.error,
            details: connectionTest.details,
            suggestion: 'You can add VPS with skipValidation=true to bypass this check',
          });
        }

        logger.info(`SSH connection successful to ${data.host}`);

        // Verificar si ADMRufu está instalado
        logger.info(`Checking if ADMRufu is installed on ${data.host}...`);
        const hasADMRufu = await SSHInteractiveService.checkADMRufuInstalled(sshConfig);

        if (!hasADMRufu) {
          logger.warn(`ADMRufu not found on ${data.host}`);
          connectionWarnings.push('ADMRufu is not installed on this VPS');

          // No bloquear la creación, pero advertir
          // El usuario puede instalar ADMRufu después
        } else {
          logger.info(`ADMRufu detected on ${data.host}`);
          // Obtener versión
          vpsVersion = await SSHInteractiveService.getADMRufuVersion(sshConfig);
          logger.info(`ADMRufu version: ${vpsVersion || 'unknown'}`);
        }

        vpsStatus = 'online';
      } else {
        logger.info(`Skipping SSH validation for ${data.host} (skipValidation=true)`);
        vpsStatus = 'unknown';
        connectionWarnings.push('SSH validation was skipped - verify connection manually');
      }

      // Crear VPS en base de datos
      const vps = await prisma.vPS.create({
        data: {
          name: data.name,
          host: data.host,
          port: data.port,
          username: data.username,
          privateKey: encryptedKey,
          password: encryptedPassword,
          location: data.location,
          provider: data.provider,
          status: vpsStatus,
          version: vpsVersion || undefined,
          lastCheckAt: new Date(),
        },
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          action: 'create_vps',
          status: 'success',
          details: JSON.stringify({
            vpsName: vps.name,
            skipValidation: data.skipValidation || false,
            warnings: connectionWarnings,
          }),
        },
      });

      logger.info(`VPS created: ${vps.name} (${vps.host}) - Status: ${vpsStatus}`);

      const responseMessage =
        connectionWarnings.length > 0
          ? `VPS added with warnings: ${connectionWarnings.join('; ')}`
          : 'VPS added successfully';

      return res.status(201).json({
        success: true,
        data: {
          id: vps.id,
          name: vps.name,
          host: vps.host,
          port: vps.port,
          status: vps.status,
          version: vps.version,
        },
        message: responseMessage,
        warnings: connectionWarnings,
      });
    } catch (error: any) {
      logger.error(`Create VPS error: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to create VPS',
        details: error.message,
      });
    }
  }

  /**
   * Obtener detalles de un VPS
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              sshUsers: true,
              connections: true,
            },
          },
        },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
      }

      // No enviar la clave privada en la respuesta
      const { privateKey, ...vpsData } = vps;

      return res.json({
        success: true,
        data: vpsData,
      });
    } catch (error: any) {
      logger.error(`Get VPS error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get VPS',
      });
    }
  }

  /**
   * Actualizar VPS
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: Partial<VPSPayload> = req.body;

      // Si se actualiza la clave privada, encriptarla
      if (data.privateKey) {
        data.privateKey = encrypt(data.privateKey);
      }

      const vps = await prisma.vPS.update({
        where: { id },
        data,
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          action: 'update_vps',
          status: 'success',
        },
      });

      logger.info(`VPS updated: ${vps.name}`);

      const { privateKey, ...vpsData } = vps;

      return res.json({
        success: true,
        data: vpsData,
        message: 'VPS updated successfully',
      });
    } catch (error: any) {
      logger.error(`Update VPS error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to update VPS',
      });
    }
  }

  /**
   * Eliminar VPS
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.delete({
        where: { id },
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          action: 'delete_vps',
          status: 'success',
          details: JSON.stringify({ vpsName: vps.name }),
        },
      });

      logger.info(`VPS deleted: ${vps.name}`);

      return res.json({
        success: true,
        message: 'VPS deleted successfully',
      });
    } catch (error: any) {
      logger.error(`Delete VPS error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete VPS',
      });
    }
  }

  /**
   * Verificar estado de conexión del VPS
   */
  static async checkStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
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

      const connectionTest = await SSHInteractiveService.testConnection(sshConfig);
      const isOnline = connectionTest.success;
      const stats = null;

      // Actualizar estado en DB
      await prisma.vPS.update({
        where: { id },
        data: {
          status: isOnline ? 'online' : 'offline',
          lastCheckAt: new Date(),
        },
      });

      return res.json({
        success: true,
        data: {
          isOnline,
          stats,
          connectionError: connectionTest.error,
          connectionDetails: connectionTest.details,
        },
      });
    } catch (error: any) {
      logger.error(`Check VPS status error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to check VPS status',
        details: error.message,
      });
    }
  }

  /**
   * Sincronizar usuarios desde el VPS
   * Importa todos los usuarios SSH existentes en el VPS a la base de datos
   */
  static async syncUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
      }

      // Configurar SSH
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

      logger.info(`Sincronizando usuarios del VPS: ${vps.name}`);

      // Obtener lista de usuarios desde ADMRufu
      const admrufuUsers = await ADMRufuService.listSSHUsers(sshConfig);

      if (!admrufuUsers || admrufuUsers.length === 0) {
        return res.json({
          success: true,
          data: {
            imported: 0,
            skipped: 0,
            total: 0,
          },
          message: 'No hay usuarios en el VPS para sincronizar',
        });
      }

      let imported = 0;
      let skipped = 0;

      // Importar cada usuario a la base de datos
      for (const admUser of admrufuUsers) {
        try {
          // Verificar si el usuario ya existe
          const existing = await prisma.sSHUser.findUnique({
            where: {
              vpsId_username: {
                vpsId: vps.id,
                username: admUser.username,
              },
            },
          });

          if (existing) {
            // Actualizar información del usuario existente
            await prisma.sSHUser.update({
              where: { id: existing.id },
              data: {
                isActive: admUser.isActive,
                isBlocked: admUser.isBlocked,
                expiresAt: new Date(admUser.expirationDate),
              },
            });
            skipped++;
            logger.debug(`Usuario actualizado: ${admUser.username}`);
          } else {
            // Crear nuevo usuario
            await prisma.sSHUser.create({
              data: {
                vpsId: vps.id,
                username: admUser.username,
                password: encrypt('***'), // No conocemos la password real
                expiresAt: new Date(admUser.expirationDate),
                isActive: admUser.isActive,
                isBlocked: admUser.isBlocked,
                notes: 'Importado desde VPS',
              },
            });
            imported++;
            logger.debug(`Usuario importado: ${admUser.username}`);
          }
        } catch (err: any) {
          logger.error(`Error al importar usuario ${admUser.username}: ${err.message}`);
        }
      }

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          action: 'sync_users',
          status: 'success',
          details: JSON.stringify({
            total: admrufuUsers.length,
            imported,
            skipped,
          }),
        },
      });

      logger.info(`Sincronización completada: ${imported} importados, ${skipped} actualizados`);

      return res.json({
        success: true,
        data: {
          imported,
          skipped,
          total: admrufuUsers.length,
        },
        message: `Se sincronizaron ${admrufuUsers.length} usuarios (${imported} nuevos, ${skipped} actualizados)`,
      });
    } catch (error: any) {
      logger.error(`Sync users error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to sync users from VPS',
        details: error.message,
      });
    }
  }

  /**
   * Obtener métricas de monitoreo del VPS
   */
  static async getMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
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

      try {
        const metrics = await VPSMonitoringService.getMetrics(sshConfig);

        // Actualizar estado a online si las métricas se obtuvieron correctamente
        await prisma.vPS.update({
          where: { id },
          data: { status: 'online', lastCheckAt: new Date() },
        });

        return res.json({
          success: true,
          data: {
            vpsId: id,
            vpsName: vps.name,
            status: 'online',
            cpuUsage: metrics.cpu,
            ramUsage: metrics.ram,
            diskUsage: metrics.disk,
            uptime: metrics.uptime,
            ports: metrics.ports.map((p) => p.port),
          },
        });
      } catch (metricsError: any) {
        // Si falla la obtención de métricas, devolver estado offline con error
        logger.warn(`Failed to get metrics from ${vps.name}: ${metricsError.message}`);

        // Actualizar estado a offline
        await prisma.vPS.update({
          where: { id },
          data: { status: 'offline', lastCheckAt: new Date() },
        });

        return res.json({
          success: true,
          data: {
            vpsId: id,
            vpsName: vps.name,
            status: 'error',
            error: metricsError.message || 'No se pudo conectar al VPS',
          },
        });
      }
    } catch (error: any) {
      logger.error(`Get VPS metrics error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to get VPS metrics',
        details: error.message,
      });
    }
  }

  /**
   * Reiniciar VPS
   */
  static async restart(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
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

      // Ejecutar comando de reinicio usando MaintenanceService
      const result = await MaintenanceService.restartVPS(sshConfig);

      if (!result.success) {
        await prisma.actionLog.create({
          data: {
            adminId: req.user!.id,
            vpsId: vps.id,
            action: 'restart_vps',
            status: 'error',
            errorMessage: result.error,
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to restart VPS',
        });
      }

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          action: 'restart_vps',
          status: 'success',
        },
      });

      logger.info(`VPS restart initiated: ${vps.name}`);

      return res.json({
        success: true,
        message: 'VPS restart initiated',
      });
    } catch (error: any) {
      logger.error(`Restart VPS error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to restart VPS',
        details: error.message,
      });
    }
  }

  /**
   * Limpiar logs del VPS
   */
  static async clearLogs(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const vps = await prisma.vPS.findUnique({
        where: { id },
      });

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
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

      // Limpiar logs usando MaintenanceService
      const result = await MaintenanceService.cleanVPSLogs(sshConfig);

      if (!result.success) {
        await prisma.actionLog.create({
          data: {
            adminId: req.user!.id,
            vpsId: vps.id,
            action: 'clear_vps_logs',
            status: 'error',
            errorMessage: result.error,
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to clear VPS logs',
        });
      }

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user!.id,
          vpsId: vps.id,
          action: 'clear_vps_logs',
          status: 'success',
        },
      });

      logger.info(`VPS logs cleared: ${vps.name}`);

      return res.json({
        success: true,
        message: 'VPS logs cleared successfully',
      });
    } catch (error: any) {
      logger.error(`Clear VPS logs error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to clear VPS logs',
        details: error.message,
      });
    }
  }
}
