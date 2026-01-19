/**
 * VPS Monitoring Service
 * Obtiene métricas del sistema de los VPS remotos
 * Soporta:
 * - Node Exporter (preferido - si está instalado en el VPS)
 * - Comandos directos (fallback)
 */

import { SSHDirectService } from './ssh-direct.service';
import { logger } from '../utils/logger';
import type { SSHConfig } from '../types';

export interface VPSMetrics {
  cpu: number; // Porcentaje de uso
  ram: number; // Porcentaje de uso
  disk: number; // Porcentaje de uso
  uptime: string; // Tiempo activo
  ports: PortStatus[];
  timestamp: Date;
}

export interface PortStatus {
  port: number;
  protocol: string; // tcp/udp
  status: 'listening' | 'closed';
  service?: string;
}

export class VPSMonitoringService {
  /**
   * Obtiene todas las métricas del VPS
   * Intenta usar Node Exporter primero, luego comandos directos
   */
  static async getMetrics(sshConfig: SSHConfig): Promise<VPSMetrics> {
    try {
      // Intentar obtener métricas de node_exporter primero
      const hasNodeExporter = await this.checkNodeExporter(sshConfig);

      if (hasNodeExporter) {
        logger.info('Using node_exporter for metrics');
        return await this.getMetricsFromNodeExporter(sshConfig);
      }

      // Fallback: usar comandos directos
      logger.info('Using direct commands for metrics (node_exporter not available)');
      return await this.getMetricsFromCommands(sshConfig);
    } catch (error) {
      logger.error('Error getting VPS metrics:', error);
      throw error;
    }
  }

