/**
 * SSH Direct Service
 * Usa comandos Linux directos (useradd, chpasswd, etc.) en lugar de ADMRufu
 * Basado en el proyecto modelo - permite nombres hexadecimales
 */

import { Client } from 'ssh2';
import { SSHConfig } from '../types';
import { logger } from '../utils/logger';

export class SSHDirectService {
  /**
   * Ejecuta un comando SSH y retorna el resultado
   */
  static async executeCommand(
    sshConfig: SSHConfig,
    command: string,
    timeout: number = 10000
  ): Promise<{ success: boolean; stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';

      const timeoutHandle = setTimeout(() => {
        conn.end();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeoutHandle);
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code: number) => {
            clearTimeout(timeoutHandle);
            conn.end();
            resolve({
              success: code === 0,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              code,
            });
          });

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });

      const connectConfig: any = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        timeout: timeout,
        readyTimeout: timeout,
      };

      if (sshConfig.privateKey) {
        connectConfig.privateKey = sshConfig.privateKey;
      } else if (sshConfig.password) {
        connectConfig.password = sshConfig.password;
      }

      conn.connect(connectConfig);
    });
  }

  /**
   * Crea un usuario SSH usando comandos Linux directos
   * Permite nombres hexadecimales sin restricciones
   */
  static async createUser(
    sshConfig: SSHConfig,
    username: string,
    password: string,
    expirationDate: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Creando usuario: ${username}`);

      // 1. Crear usuario con useradd
      const createResult = await this.executeCommand(
        sshConfig,
        `useradd -m -s /bin/bash ${username}`
      );

      // Si el usuario ya existe, no es un error fatal
      if (!createResult.success && !createResult.stderr.includes('already exists')) {
        logger.error(`Error creando usuario: ${createResult.stderr}`);
        return {
          success: false,
          error: `Error creando usuario: ${createResult.stderr}`,
        };
      }

      // 2. Establecer contraseña con chpasswd
      const passResult = await this.executeCommand(
        sshConfig,
        `echo '${username}:${password}' | chpasswd`
      );

      if (!passResult.success) {
        logger.error(`Error estableciendo contraseña: ${passResult.stderr}`);
        return {
          success: false,
          error: `Error estableciendo contraseña: ${passResult.stderr}`,
        };
      }

      // 3. Establecer fecha de expiración con chage
      const expDate = this.formatDate(expirationDate);
      const expResult = await this.executeCommand(
        sshConfig,
        `chage -E ${expDate} ${username}`
      );

      if (!expResult.success) {
        logger.warn(`Advertencia al establecer expiración: ${expResult.stderr}`);
        // No es fatal, continuar
      }

      logger.info(`Usuario ${username} creado exitosamente`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en createUser: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Elimina un usuario SSH
   */
  static async deleteUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Eliminando usuario: ${username}`);

      // 1. Matar procesos del usuario
      await this.executeCommand(sshConfig, `pkill -u ${username} || true`);

      // Esperar un poco
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Eliminar usuario y su directorio home
      const result = await this.executeCommand(sshConfig, `userdel -r ${username}`);

      if (!result.success && !result.stderr.includes('does not exist')) {
        return {
          success: false,
          error: `Error eliminando usuario: ${result.stderr}`,
        };
      }

      logger.info(`Usuario ${username} eliminado exitosamente`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en deleteUser: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cambia la contraseña de un usuario
   */
  static async changePassword(
    sshConfig: SSHConfig,
    username: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Cambiando contraseña para: ${username}`);

      const result = await this.executeCommand(
        sshConfig,
        `echo '${username}:${newPassword}' | chpasswd`
      );

      if (!result.success) {
        return {
          success: false,
          error: `Error cambiando contraseña: ${result.stderr}`,
        };
      }

      logger.info(`Contraseña cambiada para ${username}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en changePassword: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Actualiza la fecha de expiración
   */
  static async updateExpiration(
    sshConfig: SSHConfig,
    username: string,
    expirationDate: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Actualizando expiración para: ${username}`);

      const expDate = this.formatDate(expirationDate);
      const result = await this.executeCommand(sshConfig, `chage -E ${expDate} ${username}`);

      if (!result.success) {
        return {
          success: false,
          error: `Error actualizando expiración: ${result.stderr}`,
        };
      }

      logger.info(`Expiración actualizada para ${username}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en updateExpiration: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Bloquea un usuario
   */
  static async blockUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Bloqueando usuario: ${username}`);

      const result = await this.executeCommand(sshConfig, `usermod -L ${username}`);

      if (!result.success) {
        return {
          success: false,
          error: `Error bloqueando usuario: ${result.stderr}`,
        };
      }

      logger.info(`Usuario ${username} bloqueado`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en blockUser: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Desbloquea un usuario
   */
  static async unblockUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[SSH Direct] Desbloqueando usuario: ${username}`);

      const result = await this.executeCommand(sshConfig, `usermod -U ${username}`);

      if (!result.success) {
        return {
          success: false,
          error: `Error desbloqueando usuario: ${result.stderr}`,
        };
      }

      logger.info(`Usuario ${username} desbloqueado`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error en unblockUser: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene el número de conexiones activas de un usuario
   */
  static async getConnections(sshConfig: SSHConfig, username: string): Promise<number> {
    try {
      const result = await this.executeCommand(
        sshConfig,
        `ps aux | grep "sshd.*${username}" | grep -v grep | wc -l`
      );

      if (result.success) {
        return parseInt(result.stdout.trim()) || 0;
      }

      return 0;
    } catch (error: any) {
      logger.error(`Error obteniendo conexiones: ${error.message}`);
      return 0;
    }
  }

  /**
   * Formatea una fecha para chage (YYYY-MM-DD)
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
