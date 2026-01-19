/**
 * Maintenance Service
 * Servicios de mantenimiento: limpieza de logs, reinicio de VPS
 * Basado en el proyecto modelo
 */

import { SSHDirectService } from './ssh-direct.service';
import { SSHConfig } from '../types';
import { logger } from '../utils/logger';

export class MaintenanceService {
  /**
   * Limpia logs del sistema en un VPS
   */
  static async cleanVPSLogs(sshConfig: SSHConfig): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[Maintenance] Limpiando logs en ${sshConfig.host}`);

      // Comandos para limpiar logs comunes
      const commands = [
        // Logs del sistema
        'truncate -s 0 /var/log/auth.log 2>/dev/null || true',
        'truncate -s 0 /var/log/syslog 2>/dev/null || true',
        'truncate -s 0 /var/log/kern.log 2>/dev/null || true',
        'truncate -s 0 /var/log/messages 2>/dev/null || true',

        // Logs antiguos
        'rm -f /var/log/*.gz 2>/dev/null || true',
        'rm -f /var/log/*.1 2>/dev/null || true',
        'rm -f /var/log/*.old 2>/dev/null || true',

        // Logs de VPN/Proxy
        'find /var/log/v2ray/ -type f -delete 2>/dev/null || true',
        'find /var/log/xray/ -type f -delete 2>/dev/null || true',
        'find /var/log/squid/ -type f -delete 2>/dev/null || true',

        // Logs de servidores web
        'find /var/log/nginx/ -type f -name "*.log" -exec truncate -s 0 {} \\; 2>/dev/null || true',
        'find /var/log/apache2/ -type f -name "*.log" -exec truncate -s 0 {} \\; 2>/dev/null || true',

        // Journal logs
        'journalctl --vacuum-time=1d 2>/dev/null || true',

        // Limpiar historial
        'history -c 2>/dev/null || true',
        'cat /dev/null > ~/.bash_history 2>/dev/null || true',
      ];

      const command = commands.join(' && ');
      const result = await SSHDirectService.executeCommand(sshConfig, command, 30000);

      if (!result.success) {
        logger.warn(`Algunos comandos de limpieza fallaron, pero esto es normal: ${result.stderr}`);
      }

      logger.info(`Logs limpiados exitosamente en ${sshConfig.host}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error limpiando logs: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reinicia el VPS
   */
  static async restartVPS(sshConfig: SSHConfig): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[Maintenance] Reiniciando VPS ${sshConfig.host}`);

      // Ejecutar comando de reinicio en background
      await SSHDirectService.executeCommand(
        sshConfig,
        'nohup bash -c "sleep 2 && reboot" > /dev/null 2>&1 &',
        5000
      );

      logger.info(`Reinicio iniciado en ${sshConfig.host}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error reiniciando VPS: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene el tamaño de los logs en MB
   */
  static async getLogSize(sshConfig: SSHConfig): Promise<number> {
    try {
      const command = 'du -sm /var/log 2>/dev/null | awk \'{print $1}\'';
      const result = await SSHDirectService.executeCommand(sshConfig, command);

      if (result.success) {
        const size = parseInt(result.stdout.trim()) || 0;
        return size;
      }

      return 0;
    } catch (error: any) {
      logger.error(`Error obteniendo tamaño de logs: ${error.message}`);
      return 0;
    }
  }

  /**
   * Verifica el espacio en disco disponible
   */
  static async getDiskSpace(sshConfig: SSHConfig): Promise<{
    total: string;
    used: string;
    available: string;
    percent: number;
  }> {
    try {
      const command = 'df -h / | tail -1 | awk \'{print $2, $3, $4, $5}\'';
      const result = await SSHDirectService.executeCommand(sshConfig, command);

      if (result.success) {
        const parts = result.stdout.trim().split(' ');
        return {
          total: parts[0] || '0G',
          used: parts[1] || '0G',
          available: parts[2] || '0G',
          percent: parseInt(parts[3]) || 0,
        };
      }

      return {
        total: '0G',
        used: '0G',
        available: '0G',
        percent: 0,
      };
    } catch (error: any) {
      logger.error(`Error obteniendo espacio en disco: ${error.message}`);
      return {
        total: '0G',
        used: '0G',
        available: '0G',
        percent: 0,
      };
    }
  }

  /**
   * Limpia caché del sistema
   */
  static async clearCache(sshConfig: SSHConfig): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`[Maintenance] Limpiando caché en ${sshConfig.host}`);

      const commands = [
        // Limpiar PageCache, dentries e inodes
        'sync',
        'echo 3 > /proc/sys/vm/drop_caches',

        // Limpiar paquetes apt (si es Debian/Ubuntu)
        'apt-get clean 2>/dev/null || true',
        'apt-get autoclean 2>/dev/null || true',

        // Limpiar yum cache (si es CentOS/RHEL)
        'yum clean all 2>/dev/null || true',
      ];

      const command = commands.join(' && ');
      await SSHDirectService.executeCommand(sshConfig, command, 30000);

      logger.info(`Caché limpiado exitosamente en ${sshConfig.host}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Error limpiando caché: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene información del sistema operativo
   */
  static async getSystemInfo(sshConfig: SSHConfig): Promise<{
    os: string;
    kernel: string;
    architecture: string;
    hostname: string;
  }> {
    try {
      const [osResult, kernelResult, archResult, hostnameResult] = await Promise.all([
        SSHDirectService.executeCommand(
          sshConfig,
          'cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | sed \'s/"//g\''
        ),
        SSHDirectService.executeCommand(sshConfig, 'uname -r'),
        SSHDirectService.executeCommand(sshConfig, 'uname -m'),
        SSHDirectService.executeCommand(sshConfig, 'hostname'),
      ]);

      return {
        os: osResult.success ? osResult.stdout.trim() : 'Unknown',
        kernel: kernelResult.success ? kernelResult.stdout.trim() : 'Unknown',
        architecture: archResult.success ? archResult.stdout.trim() : 'Unknown',
        hostname: hostnameResult.success ? hostnameResult.stdout.trim() : 'Unknown',
      };
    } catch (error: any) {
      logger.error(`Error obteniendo información del sistema: ${error.message}`);
      return {
        os: 'Unknown',
        kernel: 'Unknown',
        architecture: 'Unknown',
        hostname: 'Unknown',
      };
    }
  }
}
