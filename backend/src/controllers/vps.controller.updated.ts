import { Request, Response } from 'express';
import prisma from '../config/database';
import { SSHInteractiveService } from '../services/ssh-interactive.service';
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
      const data: VPSPayload = req.body;

      // Encriptar clave privada antes de guardar
      const encryptedKey = encrypt(data.privateKey || '');

      // Primero verificar conexión SSH
      const sshConfig: SSHConfig = {
        host: data.host,
        port: data.port,
        username: data.username,
        privateKey: data.privateKey,
      };

      logger.info(`Testing SSH connection to ${data.host}:${data.port}...`);
      const isConnected = await SSHInteractiveService.testConnection(sshConfig);

      if (!isConnected) {
        return res.status(400).json({
          success: false,
          error: 'Failed to connect to VPS via SSH. Verify host, port, username and private key.',
        });
      }

      logger.info('SSH connection successful, checking ADMRufu installation...');

      // Verificar si ADMRufu está instalado
      const hasADMRufu = await SSHInteractiveService.checkADMRufuInstalled(sshConfig);

      if (!hasADMRufu) {
        return res.status(400).json({
          success: false,
          error: 'ADMRufu is not installed on this VPS. Please install it first.',
        });
      }

      logger.info('ADMRufu detected, getting version...');

      // Obtener versión
      const version = await SSHInteractiveService.getADMRufuVersion(sshConfig);

      // Crear VPS en base de datos
      const vps = await prisma.vPS.create({
        data: {
          name: data.name,
          host: data.host,
          port: data.port,
          username: data.username,
          privateKey: encryptedKey,
          location: data.location,
          provider: data.provider,
          status: 'online',
          version: version || undefined,
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
            version,
          }),
        },
      });

      logger.info(`VPS created: ${vps.name} (${vps.host}) - ADMRufu ${version}`);

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
        message: 'VPS added successfully',
      });
    } catch (error: any) {
      logger.error(`Create VPS error: ${error.message}`);
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
        privateKey: vps.privateKey ? decrypt(vps.privateKey as string) : undefined,
      };

      logger.info(`Checking status of VPS: ${vps.name}`);
      const isOnline = await SSHInteractiveService.testConnection(sshConfig);

      let stats: Record<string, number> | null = null;
      if (isOnline) {
        // Obtener estadísticas del sistema
        try {
          const command = `
            echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}' 2>/dev/null || echo "0")"
            echo "MEM: $(free | grep Mem | awk '{print ($3/$2) * 100.0}' 2>/dev/null || echo "0")"
            echo "DISK: $(df -h / | tail -1 | awk '{print $5}' | sed 's/%//' 2>/dev/null || echo "0")"
            echo "USERS: $(awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | wc -l 2>/dev/null || echo "0")"
          `;

          const result = await SSHInteractiveService.executeCommand(sshConfig, command.trim());

          if (result.success) {
            stats = {};
            const lines = result.stdout.split('\n');

            lines.forEach(line => {
              const [key, value] = line.split(': ');
              if (key && value && stats) {
                stats[key.toLowerCase()] = parseFloat(value);
              }
            });
          }
        } catch (error) {
          logger.warn(`Failed to get system stats: ${error}`);
        }
      }

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
        },
      });
    } catch (error: any) {
      logger.error(`Check VPS status error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to check VPS status',
      });
    }
  }
}
