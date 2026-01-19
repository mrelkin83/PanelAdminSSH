import api from './api';
import { LoginCredentials, ApiResponse, Admin } from '@/types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ token: string; admin: Admin }> {
    const { data } = await api.post<ApiResponse<{ token: string; admin: Admin }>>(
      '/auth/login',
      credentials
    );
    return data.data!;
  },

  async getProfile(): Promise<Admin> {
    const { data } = await api.get<ApiResponse<Admin>>('/auth/profile');
    return data.data!;
  },

  async register(userData: { email: string; password: string; name: string }): Promise<Admin> {
    const { data } = await api.post<ApiResponse<{ admin: Admin }>>('/auth/register', userData);
    return data.data!.admin;
  },
};
