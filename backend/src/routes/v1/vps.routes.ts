/**
 * Core VPS Routes - Gestión Básica de VPS
 *
 * Solo operaciones de consulta para operadores
 */

import { Router } from 'express';
import { param } from 'express-validator';
import { VPSController } from '../../controllers/vps.controller';
import { validateRequest } from '../../middlewares/validation.middleware';

const router = Router();

/**
 * Listar todos los VPS disponibles
 * GET /api/v1/vps
 *
 * Lista simple de VPS configurados para seleccionar al crear usuario
 */
router.get('/', VPSController.list);

/**
 * Obtener detalles básicos de un VPS
 * GET /api/v1/vps/:id
 *
 * Información simple: nombre, estado, ubicación, usuarios activos
 */
router.get(
  '/:id',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.getById
);

/**
 * Verificar estado de conexión de un VPS
 * GET /api/v1/vps/:id/status
 *
 * Comprueba si el VPS está online y accesible
 */
router.get(
  '/:id/status',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.checkStatus
);

/**
 * Sincronizar usuarios desde el VPS
 * POST /api/v1/vps/:id/sync-users
 *
 * Importa todos los usuarios SSH existentes en el VPS a la base de datos
 */
router.post(
  '/:id/sync-users',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.syncUsers
);

/**
 * Obtener métricas de monitoreo del VPS
 * GET /api/v1/vps/:id/metrics
 *
 * Retorna métricas del sistema: CPU, RAM, Disco, Uptime, Puertos
 */
router.get(
  '/:id/metrics',
  validateRequest([param('id').isString().withMessage('ID válido es requerido')]),
  VPSController.getMetrics
);

export default router;
