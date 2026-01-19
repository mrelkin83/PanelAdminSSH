import { SSHInteractiveService, ShellSession } from './ssh-interactive.service';
import { SSHConfig, ADMRufuUserData, ADMRufuConnectionData } from '../types';
import { logger } from '../utils/logger';

/**
 * Parser de estados para el menú de ADMRufu
 * DEBE ADAPTARSE según el menú real de tu instalación
 */
class ADMRufuMenuParser {
  /**
   * Detecta si el menú principal está visible
   */
  static isMainMenuVisible(output: string): boolean {
    return (
      output.includes('MENU PRINCIPAL') ||
      output.includes('ADMRufu') ||
      output.includes('Seleccione una opción') ||
      /\[.*\]\s*MENU/i.test(output)
    );
  }

  /**
   * Detecta si está esperando input del usuario
   */
  static isWaitingForInput(output: string): boolean {
    const lastLines = output.split('\n').slice(-3).join('\n');

    return (
      lastLines.includes('Ingrese') ||
      lastLines.includes('Digite') ||
      lastLines.includes('Escriba') ||
      lastLines.includes('nombre de usuario:') ||
      lastLines.includes('contraseña:') ||
      lastLines.includes('días:') ||
      /:\s*_?\s*$/.test(lastLines) ||
      /\>\s*$/.test(lastLines)
    );
  }

  /**
   * Detecta mensajes de éxito
   */
  static detectSuccess(output: string): boolean {
    const lastLines = output.split('\n').slice(-10).join('\n').toLowerCase();

    return (
      lastLines.includes('exitosamente') ||
      lastLines.includes('creado correctamente') ||
      lastLines.includes('renovado') ||
      lastLines.includes('eliminado') ||
      lastLines.includes('bloqueado') ||
      lastLines.includes('desbloqueado') ||
      lastLines.includes('success') ||
      lastLines.includes('ok')
    );
  }

  /**
   * Detecta mensajes de error
   */
  static detectError(output: string): boolean {
    const lastLines = output.split('\n').slice(-10).join('\n').toLowerCase();

    return (
      lastLines.includes('error') ||
      lastLines.includes('fallo') ||
      lastLines.includes('no existe') ||
      lastLines.includes('ya existe') ||
      lastLines.includes('inválido') ||
      lastLines.includes('incorrecto') ||
      lastLines.includes('falló')
    );
  }
}

/**
 * Servicio para interactuar EXCLUSIVAMENTE con el menú de ADMRufu
 * SIN comandos directos del sistema
 */
export class ADMRufuMenuService {
  /**
   * Inicia el menú de ADMRufu
   */
  private static async startMenu(session: ShellSession): Promise<void> {
    logger.info('Iniciando menú ADMRufu...');

    // Limpiar output anterior
    const startLength = session.output.length;

    // Intentar ejecutar el comando del menú
    await SSHInteractiveService.sendCommand(session, 'menu', undefined, 2000);

    // Si no funcionó, intentar con 'adm'
    if (!ADMRufuMenuParser.isMainMenuVisible(session.output.substring(startLength))) {
      logger.debug('Comando "menu" no funcionó, intentando "adm"...');
      await SSHInteractiveService.sendCommand(session, 'adm', undefined, 2000);
    }

    // Verificar que el menú se abrió
    if (!ADMRufuMenuParser.isMainMenuVisible(session.output.substring(startLength))) {
      throw new Error('No se pudo abrir el menú de ADMRufu. Verifica que esté instalado.');
    }

    logger.info('✅ Menú ADMRufu iniciado');
  }

  /**
   * Navega a una opción del menú
   */
  private static async selectMenuOption(
    session: ShellSession,
    option: string,
    waitMs: number = 2000
  ): Promise<string> {
    logger.debug(`Seleccionando opción: ${option}`);

    const beforeLength = session.output.length;
    await SSHInteractiveService.sendCommand(session, option, undefined, waitMs);
    const newOutput = session.output.substring(beforeLength);

    return newOutput;
  }

  /**
   * Sale del menú actual (presiona 0 o Ctrl+C)
   */
  private static async exitMenu(session: ShellSession): Promise<void> {
    logger.debug('Saliendo del menú...');

    // Intentar salir con '0'
    await SSHInteractiveService.sendCommand(session, '0', undefined, 1000);

    // Ctrl+C por si acaso
    await SSHInteractiveService.sendCommand(session, '\x03', undefined, 500);
  }

  /**
   * CREA USUARIO SSH USANDO EL MENÚ INTERACTIVO DE ADMRUFU
   *
   * IMPORTANTE: Este es un TEMPLATE que DEBE adaptarse según la estructura
   * real del menú de ADMRufu instalado en tu VPS.
   *
   * Para adaptar:
   * 1. Conecta al VPS: ssh root@IP
   * 2. Ejecuta: menu (o adm)
   * 3. Documenta la estructura del menú
   * 4. Ajusta los números de opciones abajo
   * 5. Ajusta los patrones del parser
   */
  static async createSSHUser(
    sshConfig: SSHConfig,
    username: string,
    password: string,
    days: number
  ): Promise<{ success: boolean; output: string; error?: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`=== CREAR USUARIO SSH: ${username} (${days} días) ===`);

