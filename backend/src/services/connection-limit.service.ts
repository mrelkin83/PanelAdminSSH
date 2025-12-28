/**
 * Connection Limit Service
 * Verifica y aplica límites de conexiones para usuarios SSH
 */

import prisma from '../config/database';
import { ADMRufuService } from './admrufu.service';
import { decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { SSHConfig } from '../types';

export interface ConnectionLimitCheck {
  userId: string;
  username: string;
  vpsId: string;
  maxConnections: number;
  currentConnections: number;
  exceeded: boolean;
  blocked: boolean;
}

export class ConnectionLimitService {
  /**
   * Verifica el límite de conexiones para todos los usuarios activos
   */
  static async checkAllLimits(): Promise<ConnectionLimitCheck[]> {
    try {
      // Obtener usuarios con límite de conexiones definido
      const users = await prisma.sSHUser.findMany({
        where: {
          isActive: true,
          isBlocked: false,
          maxConnections: {
            not: null,
            gt: 0,
          },
        },
        include: {
          vps: true,
        },
      });

      logger.info(`Checking connection limits for ${users.length} users`);

      const results: ConnectionLimitCheck[] = [];

      for (const user of users) {
        try {
          const result = await this.checkUserLimit(user.id);
          results.push(result);
        } catch (error: any) {
          logger.error(`Error checking limit for user ${user.username}: ${error.message}`);
        }
      }

      return results;
    } catch (error: any) {
      logger.error(`Error checking all limits: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica el límite de conexiones para un usuario específico
   */
  static async checkUserLimit(userId: string): Promise<ConnectionLimitCheck> {
    try {
      const user = await prisma.sSHUser.findUnique({
        where: { id: userId },
        include: { vps: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Si no tiene límite definido, no verificar
      if (!user.maxConnections || user.maxConnections <= 0) {
        return {
          userId: user.id,
          username: user.username,
          vpsId: user.vpsId,
          maxConnections: 0,
          currentConnections: 0,
          exceeded: false,
          blocked: false,
        };
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
      };

      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      // Obtener conexiones actuales
      const connections = await ADMRufuService.getConnectedUsers(sshConfig);
      const userConnections = connections.filter((conn) => conn.username === user.username);
      const currentConnections = userConnections.length;

      const exceeded = currentConnections > user.maxConnections;

      const result: ConnectionLimitCheck = {
        userId: user.id,
        username: user.username,
        vpsId: user.vpsId,
        maxConnections: user.maxConnections,
        currentConnections,
        exceeded,
        blocked: false,
      };

      // Si excede el límite, bloquear automáticamente
      if (exceeded && !user.isBlocked) {
        await this.blockUserForExceedingLimit(user.id, currentConnections, user.maxConnections);
        result.blocked = true;
        logger.warn(
          `User ${user.username} blocked for exceeding connection limit: ${currentConnections}/${user.maxConnections}`
        );
      }

      return result;
    } catch (error: any) {
      logger.error(`Error checking user limit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bloquea un usuario por exceder el límite de conexiones
   */
  private static async blockUserForExceedingLimit(
    userId: string,
    currentConnections: number,
    maxConnections: number
  ): Promise<void> {
    try {
      const user = await prisma.sSHUser.findUnique({
        where: { id: userId },
        include: { vps: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const sshConfig: SSHConfig = {
        host: user.vps.host,
        port: user.vps.port,
        username: user.vps.username,
      };

      if (user.vps.privateKey) {
        sshConfig.privateKey = decrypt(user.vps.privateKey);
      }
      if (user.vps.password) {
        sshConfig.password = decrypt(user.vps.password);
      }

      // Bloquear en el VPS
      await ADMRufuService.blockSSHUser(sshConfig, user.username);

      // Actualizar en la base de datos
      await prisma.sSHUser.update({
        where: { id: userId },
        data: { isBlocked: true },
      });

      // Registrar acción
      await prisma.actionLog.create({
        data: {
          vpsId: user.vpsId,
          sshUserId: user.id,
          action: 'auto_block_limit_exceeded',
          status: 'success',
          details: JSON.stringify({
            username: user.username,
            currentConnections,
            maxConnections,
            reason: 'Connection limit exceeded',
          }),
        },
      });

      logger.info(`User ${user.username} blocked for exceeding connection limit`);
    } catch (error: any) {
      logger.error(`Error blocking user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica expirados y los desactiva
   */
  static async checkExpiredUsers(): Promise<{
    deactivated: number;
    users: string[];
  }> {
    try {
      const expiredUsers = await prisma.sSHUser.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const usernames: string[] = [];

      for (const user of expiredUsers) {
        try {
          await prisma.sSHUser.update({
            where: { id: user.id },
            data: { isActive: false },
          });

          await prisma.actionLog.create({
            data: {
              vpsId: user.vpsId,
              sshUserId: user.id,
              action: 'auto_deactivate_expired',
              status: 'success',
              details: JSON.stringify({
                username: user.username,
                expiresAt: user.expiresAt,
              }),
            },
          });

          usernames.push(user.username);
        } catch (error: any) {
          logger.error(`Error deactivating expired user ${user.username}: ${error.message}`);
        }
      }

      if (usernames.length > 0) {
        logger.info(`Deactivated ${usernames.length} expired users`);
      }

      return {
        deactivated: usernames.length,
        users: usernames,
      };
    } catch (error: any) {
      logger.error(`Error checking expired users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicia verificación periódica (ejecutar con cron o interval)
   */
  static startPeriodicCheck(intervalMinutes: number = 5): NodeJS.Timeout {
    logger.info(`Starting periodic connection limit check every ${intervalMinutes} minutes`);

    const interval = setInterval(async () => {
      try {
        // Verificar límites de conexiones
        const limitResults = await this.checkAllLimits();
        const blocked = limitResults.filter((r) => r.blocked).length;

        if (blocked > 0) {
          logger.info(`Periodic check: ${blocked} users blocked for exceeding limits`);
        }

        // Verificar usuarios expirados
        const expiredResults = await this.checkExpiredUsers();
        if (expiredResults.deactivated > 0) {
          logger.info(`Periodic check: ${expiredResults.deactivated} expired users deactivated`);
        }
      } catch (error: any) {
        logger.error(`Error in periodic check: ${error.message}`);
      }
    }, intervalMinutes * 60 * 1000);

    return interval;
  }
}
