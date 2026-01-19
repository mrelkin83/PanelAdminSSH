import { SSHInteractiveService, ShellSession } from './ssh-interactive.service';
import { SSHConfig, ADMRufuUserData, ADMRufuConnectionData, ADMRufuCreatedUserData } from '../types';
import { logger } from '../utils/logger';

/**
 * Servicio ADMRufu - Menú REAL confirmado (estructura jerárquica):
 *
 * MENÚ PRINCIPAL:
 * [1] ADMINISTRAR CUENTAS (SSH/DROPBEAR) → Lleva al submenú de usuarios
 * [2] CONFIGURACION DE PROTOCOLOS
 * [3] HERRAMIENTAS EXTRAS
 * [4] CONFIGURACION DEL SCRIPT
 * [5] IDIOMA / LANGUAGE
 * [6] DESINSTALAR PANEL
 * [0] SALIR DEL VPS
 * [7] SALIR DEL SCRIPT
 * [8] REINICIAR VPS
 *
 * SUBMENÚ (opción 1) - ADMINISTRAR CUENTAS:
 * 1 = Crear usuario
 * 2 = Remover usuario
 * 3 = Renovar usuario
 * 4 = Bloquear / Desbloquear
 * 6 = Listar usuarios
 * 7 = Monitor conexiones
 * 9 = Eliminar vencidos
 */
export class ADMRufuService {
  private static async startMenu(session: ShellSession): Promise<void> {
    await SSHInteractiveService.sendCommand(session, 'clear', undefined, 1000);
    await SSHInteractiveService.sendCommand(session, 'menu', undefined, 3000);

    // Esperar a que el menú se cargue
    await new Promise(r => setTimeout(r, 2000));

    // El menú ADMRufu muestra "ADMINISTRAR CUENTAS" y "Ingresa una Opcion"
    const output = session.output;
    const menuLoaded = output.includes('ADMINISTRAR CUENTAS') || output.includes('Ingresa una Opcion');

    if (!menuLoaded) {
      // Intentar con comando 'adm'
      await SSHInteractiveService.sendCommand(session, 'adm', undefined, 3000);
      await new Promise(r => setTimeout(r, 2000));
    }

    logger.info('✅ Menú ADMRufu iniciado');
  }

  private static async openAccountsMenu(session: ShellSession): Promise<void> {
    // Navegar al submenú de administración de cuentas (opción 1 del menú principal)
    logger.debug('Abriendo submenú de Administrar Cuentas (opción 1)');
    await this.selectOption(session, '1', 2000);
  }

  private static async selectOption(session: ShellSession, option: string, waitMs: number = 2000): Promise<void> {
    await SSHInteractiveService.sendCommand(session, option, undefined, waitMs);
  }

  private static async exitMenu(session: ShellSession): Promise<void> {
    await SSHInteractiveService.sendCommand(session, '0', undefined, 1000);
    await SSHInteractiveService.sendCommand(session, '\x03', undefined, 500);
  }

  private static detectSuccess(output: string): boolean {
    const lower = output.toLowerCase();
    return (
      lower.includes('exitosamente') ||
      lower.includes('creado correctamente') ||
      lower.includes('success') ||
      lower.includes('completado') ||
      lower.includes('criado') ||
      lower.includes('renovado') ||
      lower.includes('removido') ||
      lower.includes('bloqueado') ||
      lower.includes('desbloqueado')
    );
  }

  private static detectError(output: string): boolean {
    const lower = output.toLowerCase();
    return (
      lower.includes('error') ||
      lower.includes('fallo') ||
      lower.includes('fail') ||
      lower.includes('no existe') ||
      lower.includes('nao existe') ||
      lower.includes('ya existe') ||
      lower.includes('ja existe') ||
      lower.includes('inválido') ||
      lower.includes('invalido')
    );
  }