      // 1. Abrir sesión shell
      logger.debug('1. Abriendo sesión SSH...');
      session = await SSHInteractiveService.openShellSession(sshConfig);
      logger.info('✅ Sesión SSH abierta');

      // 2. Iniciar menú ADMRufu
      logger.debug('2. Iniciando menú ADMRufu...');
      await this.startMenu(session);

      // 3. NAVEGAR POR EL MENÚ
      // NOTA: ADAPTAR ESTOS NÚMEROS SEGÚN TU MENÚ REAL

      logger.debug('3. Navegando al menú de gestión de usuarios...');
      // Ejemplo: [1] Gestión de Usuarios SSH
      await this.selectMenuOption(session, '1', 2000);

      logger.debug('4. Seleccionando crear usuario...');
      // Ejemplo: [1] Crear Usuario SSH
      await this.selectMenuOption(session, '1', 2000);

      // 4. ENVIAR DATOS DEL USUARIO

      // Esperar prompt de username
      logger.debug('5. Esperando prompt de username...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (ADMRufuMenuParser.isWaitingForInput(session.output)) {
        logger.debug(`6. Enviando username: ${username}`);
        await SSHInteractiveService.sendCommand(session, username, undefined, 1500);
      } else {
        logger.warn('⚠️  No se detectó prompt de username');
      }

      // Esperar prompt de password
      logger.debug('7. Esperando prompt de password...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (ADMRufuMenuParser.isWaitingForInput(session.output)) {
        logger.debug('8. Enviando password...');
        await SSHInteractiveService.sendCommand(session, password, undefined, 1500);
      } else {
        logger.warn('⚠️  No se detectó prompt de password');
      }

      // Esperar prompt de días
      logger.debug('9. Esperando prompt de días...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (ADMRufuMenuParser.isWaitingForInput(session.output)) {
        logger.debug(`10. Enviando días: ${days}`);
        await SSHInteractiveService.sendCommand(session, days.toString(), undefined, 2000);
      } else {
        logger.warn('⚠️  No se detectó prompt de días');
      }

      // 5. ESPERAR RESULTADO
      logger.debug('11. Esperando resultado...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Presionar ENTER si pide confirmación
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      // 6. VERIFICAR ÉXITO O ERROR
      const success = ADMRufuMenuParser.detectSuccess(session.output);
      const hasError = ADMRufuMenuParser.detectError(session.output);

      logger.debug('12. Analizando resultado...');

      if (hasError) {
        const lines = session.output.split('\n');
        const errorLine = lines.reverse().find(line =>
          line.toLowerCase().includes('error') ||
          line.toLowerCase().includes('fallo')
        );

        logger.error(`❌ Error detectado: ${errorLine}`);

        return {
          success: false,
          output: session.output,
          error: errorLine || 'Error desconocido al crear usuario',
        };
      }

      // 7. SALIR DEL MENÚ
      logger.debug('13. Saliendo del menú...');
      await this.exitMenu(session);

      logger.info(`✅ Usuario ${username} ${success ? 'CREADO' : 'procesado (verificar manualmente)'}`);

      return {
        success,
        output: session.output,
      };

    } catch (error: any) {
      logger.error(`❌ Error en createSSHUser: ${error.message}`);
      logger.error(error.stack);

      return {
        success: false,
        output: session?.output || '',
        error: error.message,
      };
    } finally {
      if (session) {
        logger.debug('14. Cerrando sesión SSH...');
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * LISTAR USUARIOS SSH
   * TODO: Implementar navegación por el menú para listar usuarios
   */
  static async listSSHUsers(
    sshConfig: SSHConfig
  ): Promise<ADMRufuUserData[]> {
    let session: ShellSession | null = null;

    try {
      logger.info('=== LISTAR USUARIOS SSH ===');

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);

      // TODO: Navegar al menú de listar usuarios
      // Ejemplo:
      // await this.selectMenuOption(session, '1');  // Gestión usuarios
      // await this.selectMenuOption(session, '6');  // Listar usuarios

      // Parsear la lista de usuarios del output
      // const users = parseUserList(session.output);

      await this.exitMenu(session);

      return [];  // TODO: Retornar usuarios parseados
    } catch (error: any) {
      logger.error(`Error listando usuarios: ${error.message}`);
      return [];
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * OBTENER CONEXIONES ACTIVAS
   * TODO: Implementar navegación por el menú para ver conexiones
   */
  static async getConnectedUsers(
    sshConfig: SSHConfig
  ): Promise<ADMRufuConnectionData[]> {
    let session: ShellSession | null = null;

    try {
      logger.info('=== MONITOR DE CONEXIONES ===');

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);

      // TODO: Navegar al menú de monitor
      // Ejemplo:
      // await this.selectMenuOption(session, '4');  // Monitor

      // Parsear las conexiones del output
      // const connections = parseConnections(session.output);

      await this.exitMenu(session);

      return [];  // TODO: Retornar conexiones parseadas
    } catch (error: any) {
      logger.error(`Error obteniendo conexiones: ${error.message}`);
      return [];
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }
}
