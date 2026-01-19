/**
 * VPS Service - Servicios para gestión de VPS
 */

import { apiClient } from './api';
import type { VPS, ApiResponse } from '../types';

export const vpsService = {
  /**
   * Listar todos los VPS disponibles
   * GET /api/v1/vps
   */
  async getAllVPS(): Promise<VPS[]> {
    const { data } = await apiClient.get<ApiResponse<VPS[]>>('/vps');
    return data.data || [];
  },

  /**
   * Obtener detalles de un VPS
   * GET /api/v1/vps/:id
   */
  async getVPSById(id: string): Promise<VPS> {
    const { data } = await apiClient.get<ApiResponse<VPS>>(`/vps/${id}`);
    if (!data.data) throw new Error('VPS no encontrado');
    return data.data;
  },

  /**
   * Verificar estado de un VPS
   * GET /api/v1/vps/:id/status
   */
  async checkVPSStatus(id: string): Promise<{ isOnline: boolean; stats?: any }> {
    const { data } = await apiClient.get<ApiResponse<any>>(`/vps/${id}/status`);
    return data.data || { isOnline: false };
  },

  /**
   * Sincronizar usuarios desde el VPS
   * POST /api/v1/vps/:id/sync-users
   * Importa todos los usuarios SSH existentes en el VPS a la base de datos
   */
  async syncUsers(id: string): Promise<{ imported: number; skipped: number; total: number }> {
    const { data } = await apiClient.post<ApiResponse<{ imported: number; skipped: number; total: number }>>(`/vps/${id}/sync-users`);
    if (!data.data) throw new Error('Error al sincronizar usuarios');
    return data.data;
  },

  /**
   * Obtener métricas del VPS (CPU, RAM, Disk, Uptime, Puertos)
   * GET /api/v1/vps/:id/metrics
   */
  async getVPSMetrics(id: string): Promise<any> {
    const { data } = await apiClient.get<ApiResponse<any>>(`/vps/${id}/metrics`);
    if (!data.data) throw new Error('Error al obtener métricas');
    return data.data;
  },
};
