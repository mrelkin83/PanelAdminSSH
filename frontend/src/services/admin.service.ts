/**
 * Admin Service - Servicios para funciones administrativas
 * Solo accesible para superadmin
 */

import { adminClient } from './api';
import type { VPS, ApiResponse } from '../types';

export interface CreateVPSPayload {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  location?: string;
  provider?: string;
}

export const adminService = {
  // ==================== VPS Management ====================

  /**
   * Agregar nuevo VPS
   * POST /api/admin/vps
   */
  async createVPS(payload: CreateVPSPayload): Promise<VPS> {
    const { data } = await adminClient.post<ApiResponse<VPS>>('/vps', payload);
    if (!data.data) throw new Error('Error al crear VPS');
    return data.data;
  },

  /**
   * Actualizar VPS
   * PUT /api/admin/vps/:id
   */
  async updateVPS(id: string, payload: Partial<CreateVPSPayload>): Promise<VPS> {
    const { data } = await adminClient.put<ApiResponse<VPS>>(`/vps/${id}`, payload);
    if (!data.data) throw new Error('Error al actualizar VPS');
    return data.data;
  },

  /**
   * Eliminar VPS
   * DELETE /api/admin/vps/:id
   */
  async deleteVPS(id: string): Promise<void> {
    await adminClient.delete(`/vps/${id}`);
  },
};
