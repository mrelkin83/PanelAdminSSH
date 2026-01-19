/**
 * Users Service - Servicios para gestión de usuarios SSH
 * Implementa las 7 funciones core del panel
 */

import { apiClient } from './api';
import type { SSHUser, ApiResponse, CreateUserPayload } from '../types';

export const usersService = {
  /**
   * Función 6: DETALLES DE TODOS LOS USUARIOS
   * GET /api/v1/users
   */
  async getAllUsers(): Promise<SSHUser[]> {
    const { data } = await apiClient.get<ApiResponse<SSHUser[]>>('/users');
    return data.data || [];
  },

  /**
   * Obtener detalles de un usuario específico
   * GET /api/v1/users/:id
   */
  async getUserById(id: string): Promise<SSHUser> {
    const { data } = await apiClient.get<ApiResponse<SSHUser>>(`/users/${id}`);
    if (!data.data) throw new Error('Usuario no encontrado');
    return data.data;
  },

  /**
   * Función 1: NUEVO USUARIO
   * POST /api/v1/users
   */
  async createUser(payload: CreateUserPayload): Promise<SSHUser> {
    const { data } = await apiClient.post<ApiResponse<SSHUser>>('/users', payload);
    if (!data.data) throw new Error('Error al crear usuario');
    return data.data;
  },

  /**
   * Función 3: RENOVAR USUARIO
   * PUT /api/v1/users/:id/renew
   */
  async renewUser(id: string, days: number, fromToday: boolean = true): Promise<SSHUser> {
    const { data } = await apiClient.put<ApiResponse<SSHUser>>(`/users/${id}/renew`, {
      days,
      fromToday,
    });
    if (!data.data) throw new Error('Error al renovar usuario');
    return data.data;
  },

  /**
   * CREAR USUARIO EN MÚLTIPLES VPS
   * POST /api/v1/users/create-multiple
   */
  async createMultiple(payload: {
    vpsIds: string[];
    username: string;
    password: string;
    days: number;
    connectionLimit?: number;
    notes?: string;
  }): Promise<any> {
    const { data } = await apiClient.post<ApiResponse<any>>('/users/create-multiple', payload);
    return data;
  },

  /**
   * Función 4: BLOQUEAR USUARIO
   * PUT /api/v1/users/:id/block
   */
  async blockUser(id: string): Promise<SSHUser> {
    const { data } = await apiClient.put<ApiResponse<SSHUser>>(`/users/${id}/block`);
    if (!data.data) throw new Error('Error al bloquear usuario');
    return data.data;
  },

  /**
   * Función 4: DESBLOQUEAR USUARIO
   * PUT /api/v1/users/:id/unblock
   */
  async unblockUser(id: string): Promise<SSHUser> {
    const { data } = await apiClient.put<ApiResponse<SSHUser>>(`/users/${id}/unblock`);
    if (!data.data) throw new Error('Error al desbloquear usuario');
    return data.data;
  },

  /**
   * Función 2: ELIMINAR USUARIO
   * DELETE /api/v1/users/:id
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
