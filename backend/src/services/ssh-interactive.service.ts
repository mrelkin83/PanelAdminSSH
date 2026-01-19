import { Client, ClientChannel } from 'ssh2';
import { SSHConfig } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { EventEmitter } from 'events';

export interface ShellSession {
  stream: ClientChannel;
  output: string;
  isReady: boolean;
  emitter: EventEmitter;
}

export class SSHInteractiveService {
  /**
   * Abre una sesión shell interactiva
   */
  static async openShellSession(sshConfig: SSHConfig): Promise<ShellSession> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const emitter = new EventEmitter();
      let output = '';

      conn.on('ready', () => {
        logger.debug(`SSH shell session opened to ${sshConfig.host}`);

        conn.shell({ term: 'xterm' }, (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          // Capturar todo el output
          stream.on('data', (data: Buffer) => {
            const text = data.toString('utf8');
            output += text;
            emitter.emit('data', text);
            logger.debug(`Shell output: ${text.substring(0, 100)}`);
          });

          stream.stderr.on('data', (data: Buffer) => {
            const text = data.toString('utf8');
            logger.debug(`Shell stderr: ${text}`);
            emitter.emit('error', text);
          });

          stream.on('close', () => {
            conn.end();
            emitter.emit('close');
            logger.debug('Shell stream closed');
          });

          // Esperar a que el shell esté listo (prompt aparezca)
          setTimeout(() => {
            resolve({
              stream,
              output,
              isReady: true,
              emitter,
            });
          }, 1000);
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

      const connectConfig: any = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        timeout: sshConfig.timeout || config.SSH_TIMEOUT,
        keepaliveInterval: sshConfig.keepaliveInterval || config.SSH_KEEPALIVE_INTERVAL,
        readyTimeout: 30000,
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
   * Envía un comando a la sesión shell y espera respuesta
   */
  static async sendCommand(
    session: ShellSession,
    command: string,
    waitForPattern?: string | RegExp,
    timeoutMs: number = 5000
  ): Promise<string> {
    return new Promise((resolve, _reject) => {
      const startOutput = session.output.length;
      let timeoutHandle: NodeJS.Timeout;

      const onData = (_data: string) => {
        // Si hay patrón de espera, verificar
        if (waitForPattern) {
          const pattern = typeof waitForPattern === 'string'
            ? new RegExp(waitForPattern, 'i')
            : waitForPattern;

          if (pattern.test(session.output)) {
            clearTimeout(timeoutHandle);
            session.emitter.off('data', onData);
            const newOutput = session.output.substring(startOutput);
            resolve(newOutput);
          }
        }
      };

      // Escuchar nuevo output
      session.emitter.on('data', onData);

      // Timeout
      timeoutHandle = setTimeout(() => {
        session.emitter.off('data', onData);
        const newOutput = session.output.substring(startOutput);

        if (!waitForPattern) {
          resolve(newOutput);
        } else {
          logger.warn(`Command timeout waiting for pattern: ${waitForPattern}`);
          resolve(newOutput);
        }
      }, timeoutMs);

      // Enviar comando
      logger.debug(`Sending command: ${command}`);
      session.stream.write(command + '\n');

      // Si no hay patrón de espera, simplemente esperar el timeout
      if (!waitForPattern) {
        // No hacer nada, el timeout resolverá
      }
    });
  }

  /**
   * Cierra la sesión shell
   */
  static closeSession(session: ShellSession): void {
    try {
      session.stream.end();
      logger.debug('Shell session closed');
    } catch (error) {
      logger.error(`Error closing shell session: ${error}`);
    }
  }

  /**
   * Ejecuta un comando simple y retorna output
   */
  static async executeCommand(
    sshConfig: SSHConfig,
    command: string
  ): Promise<{ success: boolean; stdout: string; stderr: string; code: number }> {
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

      const connectConfig: any = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        timeout: sshConfig.timeout || config.SSH_TIMEOUT,
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
   * Verifica conexión SSH básica
   * Retorna objeto con detalles del resultado para mejor debugging
   */
  static async testConnection(sshConfig: SSHConfig): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const result = await this.executeCommand(sshConfig, 'echo "test"');
      const success = result.success && result.stdout === 'test';

      if (!success) {
        return {
          success: false,
          error: 'Command execution failed or unexpected output',
          details: {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
          },
        };
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      logger.error(`SSH test connection failed: ${errorMessage}`);

      // Determinar tipo de error para mejor debugging
      let userFriendlyError = 'Unknown connection error';

      if (errorMessage.includes('ECONNREFUSED')) {
        userFriendlyError = 'Connection refused. Verify SSH port and firewall settings.';
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        userFriendlyError = 'Connection timeout. Verify VPS is online and accessible.';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('EHOSTUNREACH')) {
        userFriendlyError = 'Host not found. Verify IP address or domain.';
      } else if (errorMessage.includes('authentication')) {
        userFriendlyError = 'Authentication failed. Verify username, password, or SSH key.';
      } else if (errorMessage.includes('key')) {
        userFriendlyError = 'SSH key error. Verify key format and permissions.';
      } else {
        userFriendlyError = errorMessage;
      }

      return {
        success: false,
        error: userFriendlyError,
        details: {
          originalError: errorMessage,
          host: sshConfig.host,
          port: sshConfig.port,
          username: sshConfig.username,
        },
      };
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
   * Obtiene versión de ADMRufu
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
}
