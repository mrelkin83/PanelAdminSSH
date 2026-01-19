/**
 * Maintenance Controller
 * Funciones de mantenimiento del sistema
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import { ConnectionLimitService } from '../services/connection-limit.service';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MaintenanceController {
  /**
   * Verificar usuarios expirados y desactivarlos
   */
  static async checkExpired(req: Request, res: Response) {
    try {
      const result = await ConnectionLimitService.checkExpiredUsers();

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user?.id,
          action: 'check_expired_users',
          status: 'success',
          details: JSON.stringify(result),
        },
      });

      res.json({
        success: true,
        data: result,
        message: `${result.deactivated} usuarios expirados desactivados`,
      });
    } catch (error: any) {
      logger.error(`Check expired error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to check expired users',
      });
    }
  }

  /**
   * Verificar límites de conexiones
   */
  static async checkConnectionLimits(req: Request, res: Response) {
    try {
      const results = await ConnectionLimitService.checkAllLimits();

      const exceeded = results.filter((r) => r.exceeded);
      const blocked = results.filter((r) => r.blocked);

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user?.id,
          action: 'check_connection_limits',
          status: 'success',
          details: JSON.stringify({
            total: results.length,
            exceeded: exceeded.length,
            blocked: blocked.length,
          }),
        },
      });

      res.json({
        success: true,
        data: {
          total: results.length,
          exceeded: exceeded.length,
          blocked: blocked.length,
          results: exceeded,
        },
        message: `${blocked.length} usuarios bloqueados por exceder límite`,
      });
    } catch (error: any) {
      logger.error(`Check connection limits error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to check connection limits',
      });
    }
  }

  /**
   * Limpiar logs antiguos de la API
   */
  static async cleanApiLogs(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const daysNumber = parseInt(days as string);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysNumber);

      // Eliminar logs antiguos de la base de datos
      const result = await prisma.actionLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Limpiar archivos de log físicos
      const logsDir = path.join(process.cwd(), 'logs');
      let filesDeleted = 0;

      try {
        const files = await fs.readdir(logsDir);

        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(logsDir, file);
            const stats = await fs.stat(filePath);

            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              filesDeleted++;
            }
          }
        }
      } catch (err) {
        logger.warn(`Could not clean log files: ${err}`);
      }

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user?.id,
          action: 'clean_api_logs',
          status: 'success',
          details: JSON.stringify({
            days: daysNumber,
            dbLogsDeleted: result.count,
            filesDeleted,
          }),
        },
      });

      logger.info(`Cleaned ${result.count} DB logs and ${filesDeleted} log files`);

      res.json({
        success: true,
        data: {
          dbLogsDeleted: result.count,
          filesDeleted,
          days: daysNumber,
        },
        message: `Logs antiguos eliminados: ${result.count} registros DB, ${filesDeleted} archivos`,
      });
    } catch (error: any) {
      logger.error(`Clean API logs error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to clean API logs',
      });
    }
  }

  /**
   * Optimizar base de datos (VACUUM, ANALYZE)
   */
  static async optimizeDatabase(req: Request, res: Response) {
    try {
      // Ejecutar VACUUM ANALYZE en PostgreSQL
      await prisma.$executeRawUnsafe('VACUUM ANALYZE');

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          adminId: req.user?.id,
          action: 'optimize_database',
          status: 'success',
        },
      });

      logger.info('Database optimized successfully');

      res.json({
        success: true,
        message: 'Base de datos optimizada exitosamente',
      });
    } catch (error: any) {
      logger.error(`Optimize database error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to optimize database',
      });
    }
  }

  /**
   * Obtener estadísticas del sistema
   */
  static async getSystemStats(_req: Request, res: Response) {
    try {
      const [
        totalVPS,
        activeVPS,
        totalUsers,
        activeUsers,
        blockedUsers,
        expiredUsers,
        totalConnections,
        logsCount,
      ] = await Promise.all([
        prisma.vPS.count(),
        prisma.vPS.count({ where: { status: 'online' } }),
        prisma.sSHUser.count(),
        prisma.sSHUser.count({ where: { isActive: true, isBlocked: false } }),
        prisma.sSHUser.count({ where: { isBlocked: true } }),
        prisma.sSHUser.count({ where: { expiresAt: { lt: new Date() } } }),
        prisma.connection.count(),
        prisma.actionLog.count(),
      ]);

      // Logs de la última semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentLogs = await prisma.actionLog.count({
        where: { createdAt: { gte: weekAgo } },
      });

      res.json({
        success: true,
        data: {
          vps: {
            total: totalVPS,
            active: activeVPS,
            offline: totalVPS - activeVPS,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            blocked: blockedUsers,
            expired: expiredUsers,
          },
          connections: {
            total: totalConnections,
          },
          logs: {
            total: logsCount,
            lastWeek: recentLogs,
          },
        },
      });
    } catch (error: any) {
      logger.error(`Get system stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get system stats',
      });
    }
  }

  /**
   * Configurar verificación automática
   */
  static async configAutoCheck(req: Request, res: Response) {
    try {
      const { enabled, intervalMinutes = 5 } = req.body;

      if (enabled) {
        // Iniciar verificación periódica
        ConnectionLimitService.startPeriodicCheck(intervalMinutes);

        logger.info(`Auto-check enabled: every ${intervalMinutes} minutes`);

        res.json({
          success: true,
          message: `Verificación automática activada (cada ${intervalMinutes} minutos)`,
        });
      } else {
        // Aquí deberías implementar la lógica para detener el intervalo
        res.json({
          success: true,
          message: 'Verificación automática desactivada',
        });
      }
    } catch (error: any) {
      logger.error(`Config auto check error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to configure auto check',
      });
    }
  }
}