  /**
   * Parsear respuesta de creación de usuario
   * Busca: IP DEL SERVIDOR, NOMBRE ID, TOKEN, EXPIRA EN
   */
  private static parseCreatedUser(output: string): ADMRufuCreatedUserData | null {
    try {
      const lines = output.split('\n');

      let serverIp = '';
      let username = '';
      let token = '';
      let expiresIn = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Buscar IP DEL SERVIDOR
        if (line.includes('IP DEL SERVIDOR') || line.includes('IP') && line.includes('SERVIDOR')) {
          // Puede estar en la misma línea o en la siguiente
          const match = line.match(/IP\s+(?:DEL\s+)?SERVIDOR\s*:?\s*([0-9.]+)/i);
          if (match) {
            serverIp = match[1];
          } else if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const ipMatch = nextLine.match(/([0-9.]+)/);
            if (ipMatch) serverIp = ipMatch[1];
          }
        }

        // Buscar NOMBRE ID (username)
        if (line.includes('NOMBRE') && (line.includes('ID') || line.includes('USUARIO'))) {
          const match = line.match(/NOMBRE\s+(?:ID|USUARIO)\s*:?\s*(\S+)/i);
          if (match) {
            username = match[1];
          } else if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !nextLine.includes(':')) {
              username = nextLine.split(/\s+/)[0];
            }
          }
        }

        // Buscar TOKEN
        if (line.includes('TOKEN')) {
          const match = line.match(/TOKEN\s*:?\s*(\S+)/i);
          if (match) {
            token = match[1];
          } else if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !nextLine.includes(':')) {
              token = nextLine.split(/\s+/)[0];
            }
          }
        }

        // Buscar EXPIRA EN
        if (line.includes('EXPIRA') && line.includes('EN')) {
          const match = line.match(/EXPIRA\s+EN\s*:?\s*(.+)/i);
          if (match) {
            expiresIn = match[1].trim();
          } else if (i + 1 < lines.length) {
            expiresIn = lines[i + 1].trim();
          }
        }
      }

      if (serverIp && username) {
        logger.debug(`Datos parseados: IP=${serverIp}, Usuario=${username}, Token=${token}, Expira=${expiresIn}`);
        return { serverIp, username, token, expiresIn };
      }

      logger.warn('No se pudieron parsear todos los campos del usuario creado');
      return null;

    } catch (error: any) {
      logger.error(`Error parseando usuario creado: ${error.message}`);
      return null;
    }
  }

  /**
   * CREAR USUARIO - DIRECTO (sin menú ADMRufu)
   * Crea el usuario SSH directamente con el TOKEN especificado
   * Usado para apps VPN que generan su propio TOKEN
   */
  static async createSSHUserDirect(
    sshConfig: SSHConfig,
    username: string,
    password: string,
    days: number
  ): Promise<{ success: boolean; output: string; error?: string; userData?: ADMRufuCreatedUserData }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[SSH Direct] Crear usuario: ${username} con TOKEN específico (${days} días)`);
      logger.debug(`SSH Config: ${sshConfig.host}:${sshConfig.port} user=${sshConfig.username} hasPassword=${!!sshConfig.password} hasKey=${!!sshConfig.privateKey}`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      logger.debug('✅ Sesión SSH abierta');

      // Calcular fecha de expiración
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      const expiryDateStr = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      logger.debug(`Fecha expiración: ${expiryDateStr}`);

      // 1. Crear usuario Linux
      const useraddCmd = `useradd -m -s /bin/bash -e ${expiryDateStr} ${username}`;
      logger.debug(`Ejecutando: ${useraddCmd}`);
      await SSHInteractiveService.sendCommand(session, useraddCmd, undefined, 2000);
      logger.debug(`Output useradd: ${session.output.substring(session.output.length - 300)}`);

      await new Promise(r => setTimeout(r, 500));

      // 2. Establecer contraseña (TOKEN de la app VPN)
      const passwdCommand = `echo '${username}:${password}' | chpasswd`;
      logger.debug('Estableciendo contraseña...');
      await SSHInteractiveService.sendCommand(session, passwdCommand, undefined, 2000);
      logger.debug(`Output chpasswd: ${session.output.substring(session.output.length - 300)}`);

      await new Promise(r => setTimeout(r, 500));

      // 3. Verificar que el usuario se creó
      logger.debug(`Verificando usuario: id ${username}`);
      await SSHInteractiveService.sendCommand(session, `id ${username}`, undefined, 1000);

      const output = session.output;
      logger.debug(`Output final (últimos 500 chars): ${output.substring(Math.max(0, output.length - 500))}`);

      // Verificar si hay errores
      if (output.toLowerCase().includes('already exists') || output.toLowerCase().includes('ya existe')) {
        SSHInteractiveService.closeSession(session);
        return {
          success: false,
          output,
          error: 'El usuario ya existe'
        };
      }

      if (output.toLowerCase().includes('no such user') || !output.includes(`uid=`)) {
        SSHInteractiveService.closeSession(session);
        return {
          success: false,
          output,
          error: 'Error al crear el usuario'
        };
      }

      SSHInteractiveService.closeSession(session);

      // Retornar datos del usuario creado
      const userData: ADMRufuCreatedUserData = {
        serverIp: sshConfig.host,
        username: username,
        token: password, // El TOKEN que el usuario especificó
        expiresIn: expiryDateStr
      };

      logger.info(`✅ Usuario ${username} creado con TOKEN específico`);

      return {
        success: true,
        output,
        userData
      };

    } catch (error: any) {
      logger.error(`Error creando usuario directo: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * CREAR USUARIO - Opción 1 del menú (LEGACY - genera TOKEN aleatorio)
   * Retorna datos parseados de la respuesta de ADMRufu
   */
  static async createSSHUser(
    sshConfig: SSHConfig,
    username: string,
    password: string,
    days: number
  ): Promise<{ success: boolean; output: string; error?: string; userData?: ADMRufuCreatedUserData }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[ADMRufu] Crear usuario: ${username} (${days} días)`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 1 = Crear usuario (del submenú)
      logger.debug('Seleccionando opción 1 (Crear usuario)');
      await this.selectOption(session, '1', 2000);

      // Esperar prompt de username
      await new Promise(r => setTimeout(r, 2000));
      logger.debug(`Enviando username: ${username}`);
      await SSHInteractiveService.sendCommand(session, username, undefined, 3000);

      // Esperar prompt de password
      await new Promise(r => setTimeout(r, 1500));
      logger.debug('Enviando password');
      await SSHInteractiveService.sendCommand(session, password, undefined, 3000);

      // Esperar prompt de días
      await new Promise(r => setTimeout(r, 1500));
      logger.debug(`Enviando días: ${days}`);
      await SSHInteractiveService.sendCommand(session, days.toString(), undefined, 4000);

      // Esperar respuesta completa con "USUARIO GENERADO CON EXITO!" - Dar más tiempo
      await new Promise(r => setTimeout(r, 5000));

      const output = session.output;

      // LOG COMPLETO del output para debugging
      logger.debug(`===== OUTPUT COMPLETO DE ADMRUFU (${output.length} chars) =====`);
      logger.debug(output.substring(Math.max(0, output.length - 1000)));
      logger.debug('===== FIN OUTPUT =====');

      const hasError = this.detectError(output);

      // Detectar éxito con múltiples patrones
      const successPatterns = [
        'USUARIO GENERADO CON EXITO',
        'TOKEN',  // Si vemos TOKEN, probablemente se creó
        'IP DEL SERVIDOR',  // Si vemos estos campos, se creó
        'criado com sucesso',
        'created successfully'
      ];

      const success = successPatterns.some(pattern =>
        output.toLowerCase().includes(pattern.toLowerCase())
      );

      logger.debug(`Detección de éxito: ${success} | Error detectado: ${hasError}`);

      if (hasError) {
        const lines = output.split('\n').reverse();
        const errorLine = lines.find(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('existe'));

        await this.exitMenu(session);
        return {
          success: false,
          output,
          error: errorLine || 'Error desconocido'
        };
      }

      if (!success) {
        // Log del output para debugging
        logger.warn(`No se detectó confirmación clara de éxito. Output: ${output.substring(0, 500)}...`);
        await this.exitMenu(session);
        return {
          success: false,
          output,
          error: 'No se recibió confirmación de creación exitosa'
        };
      }

      // Parsear los datos del usuario creado
      const userData = this.parseCreatedUser(output);

      // Enviar ENTER para continuar después del mensaje de éxito
      logger.debug('Enviando ENTER para continuar');
      await SSHInteractiveService.sendCommand(session, '', undefined, 1500);

      await this.exitMenu(session);

      if (userData) {
        logger.info(`✅ Usuario ${username} CREADO - IP: ${userData.serverIp}, Token: ${userData.token}`);
      } else {
        logger.warn(`✅ Usuario ${username} creado pero no se pudieron parsear todos los datos`);
      }

      return {
        success: true,
        output,
        userData: userData || undefined
      };

    } catch (error: any) {
      logger.error(`Error creando usuario: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * REMOVER USUARIO - Opción 2 del menú
   */
  static async deleteSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[ADMRufu] Remover usuario: ${username}`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 2 = Remover usuario (del submenú)
      logger.debug('Seleccionando opción 2 (Remover usuario)');
      await this.selectOption(session, '2', 2000);

      await new Promise(r => setTimeout(r, 1500));
      logger.debug(`Enviando username: ${username}`);
      await SSHInteractiveService.sendCommand(session, username, undefined, 2500);

      await new Promise(r => setTimeout(r, 2000));
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      const success = this.detectSuccess(session.output);
      await this.exitMenu(session);

      logger.info(`✅ Usuario ${username} ${success ? 'REMOVIDO' : 'procesado'}`);
      return { success, output: session.output };

    } catch (error: any) {
      logger.error(`Error removiendo usuario: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * RENOVAR USUARIO - Opción 3 del menú
   */
  static async renewSSHUser(
    sshConfig: SSHConfig,
    username: string,
    days: number
  ): Promise<{ success: boolean; output: string; error?: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[ADMRufu] Renovar usuario: ${username} (${days} días)`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 3 = Renovar usuario (del submenú)
      logger.debug('Seleccionando opción 3 (Renovar usuario)');
      await this.selectOption(session, '3', 2000);

      await new Promise(r => setTimeout(r, 1500));
      logger.debug(`Enviando username: ${username}`);
      await SSHInteractiveService.sendCommand(session, username, undefined, 2000);

      await new Promise(r => setTimeout(r, 1000));
      logger.debug(`Enviando días: ${days}`);
      await SSHInteractiveService.sendCommand(session, days.toString(), undefined, 2500);

      await new Promise(r => setTimeout(r, 2000));
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      const success = this.detectSuccess(session.output);
      await this.exitMenu(session);

      logger.info(`✅ Usuario ${username} ${success ? 'RENOVADO' : 'procesado'}`);
      return { success, output: session.output };

    } catch (error: any) {
      logger.error(`Error renovando usuario: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * BLOQUEAR/DESBLOQUEAR - Opción 4 del menú
   */
  static async blockSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[ADMRufu] Bloquear usuario: ${username}`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 4 = Bloquear / Desbloquear (del submenú)
      logger.debug('Seleccionando opción 4 (Bloquear/Desbloquear)');
      await this.selectOption(session, '4', 2000);

      await new Promise(r => setTimeout(r, 1500));
      logger.debug(`Enviando username: ${username}`);
      await SSHInteractiveService.sendCommand(session, username, undefined, 2500);

      // El menú puede pedir confirmación de bloquear
      await new Promise(r => setTimeout(r, 1500));
      await SSHInteractiveService.sendCommand(session, '1', undefined, 1500); // Opción bloquear

      await new Promise(r => setTimeout(r, 1500));
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      const success = this.detectSuccess(session.output);
      await this.exitMenu(session);

      logger.info(`✅ Usuario ${username} ${success ? 'BLOQUEADO' : 'procesado'}`);
      return { success, output: session.output };

    } catch (error: any) {
      logger.error(`Error bloqueando usuario: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  static async unblockSSHUser(
    sshConfig: SSHConfig,
    username: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info(`[ADMRufu] Desbloquear usuario: ${username}`);

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 4 = Bloquear / Desbloquear (del submenú)
      logger.debug('Seleccionando opción 4 (Bloquear/Desbloquear)');
      await this.selectOption(session, '4', 2000);

      await new Promise(r => setTimeout(r, 1500));
      logger.debug(`Enviando username: ${username}`);
      await SSHInteractiveService.sendCommand(session, username, undefined, 2500);

      // El menú puede pedir confirmación de desbloquear
      await new Promise(r => setTimeout(r, 1500));
      await SSHInteractiveService.sendCommand(session, '2', undefined, 1500); // Opción desbloquear

      await new Promise(r => setTimeout(r, 1500));
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      const success = this.detectSuccess(session.output);
      await this.exitMenu(session);

      logger.info(`✅ Usuario ${username} ${success ? 'DESBLOQUEADO' : 'procesado'}`);
      return { success, output: session.output };

    } catch (error: any) {
      logger.error(`Error desbloqueando usuario: ${error.message}`);
      return {
        success: false,
        output: session?.output || '',
        error: error.message
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * LISTAR USUARIOS - Método directo sin usar menú ADMRufu
   * Lee directamente de /etc/passwd y usa chage para obtener fechas de expiración
   * Esto replica la lógica del script ADMRufu original (mostrar_usuarios + data_user)
   *
   * Soporta AMBOS modos:
   * - Usuarios SSH tradicionales (GECOS: "limit,password")
   * - Usuarios TOKEN (GECOS: "token,ClienteID")
   */
  static async listSSHUsersDirect(sshConfig: SSHConfig): Promise<ADMRufuUserData[]> {
    let session: ShellSession | null = null;

    try {
      logger.info('[SSH Direct] Listar TODOS los usuarios SSH (tradicionales + TOKEN) desde /etc/passwd');

      session = await SSHInteractiveService.openShellSession(sshConfig);

      // Comando para listar TODOS los usuarios SSH (tradicionales + TOKEN)
      // NO filtrar por hwid/token - queremos ambos tipos
      // Buscar usuarios con /bin/bash o /bin/false
      const listCmd = `cat /etc/passwd | grep 'home' | grep -E '(/bin/bash|/bin/false)' | grep -v 'syslog' | grep -v '::/' | sort`;

      logger.debug(`Ejecutando: ${listCmd}`);
      await SSHInteractiveService.sendCommand(session, listCmd, undefined, 3000);

      const passwdOutput = session.output;

      // DEBUG: Mostrar output completo
      logger.debug(`===== OUTPUT DE /etc/passwd (${passwdOutput.length} chars) =====`);
      logger.debug(passwdOutput.substring(0, 1000)); // Primeros 1000 caracteres
      logger.debug('===== FIN OUTPUT =====');

      const users: ADMRufuUserData[] = [];

      // Parsear cada línea de /etc/passwd
      const lines = passwdOutput.split('\n');

      for (const line of lines) {
        // Formato /etc/passwd: username:x:uid:gid:gecos:home:shell
        const parts = line.split(':');

        // DEBUG: Mostrar línea siendo procesada
        if (parts.length >= 7 && parts[5]?.includes('home')) {
          logger.debug(`Procesando línea: ${line}`);
        }

        // Validar que sea una línea válida de passwd
        if (parts.length < 7) continue;
        if (!parts[5]?.includes('home')) continue; // Debe tener home
        const shell = parts[6]?.trim();
        if (shell !== '/bin/false' && shell !== '/bin/bash') continue; // Debe tener shell /bin/false o /bin/bash

        const username = parts[0];
        const gecos = parts[4] || ''; // Campo GECOS puede ser "limit,password" o "token,ClienteID" o "hwid,ClienteID"

        // Parsear GECOS: puede ser "limit,password" (SSH) o "token,ClienteID" o "hwid,ClienteID"
        const gecosParts = gecos.split(',');
        const firstPart = gecosParts[0] || '1';
        const secondPart = gecosParts[1] || '***';

        let connectionLimit: number;
        let password: string;

        // Detectar tipo de usuario basado en GECOS
        if (firstPart === 'token') {
          // Usuario TOKEN: GECOS = "token,ClienteID"
          connectionLimit = 1; // Los usuarios TOKEN no tienen límite numérico
          password = secondPart; // El ClienteID se guarda como password
          logger.debug(`Usuario TOKEN detectado: ${username} -> Cliente: ${secondPart}`);
        } else if (firstPart === 'hwid') {
          // Usuario HWID: GECOS = "hwid,ClienteID"
          connectionLimit = 1;
          password = secondPart;
          logger.debug(`Usuario HWID detectado: ${username} -> Cliente: ${secondPart}`);
        } else {
          // Usuario SSH tradicional: GECOS = "limit,password"
          connectionLimit = parseInt(firstPart || '1', 10);
          password = secondPart;
          logger.debug(`Usuario SSH tradicional detectado: ${username} -> Limit: ${connectionLimit}`);
        }

        // Obtener fecha de expiración con chage
        logger.debug(`Obteniendo fecha de expiración para ${username}`);
        session.output = ''; // Limpiar output
        await SSHInteractiveService.sendCommand(
          session,
          `chage -l ${username} | sed -n '4p' | awk -F ': ' '{print $2}'`,
          undefined,
          2000
        );

        const chageOutput = session.output.trim();
        let expirationDate = '';
        let daysRemaining = 0;

        // Parsear fecha de chage (ejemplo: "Dec 26, 2025")
        if (chageOutput && !chageOutput.includes('never') && !chageOutput.includes('nunca')) {
          try {
            const expDate = new Date(chageOutput);
            if (!isNaN(expDate.getTime())) {
              expirationDate = expDate.toISOString().split('T')[0];
              const now = new Date();
              daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            }
          } catch (e) {
            logger.warn(`No se pudo parsear fecha de expiración para ${username}: ${chageOutput}`);
          }
        }

        // Verificar si está bloqueado con passwd --status
        session.output = ''; // Limpiar output
        await SSHInteractiveService.sendCommand(
          session,
          `passwd --status ${username} | cut -d ' ' -f2`,
          undefined,
          1500
        );

        const statusOutput = session.output.trim();
        const isBlocked = statusOutput.includes('L'); // L = Locked, P = Password (unlocked)
        const isActive = !isBlocked && daysRemaining > 0;

        logger.debug(`Usuario ${username}: exp=${expirationDate}, days=${daysRemaining}, blocked=${isBlocked}`);

        users.push({
          username,
          password, // Del campo GECOS
          expirationDate,
          daysRemaining,
          connectionLimit, // Del campo GECOS
          isActive,
          isBlocked
        });
      }

      logger.info(`✅ Listados ${users.length} usuarios SSH desde /etc/passwd`);
      return users;

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
   * LISTAR USUARIOS - Opción 6 del menú (LEGACY - usa menú ADMRufu)
   * DEPRECADO: Usar listSSHUsersDirect() en su lugar
   */
  static async listSSHUsers(sshConfig: SSHConfig): Promise<ADMRufuUserData[]> {
    // Redirigir al método directo que es más confiable
    return this.listSSHUsersDirect(sshConfig);
  }

  /**
   * MONITOR CONEXIONES - Opción 7 del menú
   */
  static async getConnectedUsers(sshConfig: SSHConfig): Promise<ADMRufuConnectionData[]> {
    let session: ShellSession | null = null;

    try {
      logger.info('[ADMRufu] Monitor de conexiones');

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 7 = Monitor conexiones (del submenú)
      logger.debug('Seleccionando opción 7 (Monitor conexiones)');
      await this.selectOption(session, '7', 2000);

      await new Promise(r => setTimeout(r, 4000));

      const output = session.output;
      const connections: ADMRufuConnectionData[] = [];

      // Parser para conexiones activas
      const lines = output.split('\n');
      for (const line of lines) {
        // Formato: "usuario1 | 192.168.1.50 | SSH"
        const match = line.match(/(\w+)\s*\|\s*([\d.]+)\s*\|/);
        if (match) {
          const [, username, ip] = match;
          connections.push({
            username,
            ipAddress: ip,
            connectedAt: new Date().toISOString(),
            protocol: 'SSH'
          });
        }
      }

      await this.exitMenu(session);
      logger.info(`✅ ${connections.length} conexiones activas`);
      return connections;

    } catch (error: any) {
      logger.error(`Error obteniendo conexiones: ${error.message}`);
      return [];
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }

  /**
   * ELIMINAR VENCIDOS - Opción 9 del menú
   */
  static async deleteExpiredUsers(sshConfig: SSHConfig): Promise<{ success: boolean; output: string }> {
    let session: ShellSession | null = null;

    try {
      logger.info('[ADMRufu] Eliminar usuarios vencidos');

      session = await SSHInteractiveService.openShellSession(sshConfig);
      await this.startMenu(session);
      await this.openAccountsMenu(session);

      // Opción 9 = Eliminar vencidos (del submenú)
      logger.debug('Seleccionando opción 9 (Eliminar vencidos)');
      await this.selectOption(session, '9', 2000);

      await new Promise(r => setTimeout(r, 3000));
      await SSHInteractiveService.sendCommand(session, '', undefined, 1000);

      const success = this.detectSuccess(session.output);
      await this.exitMenu(session);

      logger.info(`✅ Usuarios vencidos ${success ? 'ELIMINADOS' : 'procesados'}`);
      return { success, output: session.output };

    } catch (error: any) {
      logger.error(`Error eliminando vencidos: ${error.message}`);
      return {
        success: false,
        output: session?.output || ''
      };
    } finally {
      if (session) {
        SSHInteractiveService.closeSession(session);
      }
    }
  }
}