  /**
   * Verifica si node_exporter está instalado y corriendo
   */
  private static async checkNodeExporter(sshConfig: SSHConfig): Promise<boolean> {
    try {
      const command = 'curl -s http://127.0.0.1:9100/metrics | head -1';
      const result = await SSHDirectService.executeCommand(sshConfig, command, 3000);
      return result.success && result.stdout.includes('node_');
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene métricas desde node_exporter
   */
  private static async getMetricsFromNodeExporter(sshConfig: SSHConfig): Promise<VPSMetrics> {
    const metricsCommand = 'curl -s http://127.0.0.1:9100/metrics';
    const result = await SSHDirectService.executeCommand(sshConfig, metricsCommand);

    if (!result.success) {
      throw new Error('Failed to fetch metrics from node_exporter');
    }

    const metrics = result.stdout;

    // Parsear métricas
    const cpu = this.parseNodeExporterCPU(metrics);
    const ram = this.parseNodeExporterRAM(metrics);
    const disk = this.parseNodeExporterDisk(metrics);
    const uptime = this.parseNodeExporterUptime(metrics);
    const ports = await this.getPortStatus(sshConfig); // Los puertos se siguen obteniendo igual

    return {
      cpu,
      ram,
      disk,
      uptime,
      ports,
      timestamp: new Date(),
    };
  }

  /**
   * Obtiene métricas usando comandos directos (fallback)
   */
  private static async getMetricsFromCommands(sshConfig: SSHConfig): Promise<VPSMetrics> {
    const [cpu, ram, disk, uptime, ports] = await Promise.all([
      this.getCPUUsage(sshConfig),
      this.getRAMUsage(sshConfig),
      this.getDiskUsage(sshConfig),
      this.getUptime(sshConfig),
      this.getPortStatus(sshConfig),
    ]);

    return {
      cpu,
      ram,
      disk,
      uptime,
      ports,
      timestamp: new Date(),
    };
  }

  /**
   * Parsea CPU desde métricas de node_exporter
   */
  private static parseNodeExporterCPU(metrics: string): number {
    try {
      // Buscar node_cpu_seconds_total en modo idle
      const idleMatch = metrics.match(/node_cpu_seconds_total{.*mode="idle".*} ([\d.]+)/);
      const totalMatch = metrics.match(/node_cpu_seconds_total{.*} ([\d.]+)/g);

      if (!idleMatch || !totalMatch) return 0;

      const idle = parseFloat(idleMatch[1]);
      const total = totalMatch.reduce((sum, line) => {
        const value = parseFloat(line.split(' ')[1]);
        return sum + value;
      }, 0);

      const usage = ((total - idle) / total) * 100;
      return Math.round(usage * 10) / 10;
    } catch (error) {
      logger.error('Error parsing CPU from node_exporter:', error);
      return 0;
    }
  }

  /**
   * Parsea RAM desde métricas de node_exporter
   */
  private static parseNodeExporterRAM(metrics: string): number {
    try {
      const totalMatch = metrics.match(/node_memory_MemTotal_bytes ([\d.]+)/);
      const availableMatch = metrics.match(/node_memory_MemAvailable_bytes ([\d.]+)/);

      if (!totalMatch || !availableMatch) return 0;

      const total = parseFloat(totalMatch[1]);
      const available = parseFloat(availableMatch[1]);
      const used = total - available;

      return Math.round((used / total) * 100 * 10) / 10;
    } catch (error) {
      logger.error('Error parsing RAM from node_exporter:', error);
      return 0;
    }
  }

  /**
   * Parsea Disk desde métricas de node_exporter
   */
  private static parseNodeExporterDisk(metrics: string): number {
    try {
      const match = metrics.match(/node_filesystem_avail_bytes{.*mountpoint="\/".*} ([\d.]+)/);
      const sizeMatch = metrics.match(/node_filesystem_size_bytes{.*mountpoint="\/".*} ([\d.]+)/);

      if (!match || !sizeMatch) return 0;

      const available = parseFloat(match[1]);
      const total = parseFloat(sizeMatch[1]);
      const used = total - available;

      return Math.round((used / total) * 100);
    } catch (error) {
      logger.error('Error parsing Disk from node_exporter:', error);
      return 0;
    }
  }

  /**
   * Parsea Uptime desde métricas de node_exporter
   */
  private static parseNodeExporterUptime(metrics: string): string {
    try {
      const match = metrics.match(/node_boot_time_seconds ([\d.]+)/);
      if (!match) return 'unknown';

      const bootTime = parseFloat(match[1]);
      const now = Date.now() / 1000;
      const uptimeSeconds = Math.floor(now - bootTime);

      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);

      return `${days} days, ${hours} hours, ${minutes} minutes`;
    } catch (error) {
      logger.error('Error parsing Uptime from node_exporter:', error);
      return 'unknown';
    }
  }

  /**
   * Obtiene el uso de CPU
   */
  static async getCPUUsage(sshConfig: SSHConfig): Promise<number> {
    try {
      const command = `top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}'`;
      const result = await SSHDirectService.executeCommand(sshConfig, command, 10000);

      if (result.success && result.stdout) {
        logger.debug(`CPU command output: ${result.stdout}`);
        const cpu = parseFloat(result.stdout.trim());
        return isNaN(cpu) ? 0 : Math.round(cpu * 10) / 10;
      }

      logger.warn(`CPU command failed: ${result.stderr}`);
      return 0;
    } catch (error) {
      logger.error('Error getting CPU usage:', error);
      return 0;
    }
  }

  /**
   * Obtiene el uso de RAM
   */
  static async getRAMUsage(sshConfig: SSHConfig): Promise<number> {
    try {
      const command = `free | grep Mem | awk '{print ($3/$2) * 100.0}'`;
      const result = await SSHDirectService.executeCommand(sshConfig, command, 10000);

      if (result.success && result.stdout) {
        logger.debug(`RAM command output: ${result.stdout}`);
        const ram = parseFloat(result.stdout.trim());
        return isNaN(ram) ? 0 : Math.round(ram * 10) / 10;
      }

      logger.warn(`RAM command failed: ${result.stderr}`);
      return 0;
    } catch (error) {
      logger.error('Error getting RAM usage:', error);
      return 0;
    }
  }

  /**
   * Obtiene el uso de Disco
   */
  static async getDiskUsage(sshConfig: SSHConfig): Promise<number> {
    try {
      const command = `df -h / | tail -1 | awk '{print $5}' | sed 's/%//'`;
      const result = await SSHDirectService.executeCommand(sshConfig, command, 10000);

      if (result.success && result.stdout) {
        logger.debug(`Disk command output: ${result.stdout}`);
        const disk = parseFloat(result.stdout.trim());
        return isNaN(disk) ? 0 : disk;
      }

      logger.warn(`Disk command failed: ${result.stderr}`);
      return 0;
    } catch (error) {
      logger.error('Error getting disk usage:', error);
      return 0;
    }
  }

  /**
   * Obtiene el uptime del sistema
   */
  static async getUptime(sshConfig: SSHConfig): Promise<string> {
    try {
      const command = `uptime -p`;
      const result = await SSHDirectService.executeCommand(sshConfig, command, 10000);

      if (result.success && result.stdout) {
        logger.debug(`Uptime command output: ${result.stdout}`);
        return result.stdout.trim().replace('up ', '');
      }

      logger.warn(`Uptime command failed: ${result.stderr}`);
      return 'unknown';
    } catch (error) {
      logger.error('Error getting uptime:', error);
      return 'unknown';
    }
  }

  /**
   * Obtiene el estado de puertos comunes
   */
  static async getPortStatus(sshConfig: SSHConfig): Promise<PortStatus[]> {
    try {
      // Puertos comunes para VPS SSH/VPN
      const commonPorts = [22, 80, 443, 8080, 3128, 1194, 7300, 8888, 9000];
      const ports: PortStatus[] = [];

      // Comando para verificar puertos en escucha
      const command = `ss -tuln | grep LISTEN || netstat -tuln | grep LISTEN`;
      const result = await SSHDirectService.executeCommand(sshConfig, command, 10000);

      if (result.success && result.stdout) {
        logger.debug(`Port status command output: ${result.stdout.substring(0, 200)}...`);
        const lines = result.stdout.split('\n');

        for (const port of commonPorts) {
          // Buscar el puerto en la salida
          const isListening = lines.some((line) =>
            line.includes(`:${port} `) || line.includes(`:${port}\t`)
          );

          ports.push({
            port,
            protocol: 'tcp',
            status: isListening ? 'listening' : 'closed',
            service: this.getServiceName(port),
          });
        }
      }

      return ports;
    } catch (error) {
      logger.error('Error getting port status:', error);
      return [];
    }
  }

  /**
   * Obtiene el nombre del servicio por puerto
   */
  private static getServiceName(port: number): string {
    const services: Record<number, string> = {
      22: 'SSH',
      80: 'HTTP',
      443: 'HTTPS',
      8080: 'HTTP-Alt',
      3128: 'Squid Proxy',
      1194: 'OpenVPN',
      7300: 'V2Ray',
      8888: 'WebSocket',
      9000: 'SocksPy',
    };

    return services[port] || 'Unknown';
  }

  /**
   * Verifica la conectividad del VPS
   */
  static async checkConnectivity(sshConfig: SSHConfig): Promise<boolean> {
    try {
      const command = 'echo "OK"';
      const result = await SSHDirectService.executeCommand(sshConfig, command, 5000);
      return result.success && result.stdout.includes('OK');
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene información del sistema
   */
  static async getSystemInfo(sshConfig: SSHConfig): Promise<{
    os: string;
    kernel: string;
    hostname: string;
  }> {
    try {
      const [os, kernel, hostname] = await Promise.all([
        SSHDirectService.executeCommand(sshConfig, 'cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | sed \'s/"//g\''),
        SSHDirectService.executeCommand(sshConfig, 'uname -r'),
        SSHDirectService.executeCommand(sshConfig, 'hostname'),
      ]);

      return {
        os: os.success ? os.stdout.trim() : 'Unknown',
        kernel: kernel.success ? kernel.stdout.trim() : 'Unknown',
        hostname: hostname.success ? hostname.stdout.trim() : 'Unknown',
      };
    } catch (error) {
      logger.error('Error getting system info:', error);
      return {
        os: 'Unknown',
        kernel: 'Unknown',
        hostname: 'Unknown',
      };
    }
  }
}
