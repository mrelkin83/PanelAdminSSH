import { Client, ClientChannel } from 'ssh2';
import { SSHConfig, SSHCommandResult, ADMRufuUserData, ADMRufuConnectionData } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export class SSHService {
  /**
   * Ejecuta un comando SSH en el VPS remoto
   */
  static async executeCommand(
    sshConfig: SSHConfig,
    command: string
  ): Promise<SSHCommandResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';

      conn.on('ready', () => {
        logger.debug(`SSH connected to ${sshConfig.host}, executing: ${command}`);

        conn.exec(command, (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code: number) => {
            conn.end();
            logger.debug(`Command finished with code ${code}`);
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

      conn.on('error', (err: Error) => {
        logger.error(`SSH connection error: ${err.message}`);
        reject(err);
      });

      conn.on('timeout', () => {
        conn.end();
        reject(new Error('SSH connection timeout'));
      });

      conn.connect({
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        privateKey: sshConfig.privateKey,
        timeout: sshConfig.timeout || config.SSH_TIMEOUT,
        keepaliveInterval: sshConfig.keepaliveInterval || config.SSH_KEEPALIVE_INTERVAL,
        readyTimeout: 30000,
      });
    });
  }

  /**
   * Verifica conexión SSH al VPS
   */
  static async testConnection(sshConfig: SSHConfig): Promise<boolean> {
    try {
      const result = await this.executeCommand(sshConfig, 'echo "test"');
      return result.success && result.stdout === 'test';
    } catch (error) {
      logger.error(`SSH test connection failed: ${error}`);
      return false;
    }
  }

  /**
   * Verifica si ADMRufu está instalado
   */
  static async checkADMRufuInstalled(sshConfig: SSHConfig): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        sshConfig,
        'test -d /etc/ADMRufu && echo "installed" || echo "not_installed"'
      );
      return result.stdout.includes('installed');
    } catch (error) {
      logger.error(`Error checking ADMRufu installation: ${error}`);
      return false;
    }
  }

  /**
   * Obtiene la versión de ADMRufu instalada
   */
  static async getADMRufuVersion(sshConfig: SSHConfig): Promise<string | null> {
    try {
      const result = await this.executeCommand(
        sshConfig,
        'cat /etc/ADMRufu/vercion 2>/dev/null || echo "unknown"'
      );
      return result.success ? result.stdout : null;
    } catch (error) {
      logger.error(`Error getting ADMRufu version: ${error}`);
      return null;
    }
  }

  // ==================== GESTIÓN DE USUARIOS SSH ====================

  /**
   * Crea un usuario SSH usando ADMRufu
   */
  static async createSSHUser(
    sshConfig: SSHConfig,
    username: string,
    password: string,
    days: number
  ): Promise<SSHCommandResult> {
    // ADMRufu normalmente usa un menú interactivo, pero podemos llamar directamente
    // al script con parámetros si el script lo soporta, o usar expect/echo
    const command = `
      # Crear usuario usando comandos del sistema (método compatible)
      useradd -M -s /bin/false -e $(date -d "+${days} days" +%Y-%m-%d) ${username} &&
      echo "${username}:${password}" | chpasswd &&
      echo "Usuario ${username} creado exitosamente"
    `;

    return this.executeCommand(sshConfig, command.trim());
  }

  /**
   * Renueva un usuario SSH (extiende expiración)
   */
  static async renewSSHUser(
    sshConfig: SSHConfig,
    username: string,
    days: number
  ): Promise<SSHCommandResult> {
    const command = `
      chage -E $(date -d "+${days} days" +%Y-%m-%d) ${username} &&
      echo "Usuario ${username} renovado por ${days} días"
    `;

    return this.executeCommand(sshConfig, command.trim());
  }

  /**
   * Elimina un usuario SSH
   */
  static async deleteSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<SSHCommandResult> {
    const command = `
      userdel ${username} &&
      echo "Usuario ${username} eliminado exitosamente"
    `;

    return this.executeCommand(sshConfig, command.trim());
  }

  /**
   * Bloquea un usuario SSH
   */
  static async blockSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<SSHCommandResult> {
    const command = `
      passwd -l ${username} &&
      echo "Usuario ${username} bloqueado"
    `;

    return this.executeCommand(sshConfig, command.trim());
  }

  /**
   * Desbloquea un usuario SSH
   */
  static async unblockSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<SSHCommandResult> {
    const command = `
      passwd -u ${username} &&
      echo "Usuario ${username} desbloqueado"
    `;

    return this.executeCommand(sshConfig, command.trim());
  }

  /**
   * Lista todos los usuarios SSH
   */
  static async listSSHUsers(sshConfig: SSHConfig): Promise<ADMRufuUserData[]> {
    try {
      // Obtener usuarios del sistema con fecha de expiración
      const command = `
        awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | while read user; do
          expiry=$(chage -l $user 2>/dev/null | grep "Account expires" | cut -d: -f2 | xargs)
          locked=$(passwd -S $user 2>/dev/null | awk '{print $2}')
          echo "$user|$expiry|$locked"
        done
      `;

      const result = await this.executeCommand(sshConfig, command.trim());

      if (!result.success) {
        return [];
      }

      const users: ADMRufuUserData[] = [];
      const lines = result.stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [username, expiry, locked] = line.split('|');

        if (!username) continue;

        const expirationDate = expiry && expiry !== 'never' ? expiry : '';
        const isBlocked = locked === 'L';

        // Calcular días restantes
        let daysRemaining = -1;
        if (expirationDate && expirationDate !== 'never') {
          const expiryTime = new Date(expirationDate).getTime();
          const now = Date.now();
          daysRemaining = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));
        }

        users.push({
          username,
          password: '***', // No se puede recuperar la password
          expirationDate,
          daysRemaining,
          isActive: daysRemaining > 0 || daysRemaining === -1,
          isBlocked,
        });
      }

      return users;
    } catch (error) {
      logger.error(`Error listing SSH users: ${error}`);
      return [];
    }
  }

  /**
   * Obtiene información detallada de un usuario SSH
   */
  static async getUserInfo(
    sshConfig: SSHConfig,
    username: string
  ): Promise<ADMRufuUserData | null> {
    try {
      const command = `
        if id "${username}" &>/dev/null; then
          expiry=$(chage -l ${username} 2>/dev/null | grep "Account expires" | cut -d: -f2 | xargs)
          locked=$(passwd -S ${username} 2>/dev/null | awk '{print $2}')
          echo "$expiry|$locked"
        else
          echo "USER_NOT_FOUND"
        fi
      `;

      const result = await this.executeCommand(sshConfig, command.trim());

      if (!result.success || result.stdout === 'USER_NOT_FOUND') {
        return null;
      }

      const [expiry, locked] = result.stdout.split('|');
      const expirationDate = expiry && expiry !== 'never' ? expiry : '';
      const isBlocked = locked === 'L';

      let daysRemaining = -1;
      if (expirationDate && expirationDate !== 'never') {
        const expiryTime = new Date(expirationDate).getTime();
        const now = Date.now();
        daysRemaining = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));
      }

      return {
        username,
        password: '***',
        expirationDate,
        daysRemaining,
        isActive: daysRemaining > 0 || daysRemaining === -1,
        isBlocked,
      };
    } catch (error) {
      logger.error(`Error getting user info: ${error}`);
      return null;
    }
  }

  /**
   * Obtiene usuarios conectados actualmente
   */
  static async getConnectedUsers(
    sshConfig: SSHConfig
  ): Promise<ADMRufuConnectionData[]> {
    try {
      // Comando para listar conexiones SSH activas
      const command = `
        w -h | awk '{print $1"|"$3"|"$4}' | sort -u
      `;

      const result = await this.executeCommand(sshConfig, command.trim());

      if (!result.success) {
        return [];
      }

      const connections: ADMRufuConnectionData[] = [];
      const lines = result.stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [username, ipAddress, time] = line.split('|');

        if (!username || username === 'root') continue;

        connections.push({
          username,
          ipAddress: ipAddress || 'unknown',
          connectedAt: time || 'unknown',
          protocol: 'SSH',
        });
      }

      return connections;
    } catch (error) {
      logger.error(`Error getting connected users: ${error}`);
      return [];
    }
  }

  /**
   * Obtiene estadísticas del sistema
   */
  static async getSystemStats(sshConfig: SSHConfig): Promise<any> {
    try {
      const command = `
        echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')"
        echo "MEM: $(free | grep Mem | awk '{print ($3/$2) * 100.0}')"
        echo "DISK: $(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')"
        echo "USERS: $(awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | wc -l)"
      `;

      const result = await this.executeCommand(sshConfig, command.trim());

      if (!result.success) {
        return null;
      }

      const stats: any = {};
      const lines = result.stdout.split('\n');

      lines.forEach(line => {
        const [key, value] = line.split(': ');
        if (key && value) {
          stats[key.toLowerCase()] = parseFloat(value);
        }
      });

      return stats;
    } catch (error) {
      logger.error(`Error getting system stats: ${error}`);
      return null;
    }
  }
}
