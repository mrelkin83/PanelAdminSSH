/**
 * Monitor Service - Servicios de monitoreo
 */

import { apiClient } from './api';
import type { Connection, ApiResponse } from '../types';

export interface Stats {
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  blockedUsers: number;
  currentConnections: number;
  totalVPS: number;
}

export const monitorService = {
  /**
   * Función 7: MONITOR DE USUARIOS CONECTADOS
   * GET /api/v1/monitor/connections
   */
  async getConnections(): Promise<Connection[]> {
    const { data } = await apiClient.get<ApiResponse<Connection[]>>('/monitor/connections');
    return data.data || [];
  },

  /**
   * Obtener estadísticas del dashboard
   * GET /api/v1/monitor/stats
   */
  async getStats(): Promise<Stats> {
    const { data } = await apiClient.get<ApiResponse<Stats>>('/monitor/stats');
    return data.data || {
      totalUsers: 0,
      activeUsers: 0,
      expiredUsers: 0,
      blockedUsers: 0,
      currentConnections: 0,
      totalVPS: 0,
    };
  },

  /**
   * Limpiar logs de un VPS
   * POST /api/v1/monitor/maintenance/clean-vps-logs
   */
  async cleanVPSLogs(vpsId: string): Promise<ApiResponse> {
    const { data } = await apiClient.post<ApiResponse>('/monitor/maintenance/clean-vps-logs', { vpsId });
    return data;
  },

  /**
   * Reiniciar un VPS
   * POST /api/v1/monitor/maintenance/restart-vps
   */
  async restartVPS(vpsId: string): Promise<ApiResponse> {
    const { data } = await apiClient.post<ApiResponse>('/monitor/maintenance/restart-vps', { vpsId });
    return data;
  },

  /**
   * Limpiar logs de la API
   * POST /api/v1/monitor/maintenance/clean-api-logs
   */
  async cleanAPILogs(): Promise<ApiResponse> {
    const { data } = await apiClient.post<ApiResponse>('/monitor/maintenance/clean-api-logs');
    return data;
  },
};
